export interface Gateway {
  id: number;
  name: string;
  type: string;
  baseUrl: string;
  apiKey: string;
  customHeaders?: Record<string, string>;
  createdAt: string;
}

export interface CreateGateway {
  name: string;
  type: string;
  baseUrl: string;
  apiKey: string;
  customHeaders?: Record<string, string>;
}

export interface Dataset {
  id: number;
  name: string;
  content: string;
  privacyStatus: string;
  privacyReport: string | null;
  createdAt: string;
}

export interface CreateDataset {
  name: string;
  content: string;
}

export interface JudgeScoreEntry {
  judgeModelId: string;
  judgeModelName: string;
  score: number;
  reasoning: string;
}

export interface ModelResponseEntry {
  dataItemIndex: number;
  response: string;
  durationMs: number;
  promptTokens: number;
  completionTokens: number;
  cost: number;
  judgeScores: JudgeScoreEntry[];
}

export interface CompetitionResultEntry {
  gatewayId: number;
  modelId: string;
  modelName: string;
  avgSpeed: number;
  totalCost: number;
  avgQuality: number;
  totalTokens: number;
  responses: ModelResponseEntry[];
}

export interface ConfiguredModel {
  id: number;
  name: string;
  gatewayId: number;
  modelId: string;
  inputCostPerMillionTokens: number | null;
  outputCostPerMillionTokens: number | null;
  createdAt: string;
}

export interface CreateConfiguredModel {
  name: string;
  gatewayId: number;
  modelId: string;
  inputCostPerMillionTokens?: number | null;
  outputCostPerMillionTokens?: number | null;
}

export interface ModelSelection {
  gatewayId: number;
  modelId: string;
  modelName: string;
  inputCostPerMillionTokens?: number | null;
  outputCostPerMillionTokens?: number | null;
}

export interface Competition {
  id: number;
  name: string;
  datasetId: number;
  systemPrompt: string;
  status: string;
  contestantModels: ModelSelection[];
  judgeModels: ModelSelection[];
  results: CompetitionResultEntry[] | null;
  createdAt: string;
}

export interface CreateCompetition {
  name: string;
  datasetId: number;
  systemPrompt: string;
  contestantModels: ModelSelection[];
  judgeModels: ModelSelection[];
}

export interface Activity {
  id: number;
  type: "competition_run" | "dataset_generate";
  status: "running" | "completed" | "error";
  title: string;
  progress?: string;
  resultId?: number;
  error?: string;
  acknowledged: boolean;
  createdAt: string;
  completedAt?: string;
}

export interface CreateActivity {
  type: "competition_run" | "dataset_generate";
  title: string;
}

export interface LlmLog {
  id: number;
  timestamp: string;
  gatewayType: string;
  modelId: string;
  requestUrl: string;
  requestBody: unknown;
  responseStatus: number;
  responseBody: unknown;
  durationMs: number;
  error: string | null;
}
