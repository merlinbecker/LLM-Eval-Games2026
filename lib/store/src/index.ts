import type {
  Gateway,
  CreateGateway,
  Dataset,
  CreateDataset,
  Competition,
  CreateCompetition,
  CompetitionResultEntry,
  LlmLog,
  ConfiguredModel,
  CreateConfiguredModel,
  Activity,
  CreateActivity,
} from "./types";

declare function setInterval(callback: () => void, ms: number): unknown;
declare function clearInterval(handle: unknown): void;

interface SessionStore {
  gateways: Map<number, Gateway>;
  datasets: Map<number, Dataset>;
  competitions: Map<number, Competition>;
  configuredModels: Map<number, ConfiguredModel>;
  activities: Map<number, Activity>;
  llmLogs: LlmLog[];
  counters: { gateways: number; datasets: number; competitions: number; llmLogs: number; configuredModels: number; activities: number };
  lastAccess: number;
}

const SESSION_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

class InMemoryStore {
  private sessions = new Map<string, SessionStore>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private cleanupTimer: any = null;

  constructor() {
    this.startCleanup();
  }

  private startCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      const now = Date.now();
      for (const [id, session] of this.sessions) {
        if (now - session.lastAccess > SESSION_TTL_MS) {
          this.sessions.delete(id);
        }
      }
    }, CLEANUP_INTERVAL_MS);
    // Don't prevent Node from exiting
    if (this.cleanupTimer.unref) {
      this.cleanupTimer.unref();
    }
  }

  stopCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  // --- Session management ---

  hasSession(sessionId: string): boolean {
    return this.sessions.has(sessionId);
  }

  getSession(sessionId: string): SessionStore | undefined {
    const session = this.sessions.get(sessionId);
    if (session) session.lastAccess = Date.now();
    return session;
  }

  private requireSession(sessionId: string): SessionStore {
    const session = this.getSession(sessionId);
    if (!session) throw new Error("Session not found");
    return session;
  }

  createSession(sessionId: string): SessionStore {
    const session: SessionStore = {
      gateways: new Map(),
      datasets: new Map(),
      competitions: new Map(),
      configuredModels: new Map(),
      activities: new Map(),
      llmLogs: [],
      counters: { gateways: 1, datasets: 1, competitions: 1, llmLogs: 1, configuredModels: 1, activities: 1 },
      lastAccess: Date.now(),
    };
    this.sessions.set(sessionId, session);
    return session;
  }

  touchSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) session.lastAccess = Date.now();
  }

  deleteSession(sessionId: string): void {
    this.sessions.delete(sessionId);
  }

  // --- Gateways ---

  listGateways(sessionId: string): Gateway[] {
    return Array.from(this.getSession(sessionId)?.gateways.values() ?? []);
  }

  getGateway(sessionId: string, id: number): Gateway | undefined {
    return this.getSession(sessionId)?.gateways.get(id);
  }

  createGateway(sessionId: string, data: CreateGateway): Gateway {
    const session = this.requireSession(sessionId);
    const id = session.counters.gateways++;
    const gateway: Gateway = {
      id,
      name: data.name,
      type: data.type,
      baseUrl: data.baseUrl,
      apiKey: data.apiKey,
      createdAt: new Date().toISOString(),
    };
    session.gateways.set(id, gateway);
    return gateway;
  }

  deleteGateway(sessionId: string, id: number): boolean {
    return this.getSession(sessionId)?.gateways.delete(id) ?? false;
  }

  // --- Datasets ---

  listDatasets(sessionId: string): Dataset[] {
    return Array.from(this.getSession(sessionId)?.datasets.values() ?? []);
  }

  getDataset(sessionId: string, id: number): Dataset | undefined {
    return this.getSession(sessionId)?.datasets.get(id);
  }

  createDataset(sessionId: string, data: CreateDataset): Dataset {
    const session = this.requireSession(sessionId);
    const id = session.counters.datasets++;
    const dataset: Dataset = {
      id,
      name: data.name,
      content: data.content,
      privacyStatus: "unchecked",
      privacyReport: null,
      createdAt: new Date().toISOString(),
    };
    session.datasets.set(id, dataset);
    return dataset;
  }

  updateDataset(sessionId: string, id: number, data: Partial<Omit<Dataset, "id">>): Dataset | undefined {
    const existing = this.getSession(sessionId)?.datasets.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...data };
    this.sessions.get(sessionId)!.datasets.set(id, updated);
    return updated;
  }

  deleteDataset(sessionId: string, id: number): boolean {
    return this.getSession(sessionId)?.datasets.delete(id) ?? false;
  }

  // --- Competitions ---

  listCompetitions(sessionId: string): Competition[] {
    return Array.from(this.getSession(sessionId)?.competitions.values() ?? []);
  }

  getCompetition(sessionId: string, id: number): Competition | undefined {
    return this.getSession(sessionId)?.competitions.get(id);
  }

  createCompetition(sessionId: string, data: CreateCompetition): Competition {
    const session = this.requireSession(sessionId);
    const id = session.counters.competitions++;
    const competition: Competition = {
      id,
      name: data.name,
      datasetId: data.datasetId,
      systemPrompt: data.systemPrompt,
      status: "draft",
      contestantModels: data.contestantModels,
      judgeModels: data.judgeModels,
      results: null,
      createdAt: new Date().toISOString(),
    };
    session.competitions.set(id, competition);
    return competition;
  }

  updateCompetition(sessionId: string, id: number, data: Partial<Omit<Competition, "id">>): Competition | undefined {
    const existing = this.getSession(sessionId)?.competitions.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...data };
    this.sessions.get(sessionId)!.competitions.set(id, updated);
    return updated;
  }

  deleteCompetition(sessionId: string, id: number): boolean {
    return this.getSession(sessionId)?.competitions.delete(id) ?? false;
  }

  // --- Configured Models ---

  listConfiguredModels(sessionId: string): ConfiguredModel[] {
    return Array.from(this.getSession(sessionId)?.configuredModels.values() ?? []);
  }

  getConfiguredModel(sessionId: string, id: number): ConfiguredModel | undefined {
    return this.getSession(sessionId)?.configuredModels.get(id);
  }

  createConfiguredModel(sessionId: string, data: CreateConfiguredModel): ConfiguredModel {
    const session = this.requireSession(sessionId);
    const id = session.counters.configuredModels++;
    const model: ConfiguredModel = {
      id,
      name: data.name,
      gatewayId: data.gatewayId,
      modelId: data.modelId,
      inputCostPerMillionTokens: data.inputCostPerMillionTokens ?? null,
      outputCostPerMillionTokens: data.outputCostPerMillionTokens ?? null,
      createdAt: new Date().toISOString(),
    };
    session.configuredModels.set(id, model);
    return model;
  }

  deleteConfiguredModel(sessionId: string, id: number): boolean {
    return this.getSession(sessionId)?.configuredModels.delete(id) ?? false;
  }

  // --- LLM Logs ---

  addLlmLog(sessionId: string, data: Omit<LlmLog, "id">): LlmLog {
    const session = this.requireSession(sessionId);
    const log: LlmLog = { id: session.counters.llmLogs++, ...data };
    session.llmLogs.push(log);
    if (session.llmLogs.length > 500) {
      session.llmLogs = session.llmLogs.slice(-500);
    }
    return log;
  }

  listLlmLogs(sessionId: string): LlmLog[] {
    return this.getSession(sessionId)?.llmLogs ?? [];
  }

  clearLlmLogs(sessionId: string): void {
    const session = this.getSession(sessionId);
    if (session) session.llmLogs = [];
  }

  // --- Activities ---

  listActivities(sessionId: string): Activity[] {
    return Array.from(this.getSession(sessionId)?.activities.values() ?? []);
  }

  getActivity(sessionId: string, id: number): Activity | undefined {
    return this.getSession(sessionId)?.activities.get(id);
  }

  createActivity(sessionId: string, data: CreateActivity): Activity {
    const session = this.requireSession(sessionId);
    const id = session.counters.activities++;
    const activity: Activity = {
      id,
      type: data.type,
      status: "running",
      title: data.title,
      acknowledged: false,
      createdAt: new Date().toISOString(),
    };
    session.activities.set(id, activity);
    return activity;
  }

  updateActivity(sessionId: string, id: number, data: Partial<Omit<Activity, "id">>): Activity | undefined {
    const existing = this.getSession(sessionId)?.activities.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...data };
    this.sessions.get(sessionId)!.activities.set(id, updated);
    return updated;
  }

  acknowledgeActivity(sessionId: string, id: number): Activity | undefined {
    return this.updateActivity(sessionId, id, { acknowledged: true });
  }

  // --- Bulk import (for session sync) ---

  private bulkImport<T extends { id: number }>(
    sessionId: string,
    items: T[],
    map: (session: SessionStore) => Map<number, T>,
    counterKey: keyof SessionStore["counters"],
  ): void {
    const session = this.getSession(sessionId);
    if (!session) return;
    const target = map(session);
    let maxId = 0;
    for (const item of items) {
      target.set(item.id, item);
      if (item.id >= maxId) maxId = item.id;
    }
    session.counters[counterKey] = Math.max(session.counters[counterKey], maxId + 1);
  }

  importGateways(sessionId: string, gateways: Gateway[]): void {
    this.bulkImport(sessionId, gateways, (s) => s.gateways, "gateways");
  }

  importDatasets(sessionId: string, datasets: Dataset[]): void {
    this.bulkImport(sessionId, datasets, (s) => s.datasets, "datasets");
  }
}

export const store = new InMemoryStore();

export type { Gateway, CreateGateway, Dataset, CreateDataset, Competition, CreateCompetition, LlmLog, ConfiguredModel, CreateConfiguredModel, Activity, CreateActivity };
export type { JudgeScoreEntry, ModelResponseEntry, CompetitionResultEntry, ModelSelection } from "./types";
