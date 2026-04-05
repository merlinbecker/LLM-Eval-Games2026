import { parseMarkdownItems, store } from "@workspace/store";
import type {
  Competition,
  CompetitionResultEntry,
  Gateway,
  JudgeScoreEntry,
  ModelResponseEntry,
  ModelSelection,
} from "@workspace/store";
import { chatCompletion } from "../lib/llm-gateway";

const MAX_CONCURRENCY = 5;

const JUDGE_SYSTEM_PROMPT =
  `You are a judge evaluating LLM responses. Score the following response on a scale of 1-10 based on quality, accuracy, helpfulness, and relevance.\n\nRespond in JSON format: { "score": <number 1-10>, "reasoning": "<brief explanation>" }\nOnly output the JSON.`;

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

function savePartialResults(
  sessionId: string,
  competitionId: number,
  results: CompetitionResultEntry[],
): void {
  store.updateCompetition(sessionId, competitionId, { results });
}

function loadGatewayMap(
  sessionId: string,
  contestants: ModelSelection[],
  judges: ModelSelection[],
): Map<number, Gateway> {
  const allGatewayIds = [
    ...new Set([
      ...contestants.map((contestant) => contestant.gatewayId),
      ...judges.map((judge) => judge.gatewayId),
    ]),
  ];
  const gatewayMap = new Map<number, Gateway>();

  for (const gatewayId of allGatewayIds) {
    const gateway = store.getGateway(sessionId, gatewayId);
    if (gateway) {
      gatewayMap.set(gatewayId, gateway);
    }
  }

  return gatewayMap;
}

