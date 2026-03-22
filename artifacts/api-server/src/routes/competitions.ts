import { Router, type IRouter } from "express";
import { db, competitionsTable, datasetsTable, gatewaysTable } from "@workspace/db";
import type { CompetitionResultEntry, JudgeScoreEntry, ModelResponseEntry } from "@workspace/db";
import { eq, inArray } from "drizzle-orm";
import {
  CreateCompetitionBody,
  GetCompetitionParams,
  DeleteCompetitionParams,
  RunCompetitionParams,
} from "@workspace/api-zod";
import { chatCompletion } from "../lib/llm-gateway";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const MAX_CONCURRENCY = 5;

interface ModelSel {
  gatewayId: number;
  modelId: string;
  modelName: string;
}

async function runWithConcurrency<T>(
  tasks: Array<() => Promise<T>>,
  concurrency: number,
): Promise<T[]> {
  const results: T[] = [];
  let index = 0;

  async function runNext(): Promise<void> {
    while (index < tasks.length) {
      const currentIndex = index++;
      results[currentIndex] = await tasks[currentIndex]();
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, tasks.length) },
    () => runNext(),
  );
  await Promise.all(workers);
  return results;
}

function competitionToJson(c: typeof competitionsTable.$inferSelect) {
  return {
    id: c.id,
    name: c.name,
    datasetId: c.datasetId,
    systemPrompt: c.systemPrompt,
    status: c.status,
    contestantModels: c.contestantModels,
    judgeModels: c.judgeModels,
    results: c.results ?? [],
    createdAt: c.createdAt.toISOString(),
  };
}

router.get("/competitions", async (_req, res) => {
  const competitions = await db.select().from(competitionsTable);
  res.json(
    competitions.map((c) => ({
      id: c.id,
      name: c.name,
      datasetId: c.datasetId,
      status: c.status,
      createdAt: c.createdAt.toISOString(),
    })),
  );
});

router.post("/competitions", async (req, res) => {
  const data = CreateCompetitionBody.parse(req.body);
  if (data.judgeModels.length < 3 || data.judgeModels.length > 5) {
    res.status(400).json({ message: "Judge panel must have 3–5 models" });
    return;
  }
  const [competition] = await db
    .insert(competitionsTable)
    .values({
      name: data.name,
      datasetId: data.datasetId,
      systemPrompt: data.systemPrompt,
      contestantModels: data.contestantModels,
      judgeModels: data.judgeModels,
    })
    .returning();
  res.status(201).json(competitionToJson(competition));
});

router.get("/competitions/:id", async (req, res) => {
  const { id } = GetCompetitionParams.parse(req.params);
  const [competition] = await db
    .select()
    .from(competitionsTable)
    .where(eq(competitionsTable.id, id));
  if (!competition) {
    res.status(404).json({ error: "Competition not found" });
    return;
  }
  res.json(competitionToJson(competition));
});

router.delete("/competitions/:id", async (req, res) => {
  const { id } = DeleteCompetitionParams.parse(req.params);
  await db.delete(competitionsTable).where(eq(competitionsTable.id, id));
  res.json({ message: "Competition deleted" });
});

router.post("/competitions/:id/run", async (req, res) => {
  const { id } = RunCompetitionParams.parse(req.params);

  const [competition] = await db
    .select()
    .from(competitionsTable)
    .where(eq(competitionsTable.id, id));
  if (!competition) {
    res.status(404).json({ error: "Competition not found" });
    return;
  }

  const [dataset] = await db
    .select()
    .from(datasetsTable)
    .where(eq(datasetsTable.id, competition.datasetId));
  if (!dataset) {
    res.status(404).json({ error: "Dataset not found" });
    return;
  }

  const [running] = await db
    .update(competitionsTable)
    .set({ status: "running", results: [] })
    .where(eq(competitionsTable.id, id))
    .returning();

  res.json(competitionToJson(running));

  runCompetitionAsync(id, competition, dataset).catch((err) => {
    logger.error({ err, competitionId: id }, "Competition run failed");
    db.update(competitionsTable)
      .set({ status: "error" })
      .where(eq(competitionsTable.id, id))
      .then(() => {});
  });
});

async function savePartialResults(id: number, results: CompetitionResultEntry[]): Promise<void> {
  await db
    .update(competitionsTable)
    .set({ results })
    .where(eq(competitionsTable.id, id));
}

