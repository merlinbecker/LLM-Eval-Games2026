import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { store, type Competition, type Dataset } from "@workspace/store";

vi.mock("../lib/llm-gateway", () => ({
  chatCompletion: vi.fn(),
  toGatewayConfig: (g: { type: string; baseUrl: string; apiKey: string; customHeaders?: Record<string, string> }) => ({
    type: g.type,
    baseUrl: g.baseUrl,
    apiKey: g.apiKey,
    customHeaders: g.customHeaders,
  }),
}));

import { chatCompletion } from "../lib/llm-gateway";
import { runCompetition } from "./competition-runner";

const chatCompletionMock = vi.mocked(chatCompletion);

function createSessionId(): string {
  return `session-${Math.random().toString(36).slice(2)}`;
}

function createGateway(sessionId: string, name: string) {
  return store.createGateway(sessionId, {
    name,
    type: "openai",
    baseUrl: "https://example.com/v1",
    apiKey: "secret",
  });
}

function createDataset(sessionId: string, content: string): Dataset {
  return store.createDataset(sessionId, {
    name: "Dataset",
    content,
  });
}

function createCompetition(
  sessionId: string,
  datasetId: number,
  overrides?: Partial<Competition>,
): Competition {
  const competition = store.createCompetition(sessionId, {
    name: "Arena",
    datasetId,
    systemPrompt: "Be helpful",
    contestantModels: [
      {
        gatewayId: 1,
        modelId: "contestant-1",
        modelName: "models/contestant-1",
        inputCostPerMillionTokens: 1,
        outputCostPerMillionTokens: 2,
      },
    ],
    judgeModels: [
      {
        gatewayId: 2,
        modelId: "judge-1",
        modelName: "judges/judge-1",
      },
    ],
  });

  if (!overrides) {
    return competition;
  }

  return store.updateCompetition(sessionId, competition.id, overrides) ?? competition;
}