async function scoreWithJudge(
  judge: ModelSelection,
  judgeGateway: Gateway,
  systemPrompt: string,
  item: string,
  responseContent: string,
  sessionId: string,
): Promise<JudgeScoreEntry> {
  try {
    const judgeResult = await chatCompletion(
      {
        type: judgeGateway.type,
        baseUrl: judgeGateway.baseUrl,
        apiKey: judgeGateway.apiKey,
        customHeaders: judgeGateway.customHeaders,
      },
      judge.modelId,
      [
        { role: "system", content: JUDGE_SYSTEM_PROMPT },
        {
          role: "user",
          content: `System prompt: ${systemPrompt}\n\nUser prompt: ${item}\n\nLLM Response: ${responseContent}`,
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
  } catch (error) {
    return {
      judgeModelId: judge.modelId,
      judgeModelName: judge.modelName,
      score: 0,
      reasoning: `Judge error: ${(error as Error).message}`,
    };
  }
}

function buildResultEntry(
  contestant: ModelSelection,
  responses: ModelResponseEntry[],
): CompetitionResultEntry {
  const responseSnapshots = responses.map((response) => ({
    ...response,
    judgeScores: response.judgeScores.map((judgeScore) => ({ ...judgeScore })),
  }));
  let totalSpeed = 0;
  let totalCost = 0;
  let totalQuality = 0;
  let totalTokens = 0;

  for (const response of responseSnapshots) {
    totalSpeed += response.durationMs;
    totalCost += response.cost;
    totalTokens += response.promptTokens + response.completionTokens;
    if (response.judgeScores.length > 0) {
      totalQuality +=
        response.judgeScores.reduce((score, judge) => score + judge.score, 0) /
        response.judgeScores.length;
    }
  }

  const count = responses.length || 1;
  return {
    gatewayId: contestant.gatewayId,
    modelId: contestant.modelId,
    modelName: contestant.modelName,
    avgSpeed: totalSpeed / count,
    totalCost,
    avgQuality: totalQuality / count,
    totalTokens,
    responses: responseSnapshots,
  };
}

function estimateCost(
  promptTokens: number,
  completionTokens: number,
  inputCostPerMillionTokens?: number | null,
  outputCostPerMillionTokens?: number | null,
): number {
  const safePromptTokens = Number(promptTokens) || 0;
  const safeCompletionTokens = Number(completionTokens) || 0;
  const safeInputCost = Number(inputCostPerMillionTokens);
  const safeOutputCost = Number(outputCostPerMillionTokens);
  const inputCostPerToken = (!isNaN(safeInputCost) ? safeInputCost : 1.0) / 1_000_000;
  const outputCostPerToken = (!isNaN(safeOutputCost) ? safeOutputCost : 2.0) / 1_000_000;

  return safePromptTokens * inputCostPerToken + safeCompletionTokens * outputCostPerToken;
}

async function evaluateContestant(
  contestant: ModelSelection,
  gateway: Gateway,
  dataItems: string[],
  judges: ModelSelection[],
  gatewayMap: Map<number, Gateway>,
  competition: Competition,
  sessionId: string,
  activityId: number,
  results: CompetitionResultEntry[],
  competitionId: number,
): Promise<CompetitionResultEntry> {
  const responses: ModelResponseEntry[] = [];

  for (let index = 0; index < dataItems.length; index++) {
    const item = dataItems[index];
    store.updateActivity(sessionId, activityId, {
      progress: `${contestant.modelName}: item ${index + 1}/${dataItems.length}`,
    });

    try {
      const result = await chatCompletion(
        {
          type: gateway.type,
          baseUrl: gateway.baseUrl,
          apiKey: gateway.apiKey,
          customHeaders: gateway.customHeaders,
        },
        contestant.modelId,
        [
          { role: "system", content: competition.systemPrompt },
          { role: "user", content: item },
        ],
        sessionId,
      );

      const cost = estimateCost(
        result.promptTokens,
        result.completionTokens,
        contestant.inputCostPerMillionTokens,
        contestant.outputCostPerMillionTokens,
      );

      const judgeTasks = judges.map((judge) => async (): Promise<JudgeScoreEntry> => {
        const judgeGateway = gatewayMap.get(judge.gatewayId);
        if (!judgeGateway) {
          return {
            judgeModelId: judge.modelId,
            judgeModelName: judge.modelName,
            score: 0,
            reasoning: "Gateway not found",
          };
        }
        return scoreWithJudge(
          judge,
          judgeGateway,
          competition.systemPrompt,
          item,
          result.content,
          sessionId,
        );
      });

      const judgeScores = await runWithConcurrency(judgeTasks, MAX_CONCURRENCY);

      responses.push({
        dataItemIndex: index,
        response: result.content,
        durationMs: result.durationMs,
        promptTokens: result.promptTokens,
        completionTokens: result.completionTokens,
        cost,
        judgeScores,
      });
    } catch (error) {
      responses.push({
        dataItemIndex: index,
        response: `Error: ${(error as Error).message}`,
        durationMs: 0,
        promptTokens: 0,
        completionTokens: 0,
        cost: 0,
        judgeScores: [],
      });
    }

    const partialEntry = buildResultEntry(contestant, responses);
    const resultIndex = results.findIndex(
      (entry) =>
        entry.gatewayId === contestant.gatewayId &&
        entry.modelId === contestant.modelId,
    );

    if (resultIndex >= 0) {
      results[resultIndex] = partialEntry;
    } else {
      results.push(partialEntry);
    }

    savePartialResults(sessionId, competitionId, [...results]);
  }

  return buildResultEntry(contestant, responses);
}

export async function runCompetition(
  sessionId: string,
  competitionId: number,
  competition: Competition,
  dataset: { content: string },
  activityId: number,
): Promise<void> {
  const dataItems = parseMarkdownItems(dataset.content);
  const contestants = competition.contestantModels;
  const judges = competition.judgeModels;
  const gatewayMap = loadGatewayMap(sessionId, contestants, judges);
  const results: CompetitionResultEntry[] = [];

  const contestantTasks = contestants.map(
    (contestant) => async (): Promise<CompetitionResultEntry | null> => {
      const gateway = gatewayMap.get(contestant.gatewayId);
      if (!gateway) {
        return null;
      }

      return evaluateContestant(
        contestant,
        gateway,
        dataItems,
        judges,
        gatewayMap,
        competition,
        sessionId,
        activityId,
        results,
        competitionId,
      );
    },
  );

  const rawResults = await runWithConcurrency(contestantTasks, MAX_CONCURRENCY);
  const finalResults = rawResults.filter(
    (result): result is CompetitionResultEntry => result !== null,
  );

  store.updateCompetition(sessionId, competitionId, {
    status: "completed",
    results: finalResults,
  });
  store.updateActivity(sessionId, activityId, {
    status: "completed",
    progress: `${finalResults.length} models evaluated`,
    resultId: competitionId,
    completedAt: new Date().toISOString(),
  });
}