async function runCompetitionAsync(
  id: number,
  competition: typeof competitionsTable.$inferSelect,
  dataset: typeof datasetsTable.$inferSelect,
): Promise<void> {
  const dataItems = parseMarkdownItems(dataset.content);
  const contestants: ModelSel[] = competition.contestantModels;
  const judges: ModelSel[] = competition.judgeModels;

  const allGatewayIds = [
    ...new Set([
      ...contestants.map((c) => c.gatewayId),
      ...judges.map((j) => j.gatewayId),
    ]),
  ];

  const gatewayRows = await db
    .select()
    .from(gatewaysTable)
    .where(inArray(gatewaysTable.id, allGatewayIds));
  const gatewayMap = new Map(gatewayRows.map((g) => [g.id, g]));

  const results: CompetitionResultEntry[] = [];

  const contestantTasks = contestants.map((contestant) => async (): Promise<CompetitionResultEntry | null> => {
    const gw = gatewayMap.get(contestant.gatewayId);
    if (!gw) return null;

    const responses: ModelResponseEntry[] = [];

    for (let i = 0; i < dataItems.length; i++) {
      const item = dataItems[i];
      try {
        const result = await chatCompletion(
          { type: gw.type, baseUrl: gw.baseUrl, apiKey: gw.apiKey },
          contestant.modelId,
          [
            { role: "system", content: competition.systemPrompt },
            { role: "user", content: item },
          ],
        );

        const cost = estimateCost(result.promptTokens, result.completionTokens);

        const judgeTasks = judges.map((judge) => async (): Promise<JudgeScoreEntry> => {
          const judgeGw = gatewayMap.get(judge.gatewayId);
          if (!judgeGw) {
            return { judgeModelId: judge.modelId, judgeModelName: judge.modelName, score: 0, reasoning: "Gateway not found" };
          }

          try {
            const judgeResult = await chatCompletion(
              { type: judgeGw.type, baseUrl: judgeGw.baseUrl, apiKey: judgeGw.apiKey },
              judge.modelId,
              [
                {
                  role: "system",
                  content: `You are a judge evaluating LLM responses. Score the following response on a scale of 1-10 based on quality, accuracy, helpfulness, and relevance.\n\nRespond in JSON format: { "score": <number 1-10>, "reasoning": "<brief explanation>" }\nOnly output the JSON.`,
                },
                {
                  role: "user",
                  content: `System prompt: ${competition.systemPrompt}\n\nUser prompt: ${item}\n\nLLM Response: ${result.content}`,
                },
              ],
            );

            let parsed: { score: number; reasoning: string };
            try {
              parsed = JSON.parse(judgeResult.content);
            } catch {
              parsed = { score: 5, reasoning: judgeResult.content };
            }

            return {
              judgeModelId: judge.modelId,
              judgeModelName: judge.modelName,
              score: Math.min(10, Math.max(1, Number(parsed.score) || 5)),
              reasoning: parsed.reasoning ?? "",
            };
          } catch (err) {
            return {
              judgeModelId: judge.modelId,
              judgeModelName: judge.modelName,
              score: 0,
              reasoning: `Judge error: ${(err as Error).message}`,
            };
          }
        });

        const judgeScores = await runWithConcurrency(judgeTasks, MAX_CONCURRENCY);

        responses.push({
          dataItemIndex: i,
          response: result.content,
          durationMs: result.durationMs,
          promptTokens: result.promptTokens,
          completionTokens: result.completionTokens,
          cost,
          judgeScores,
        });
      } catch (err) {
        responses.push({
          dataItemIndex: i,
          response: `Error: ${(err as Error).message}`,
          durationMs: 0,
          promptTokens: 0,
          completionTokens: 0,
          cost: 0,
          judgeScores: [],
        });
      }

      const partialEntry = buildResultEntry(contestant, responses);
      const idx = results.findIndex((r) => r.gatewayId === contestant.gatewayId && r.modelId === contestant.modelId);
      if (idx >= 0) {
        results[idx] = partialEntry;
      } else {
        results.push(partialEntry);
      }
      await savePartialResults(id, [...results]);
    }

    return buildResultEntry(contestant, responses);
  });

  const rawResults = await runWithConcurrency(contestantTasks, MAX_CONCURRENCY);
  const finalResults: CompetitionResultEntry[] = rawResults.filter((r): r is CompetitionResultEntry => r !== null);

  await db
    .update(competitionsTable)
    .set({ status: "completed", results: finalResults })
    .where(eq(competitionsTable.id, id));
}

function buildResultEntry(contestant: ModelSel, responses: ModelResponseEntry[]): CompetitionResultEntry {
  let totalSpeed = 0;
  let totalCost = 0;
  let totalQuality = 0;
  let totalTokens = 0;

  for (const r of responses) {
    totalSpeed += r.durationMs;
    totalCost += r.cost;
    totalTokens += r.promptTokens + r.completionTokens;
    if (r.judgeScores.length > 0) {
      totalQuality += r.judgeScores.reduce((s, j) => s + j.score, 0) / r.judgeScores.length;
    }
  }

  const count = responses.length || 1;
  return {
    gatewayId: contestant.gatewayId,
    modelId: contestant.modelId,
    modelName: contestant.modelName,
    avgSpeed: totalSpeed / count,
    avgCost: totalCost / count,
    avgQuality: totalQuality / count,
    totalTokens,
    responses,
  };
}

function parseMarkdownItems(content: string): string[] {
  const sections = content.split(/^## /m).filter(Boolean);
  if (sections.length > 1) {
    return sections.map((s) => s.trim());
  }
  const paragraphs = content
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
  return paragraphs.length > 0 ? paragraphs : [content];
}

function estimateCost(promptTokens: number, completionTokens: number): number {
  const inputCostPer1k = 0.001;
  const outputCostPer1k = 0.002;
  return (promptTokens / 1000) * inputCostPer1k + (completionTokens / 1000) * outputCostPer1k;
}

export default router;