describe("runCompetition", () => {
  let sessionId: string;

  beforeEach(() => {
    sessionId = createSessionId();
    store.createSession(sessionId);
    chatCompletionMock.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    store.deleteSession(sessionId);
  });

  it("skips contestants whose gateway is missing and still completes the activity", async () => {
    const contestantGateway = createGateway(sessionId, "Contestant Gateway");
    const judgeGateway = createGateway(sessionId, "Judge Gateway");
    const dataset = createDataset(sessionId, "## Item 1\nPrompt 1");
    const competition = createCompetition(sessionId, dataset.id, {
      contestantModels: [
        {
          gatewayId: contestantGateway.id,
          modelId: "contestant-1",
          modelName: "models/contestant-1",
          inputCostPerMillionTokens: 1,
          outputCostPerMillionTokens: 2,
        },
        {
          gatewayId: 999,
          modelId: "contestant-2",
          modelName: "models/contestant-2",
        },
      ],
      judgeModels: [
        {
          gatewayId: judgeGateway.id,
          modelId: "judge-1",
          modelName: "judges/judge-1",
        },
      ],
    });
    const activity = store.createActivity(sessionId, {
      type: "competition_run",
      title: "Run: Arena",
    });

    chatCompletionMock
      .mockResolvedValueOnce({
        content: "contestant answer",
        durationMs: 120,
        promptTokens: 100,
        completionTokens: 40,
      })
      .mockResolvedValueOnce({
        content: JSON.stringify({ score: 8, reasoning: "solid" }),
        durationMs: 80,
        promptTokens: 50,
        completionTokens: 10,
      });

    await runCompetition(sessionId, competition.id, competition, dataset, activity.id);

    const storedCompetition = store.getCompetition(sessionId, competition.id);
    const storedActivity = store.getActivity(sessionId, activity.id);

    expect(storedCompetition?.status).toBe("completed");
    expect(storedCompetition?.results).toHaveLength(1);
    expect(storedCompetition?.results?.[0].modelId).toBe("contestant-1");
    expect(storedActivity?.status).toBe("completed");
    expect(storedActivity?.progress).toBe("1 models evaluated");
    expect(storedActivity?.resultId).toBe(competition.id);
    expect(chatCompletionMock).toHaveBeenCalledTimes(2);
  });

  it("records judge failures as zero-score entries instead of aborting the run", async () => {
    const contestantGateway = createGateway(sessionId, "Contestant Gateway");
    const judgeGateway = createGateway(sessionId, "Judge Gateway");
    const dataset = createDataset(sessionId, "## Item 1\nPrompt 1");
    const competition = createCompetition(sessionId, dataset.id, {
      contestantModels: [
        {
          gatewayId: contestantGateway.id,
          modelId: "contestant-1",
          modelName: "models/contestant-1",
        },
      ],
      judgeModels: [
        {
          gatewayId: judgeGateway.id,
          modelId: "judge-1",
          modelName: "judges/judge-1",
        },
      ],
    });
    const activity = store.createActivity(sessionId, {
      type: "competition_run",
      title: "Run: Arena",
    });

    chatCompletionMock
      .mockResolvedValueOnce({
        content: "contestant answer",
        durationMs: 200,
        promptTokens: 20,
        completionTokens: 10,
      })
      .mockRejectedValueOnce(new Error("judge offline"));

    await runCompetition(sessionId, competition.id, competition, dataset, activity.id);

    const storedCompetition = store.getCompetition(sessionId, competition.id);
    const judgeScore = storedCompetition?.results?.[0].responses[0].judgeScores[0];

    expect(storedCompetition?.status).toBe("completed");
    expect(judgeScore?.score).toBe(0);
    expect(judgeScore?.reasoning).toContain("judge offline");
  });

  it("persists partial results and activity progress across multi-item runs", async () => {
    const contestantGateway = createGateway(sessionId, "Contestant Gateway");
    const judgeGateway = createGateway(sessionId, "Judge Gateway");
    const dataset = createDataset(sessionId, "## Item 1\nPrompt 1\n\n## Item 2\nPrompt 2");
    const competition = createCompetition(sessionId, dataset.id, {
      contestantModels: [
        {
          gatewayId: contestantGateway.id,
          modelId: "contestant-1",
          modelName: "models/contestant-1",
          inputCostPerMillionTokens: 3,
          outputCostPerMillionTokens: 6,
        },
      ],
      judgeModels: [
        {
          gatewayId: judgeGateway.id,
          modelId: "judge-1",
          modelName: "judges/judge-1",
        },
      ],
    });
    const activity = store.createActivity(sessionId, {
      type: "competition_run",
      title: "Run: Arena",
    });
    const updateCompetitionSpy = vi.spyOn(store, "updateCompetition");
    const updateActivitySpy = vi.spyOn(store, "updateActivity");

    chatCompletionMock
      .mockResolvedValueOnce({
        content: "answer one",
        durationMs: 100,
        promptTokens: 10,
        completionTokens: 20,
      })
      .mockResolvedValueOnce({
        content: JSON.stringify({ score: 7, reasoning: "good" }),
        durationMs: 50,
        promptTokens: 5,
        completionTokens: 5,
      })
      .mockResolvedValueOnce({
        content: "answer two",
        durationMs: 150,
        promptTokens: 11,
        completionTokens: 21,
      })
      .mockResolvedValueOnce({
        content: JSON.stringify({ score: 9, reasoning: "great" }),
        durationMs: 50,
        promptTokens: 5,
        completionTokens: 5,
      });

    await runCompetition(sessionId, competition.id, competition, dataset, activity.id);

    const partialCalls = updateCompetitionSpy.mock.calls.filter(([, id, data]) => {
      return id === competition.id && Array.isArray(data.results);
    });
    const progressCalls = updateActivitySpy.mock.calls
      .filter(([, id, data]) => id === activity.id && typeof data.progress === "string")
      .map(([, , data]) => data.progress);
    const storedCompetition = store.getCompetition(sessionId, competition.id);
    const storedActivity = store.getActivity(sessionId, activity.id);

    expect(partialCalls.some(([, , data]) => data.results?.[0]?.responses.length === 1)).toBe(true);
    expect(partialCalls.some(([, , data]) => data.results?.[0]?.responses.length === 2)).toBe(true);
    expect(progressCalls).toContain("models/contestant-1: item 1/2");
    expect(progressCalls).toContain("models/contestant-1: item 2/2");
    expect(storedCompetition?.results?.[0].responses).toHaveLength(2);
    expect(storedCompetition?.results?.[0].totalCost).toBeGreaterThan(0);
    expect(storedActivity?.status).toBe("completed");
  });
});