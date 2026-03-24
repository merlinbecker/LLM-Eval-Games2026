import { Router, type IRouter } from "express";
import { store } from "@workspace/store";
import type { Competition, Gateway, CompetitionResultEntry, JudgeScoreEntry, ModelResponseEntry } from "@workspace/store";
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

function competitionToJson(c: Competition) {
  return {
    id: c.id,
    name: c.name,
    datasetId: c.datasetId,
    systemPrompt: c.systemPrompt,
    status: c.status,
    contestantModels: c.contestantModels,
    judgeModels: c.judgeModels,
    results: c.results ?? [],
    createdAt: c.createdAt,
  };
}

router.get("/competitions", (req, res) => {
  const competitions = store.listCompetitions(req.sessionId!);
  res.json(
    competitions.map((c) => ({
      id: c.id,
      name: c.name,
      datasetId: c.datasetId,
      status: c.status,
      createdAt: c.createdAt,
    })),
  );
});

router.post("/competitions", (req, res) => {
  const data = CreateCompetitionBody.parse(req.body);
  if (data.judgeModels.length < 3 || data.judgeModels.length > 5) {
    res.status(400).json({ message: "Judge panel must have 3–5 models" });
    return;
  }
  const competition = store.createCompetition(req.sessionId!, {
    name: data.name,
    datasetId: data.datasetId,
    systemPrompt: data.systemPrompt,
    contestantModels: data.contestantModels,
    judgeModels: data.judgeModels,
  });
  res.status(201).json(competitionToJson(competition));
});

router.get("/competitions/:id", (req, res) => {
  const { id } = GetCompetitionParams.parse(req.params);
  const competition = store.getCompetition(req.sessionId!, id);
  if (!competition) {
    res.status(404).json({ error: "Competition not found" });
    return;
  }
  res.json(competitionToJson(competition));
});

router.delete("/competitions/:id", (req, res) => {
  const { id } = DeleteCompetitionParams.parse(req.params);
  store.deleteCompetition(req.sessionId!, id);
  res.json({ message: "Competition deleted" });
});

router.post("/competitions/:id/run", (req, res) => {
  const { id } = RunCompetitionParams.parse(req.params);
  const sessionId = req.sessionId!;

  const competition = store.getCompetition(sessionId, id);
  if (!competition) {
    res.status(404).json({ error: "Competition not found" });
    return;
  }
  if (competition.status === "running") {
    res.status(409).json({ error: "Competition is already running" });
    return;
  }

  const dataset = store.getDataset(sessionId, competition.datasetId);
  if (!dataset) {
    res.status(404).json({ error: "Dataset not found" });
    return;
  }

  const activity = store.createActivity(sessionId, {
    type: "competition_run",
    title: `Run: ${competition.name}`,
  });

  const running = store.updateCompetition(sessionId, id, { status: "running", results: [] });
  res.json({ ...competitionToJson(running!), activityId: activity.id });

  runCompetitionAsync(sessionId, id, competition, dataset, activity.id).catch((err) => {
    logger.error({ err, competitionId: id }, "Competition run failed");
    store.updateCompetition(sessionId, id, { status: "error" });
    store.updateActivity(sessionId, activity.id, {
      status: "error",
      error: (err as Error).message,
      completedAt: new Date().toISOString(),
    });
  });
});

function savePartialResults(sessionId: string, id: number, results: CompetitionResultEntry[]): void {
  store.updateCompetition(sessionId, id, { results });
}

async function runCompetitionAsync(
  sessionId: string,
  id: number,
  competition: Competition,
  dataset: { content: string },
  activityId: number,
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

  const gatewayMap = new Map<number, Gateway>();
  for (const gwId of allGatewayIds) {
    const gw = store.getGateway(sessionId, gwId);
    if (gw) gatewayMap.set(gwId, gw);
  }

  const results: CompetitionResultEntry[] = [];

  const contestantTasks = contestants.map((contestant) => async (): Promise<CompetitionResultEntry | null> => {
    const gw = gatewayMap.get(contestant.gatewayId);
    if (!gw) return null;

    const responses: ModelResponseEntry[] = [];

    for (let i = 0; i < dataItems.length; i++) {
      const item = dataItems[i];
      store.updateActivity(sessionId, activityId, {
        progress: `${contestant.modelName}: item ${i + 1}/${dataItems.length}`,
      });
      try {
        const result = await chatCompletion(
          { type: gw.type, baseUrl: gw.baseUrl, apiKey: gw.apiKey },
          contestant.modelId,
          [
            { role: "system", content: competition.systemPrompt },
            { role: "user", content: item },
          ],
          sessionId,
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
              sessionId,
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
      savePartialResults(sessionId, id, [...results]);
    }

    return buildResultEntry(contestant, responses);
  });

  const rawResults = await runWithConcurrency(contestantTasks, MAX_CONCURRENCY);
  const finalResults: CompetitionResultEntry[] = rawResults.filter((r): r is CompetitionResultEntry => r !== null);

  store.updateCompetition(sessionId, id, { status: "completed", results: finalResults });
  store.updateActivity(sessionId, activityId, {
    status: "completed",
    progress: `${finalResults.length} models evaluated`,
    resultId: id,
    completedAt: new Date().toISOString(),
  });
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
