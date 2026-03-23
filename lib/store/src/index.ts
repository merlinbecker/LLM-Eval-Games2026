import type {
  Gateway,
  CreateGateway,
  Dataset,
  CreateDataset,
  Competition,
  CreateCompetition,
  CompetitionResultEntry,
  LlmLog,
} from "./types";

declare function setInterval(callback: () => void, ms: number): unknown;
declare function clearInterval(handle: unknown): void;

interface SessionStore {
  gateways: Map<number, Gateway>;
  datasets: Map<number, Dataset>;
  competitions: Map<number, Competition>;
  llmLogs: LlmLog[];
  counters: { gateways: number; datasets: number; competitions: number; llmLogs: number };
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

  createSession(sessionId: string): SessionStore {
    const session: SessionStore = {
      gateways: new Map(),
      datasets: new Map(),
      competitions: new Map(),
      llmLogs: [],
      counters: { gateways: 1, datasets: 1, competitions: 1, llmLogs: 1 },
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
    const session = this.getSession(sessionId);
    if (!session) return [];
    return Array.from(session.gateways.values());
  }

  getGateway(sessionId: string, id: number): Gateway | undefined {
    const session = this.getSession(sessionId);
    return session?.gateways.get(id);
  }

  createGateway(sessionId: string, data: CreateGateway): Gateway {
    const session = this.getSession(sessionId);
    if (!session) throw new Error("Session not found");
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
    const session = this.getSession(sessionId);
    if (!session) return false;
    return session.gateways.delete(id);
  }

  // --- Datasets ---

  listDatasets(sessionId: string): Dataset[] {
    const session = this.getSession(sessionId);
    if (!session) return [];
    return Array.from(session.datasets.values());
  }

  getDataset(sessionId: string, id: number): Dataset | undefined {
    const session = this.getSession(sessionId);
    return session?.datasets.get(id);
  }

  createDataset(sessionId: string, data: CreateDataset): Dataset {
    const session = this.getSession(sessionId);
    if (!session) throw new Error("Session not found");
    const id = session.counters.datasets++;
    const dataset: Dataset = {
      id,
      name: data.name,
      content: data.content,
      systemPrompt: data.systemPrompt,
      privacyStatus: "unchecked",
      privacyReport: null,
      createdAt: new Date().toISOString(),
    };
    session.datasets.set(id, dataset);
    return dataset;
  }

  updateDataset(sessionId: string, id: number, data: Partial<Omit<Dataset, "id">>): Dataset | undefined {
    const session = this.getSession(sessionId);
    if (!session) return undefined;
    const existing = session.datasets.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...data };
    session.datasets.set(id, updated);
    return updated;
  }

  deleteDataset(sessionId: string, id: number): boolean {
    const session = this.getSession(sessionId);
    if (!session) return false;
    return session.datasets.delete(id);
  }

  // --- Competitions ---

  listCompetitions(sessionId: string): Competition[] {
    const session = this.getSession(sessionId);
    if (!session) return [];
    return Array.from(session.competitions.values());
  }

  getCompetition(sessionId: string, id: number): Competition | undefined {
    const session = this.getSession(sessionId);
    return session?.competitions.get(id);
  }

  createCompetition(sessionId: string, data: CreateCompetition): Competition {
    const session = this.getSession(sessionId);
    if (!session) throw new Error("Session not found");
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
    const session = this.getSession(sessionId);
    if (!session) return undefined;
    const existing = session.competitions.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...data };
    session.competitions.set(id, updated);
    return updated;
  }

  deleteCompetition(sessionId: string, id: number): boolean {
    const session = this.getSession(sessionId);
    if (!session) return false;
    return session.competitions.delete(id);
  }

  // --- LLM Logs ---

  addLlmLog(sessionId: string, data: Omit<LlmLog, "id">): LlmLog {
    const session = this.getSession(sessionId);
    if (!session) throw new Error("Session not found");
    const log: LlmLog = { id: session.counters.llmLogs++, ...data };
    session.llmLogs.push(log);
    // Keep at most 500 logs per session
    if (session.llmLogs.length > 500) {
      session.llmLogs = session.llmLogs.slice(-500);
    }
    return log;
  }

  listLlmLogs(sessionId: string): LlmLog[] {
    const session = this.getSession(sessionId);
    if (!session) return [];
    return session.llmLogs;
  }

  clearLlmLogs(sessionId: string): void {
    const session = this.getSession(sessionId);
    if (session) session.llmLogs = [];
  }

  // --- Bulk import (for session sync) ---

  importGateways(sessionId: string, gateways: Gateway[]): void {
    const session = this.getSession(sessionId);
    if (!session) return;
    let maxId = 0;
    for (const gw of gateways) {
      session.gateways.set(gw.id, gw);
      if (gw.id >= maxId) maxId = gw.id;
    }
    session.counters.gateways = Math.max(session.counters.gateways, maxId + 1);
  }

  importDatasets(sessionId: string, datasets: Dataset[]): void {
    const session = this.getSession(sessionId);
    if (!session) return;
    let maxId = 0;
    for (const ds of datasets) {
      session.datasets.set(ds.id, ds);
      if (ds.id >= maxId) maxId = ds.id;
    }
    session.counters.datasets = Math.max(session.counters.datasets, maxId + 1);
  }
}

export const store = new InMemoryStore();

export type { Gateway, CreateGateway, Dataset, CreateDataset, Competition, CreateCompetition, LlmLog };
export type { JudgeScoreEntry, ModelResponseEntry, CompetitionResultEntry, ModelSelection } from "./types";
