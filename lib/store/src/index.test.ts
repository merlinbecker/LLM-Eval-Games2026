import { describe, it, expect, beforeEach, afterEach } from "vitest";

// The store module exports a singleton. We need a fresh instance per test.
// Re-import to pick up the singleton:
let store: typeof import("./index")["store"];

beforeEach(async () => {
  // Dynamic import with cache bust isn't great for singletons.
  // Instead, just use the existing singleton and create fresh sessions.
  const mod = await import("./index");
  store = mod.store;
});

afterEach(() => {
  // Clean up any sessions we created
  store.deleteSession("test-session");
  store.deleteSession("other-session");
});

describe("InMemoryStore", () => {
  // --- Session management ---

  describe("Sessions", () => {
    it("hasSession returns false for unknown session", () => {
      expect(store.hasSession("unknown")).toBe(false);
    });

    it("createSession creates a session and hasSession returns true", () => {
      store.createSession("test-session");
      expect(store.hasSession("test-session")).toBe(true);
    });

    it("deleteSession removes a session", () => {
      store.createSession("test-session");
      store.deleteSession("test-session");
      expect(store.hasSession("test-session")).toBe(false);
    });

    it("getSession returns undefined for unknown session", () => {
      expect(store.getSession("unknown")).toBeUndefined();
    });

    it("sessions are isolated by sessionId", () => {
      store.createSession("test-session");
      store.createSession("other-session");
      store.createGateway("test-session", { name: "gw", type: "openai", baseUrl: "http://a", apiKey: "k" });
      expect(store.listGateways("test-session")).toHaveLength(1);
      expect(store.listGateways("other-session")).toHaveLength(0);
    });
  });

  // --- Gateways ---

  describe("Gateways", () => {
    beforeEach(() => {
      store.createSession("test-session");
    });

    it("createGateway returns gateway with auto-incremented id", () => {
      const gw = store.createGateway("test-session", { name: "TestGW", type: "openai", baseUrl: "http://api.test", apiKey: "key123" });
      expect(gw.id).toBe(1);
      expect(gw.name).toBe("TestGW");
      expect(gw.type).toBe("openai");
      expect(gw.createdAt).toBeTruthy();
    });

    it("listGateways returns all created gateways", () => {
      store.createGateway("test-session", { name: "A", type: "openai", baseUrl: "http://a", apiKey: "k" });
      store.createGateway("test-session", { name: "B", type: "copilot", baseUrl: "http://b", apiKey: "k" });
      expect(store.listGateways("test-session")).toHaveLength(2);
    });

    it("getGateway returns a specific gateway", () => {
      const gw = store.createGateway("test-session", { name: "A", type: "openai", baseUrl: "http://a", apiKey: "k" });
      expect(store.getGateway("test-session", gw.id)).toEqual(gw);
    });

    it("getGateway returns undefined for non-existent id", () => {
      expect(store.getGateway("test-session", 999)).toBeUndefined();
    });

    it("deleteGateway removes gateway and returns true", () => {
      const gw = store.createGateway("test-session", { name: "A", type: "openai", baseUrl: "http://a", apiKey: "k" });
      expect(store.deleteGateway("test-session", gw.id)).toBe(true);
      expect(store.getGateway("test-session", gw.id)).toBeUndefined();
    });

    it("deleteGateway returns false for non-existent id", () => {
      expect(store.deleteGateway("test-session", 999)).toBe(false);
    });
  });

  // --- Datasets ---

  describe("Datasets", () => {
    beforeEach(() => {
      store.createSession("test-session");
    });

    it("createDataset sets default privacyStatus to unchecked", () => {
      const ds = store.createDataset("test-session", { name: "Test", content: "# Item 1\nContent" });
      expect(ds.privacyStatus).toBe("unchecked");
      expect(ds.privacyReport).toBeNull();
    });

    it("updateDataset merges partial data", () => {
      const ds = store.createDataset("test-session", { name: "Test", content: "content" });
      const updated = store.updateDataset("test-session", ds.id, { privacyStatus: "clean" });
      expect(updated?.privacyStatus).toBe("clean");
      expect(updated?.name).toBe("Test"); // unchanged field preserved
    });

    it("updateDataset returns undefined for non-existent dataset", () => {
      expect(store.updateDataset("test-session", 999, { name: "x" })).toBeUndefined();
    });

    it("deleteDataset removes dataset", () => {
      const ds = store.createDataset("test-session", { name: "Test", content: "c" });
      expect(store.deleteDataset("test-session", ds.id)).toBe(true);
      expect(store.getDataset("test-session", ds.id)).toBeUndefined();
    });
  });

  // --- Competitions ---

  describe("Competitions", () => {
    beforeEach(() => {
      store.createSession("test-session");
    });

    const competitionData = {
      name: "Battle",
      datasetId: 1,
      systemPrompt: "Judge this",
      contestantModels: [{ gatewayId: 1, modelId: "m1", modelName: "Model 1" }],
      judgeModels: [{ gatewayId: 1, modelId: "j1", modelName: "Judge 1" }],
    };

    it("createCompetition sets status to draft", () => {
      const c = store.createCompetition("test-session", competitionData);
      expect(c.status).toBe("draft");
      expect(c.results).toBeNull();
    });

    it("updateCompetition changes status and results", () => {
      const c = store.createCompetition("test-session", competitionData);
      const updated = store.updateCompetition("test-session", c.id, { status: "running" });
      expect(updated?.status).toBe("running");
    });

    it("deleteCompetition removes competition", () => {
      const c = store.createCompetition("test-session", competitionData);
      expect(store.deleteCompetition("test-session", c.id)).toBe(true);
      expect(store.getCompetition("test-session", c.id)).toBeUndefined();
    });
  });

  // --- Activities ---

  describe("Activities", () => {
    beforeEach(() => {
      store.createSession("test-session");
    });

    it("createActivity creates activity with running status", () => {
      const a = store.createActivity("test-session", { type: "competition_run", title: "Run #1" });
      expect(a.id).toBe(1);
      expect(a.status).toBe("running");
      expect(a.type).toBe("competition_run");
      expect(a.acknowledged).toBe(false);
      expect(a.createdAt).toBeTruthy();
    });

    it("listActivities returns all activities", () => {
      store.createActivity("test-session", { type: "competition_run", title: "Run" });
      store.createActivity("test-session", { type: "dataset_generate", title: "Gen" });
      expect(store.listActivities("test-session")).toHaveLength(2);
    });

    it("listActivities returns empty array for unknown session", () => {
      expect(store.listActivities("unknown")).toEqual([]);
    });

    it("getActivity returns specific activity", () => {
      const a = store.createActivity("test-session", { type: "dataset_generate", title: "Gen" });
      expect(store.getActivity("test-session", a.id)?.title).toBe("Gen");
    });

    it("getActivity returns undefined for non-existent id", () => {
      expect(store.getActivity("test-session", 999)).toBeUndefined();
    });

    it("updateActivity merges partial data", () => {
      const a = store.createActivity("test-session", { type: "competition_run", title: "Run" });
      const updated = store.updateActivity("test-session", a.id, {
        status: "completed",
        progress: "Done",
        resultId: 42,
        completedAt: "2026-03-24T00:00:00.000Z",
      });
      expect(updated?.status).toBe("completed");
      expect(updated?.progress).toBe("Done");
      expect(updated?.resultId).toBe(42);
      expect(updated?.title).toBe("Run"); // preserved
    });

    it("updateActivity returns undefined for non-existent activity", () => {
      expect(store.updateActivity("test-session", 999, { status: "error" })).toBeUndefined();
    });

    it("acknowledgeActivity sets acknowledged to true", () => {
      const a = store.createActivity("test-session", { type: "competition_run", title: "Run" });
      const acked = store.acknowledgeActivity("test-session", a.id);
      expect(acked?.acknowledged).toBe(true);
    });

    it("acknowledgeActivity returns undefined for non-existent activity", () => {
      expect(store.acknowledgeActivity("test-session", 999)).toBeUndefined();
    });

    it("createActivity throws for non-existent session", () => {
      expect(() => store.createActivity("unknown", { type: "competition_run", title: "Fail" })).toThrow(
        "Session not found"
      );
    });
  });

  // --- Configured Models ---

  describe("Configured Models", () => {
    beforeEach(() => {
      store.createSession("test-session");
    });

    it("createConfiguredModel returns model with auto-incremented id", () => {
      const m = store.createConfiguredModel("test-session", { name: "GPT-4", gatewayId: 1, modelId: "gpt-4" });
      expect(m.id).toBe(1);
      expect(m.name).toBe("GPT-4");
    });

    it("listConfiguredModels returns all models", () => {
      store.createConfiguredModel("test-session", { name: "A", gatewayId: 1, modelId: "a" });
      store.createConfiguredModel("test-session", { name: "B", gatewayId: 2, modelId: "b" });
      expect(store.listConfiguredModels("test-session")).toHaveLength(2);
    });

    it("deleteConfiguredModel removes model", () => {
      const m = store.createConfiguredModel("test-session", { name: "A", gatewayId: 1, modelId: "a" });
      expect(store.deleteConfiguredModel("test-session", m.id)).toBe(true);
      expect(store.getConfiguredModel("test-session", m.id)).toBeUndefined();
    });
  });

  // --- LLM Logs ---

  describe("LLM Logs", () => {
    beforeEach(() => {
      store.createSession("test-session");
    });

    const logData = {
      timestamp: "2026-03-24T00:00:00.000Z",
      gatewayType: "openai",
      modelId: "gpt-4",
      requestUrl: "https://api.openai.com/v1/chat/completions",
      requestBody: { messages: [] },
      responseStatus: 200,
      responseBody: { choices: [] },
      durationMs: 500,
      error: null,
    };

    it("addLlmLog creates log with auto-incremented id", () => {
      const log = store.addLlmLog("test-session", logData);
      expect(log.id).toBe(1);
      expect(log.modelId).toBe("gpt-4");
    });

    it("listLlmLogs returns all logs", () => {
      store.addLlmLog("test-session", logData);
      store.addLlmLog("test-session", { ...logData, modelId: "claude" });
      expect(store.listLlmLogs("test-session")).toHaveLength(2);
    });

    it("listLlmLogs returns empty array for unknown session", () => {
      expect(store.listLlmLogs("unknown")).toEqual([]);
    });

    it("clearLlmLogs removes all logs", () => {
      store.addLlmLog("test-session", logData);
      store.clearLlmLogs("test-session");
      expect(store.listLlmLogs("test-session")).toEqual([]);
    });

    it("addLlmLog caps at 500 entries", () => {
      for (let i = 0; i < 510; i++) {
        store.addLlmLog("test-session", logData);
      }
      expect(store.listLlmLogs("test-session")).toHaveLength(500);
    });
  });
});
