export interface VaultGateway {
  id: number;
  name: string;
  type: "openrouter" | "github_copilot" | "custom" | "custom_openai" | "custom_anthropic" | "custom_gemini";
  baseUrl: string;
  apiKey: string;
  customHeaders?: Record<string, string>;
}

export interface VaultDataset {
  id: number;
  name: string;
  content: string;
  privacyStatus: string;
  privacyReport: string | null;
  createdAt: string;
}

export interface VaultConfiguredModel {
  id: number;
  name: string;
  gatewayId: number;
  modelId: string;
  inputCostPerMillionTokens: number | null;
  outputCostPerMillionTokens: number | null;
  createdAt: string;
}

export interface VaultSettings {
  lastSelectedGateway?: number;
}

export interface VaultData {
  version: 1;
  createdAt: string;
  updatedAt: string;
  gateways: VaultGateway[];
  datasets: VaultDataset[];
  configuredModels: VaultConfiguredModel[];
  settings: VaultSettings;
}

export interface StoredVault {
  v: 1;
  salt: string;   // Base64
  iv: string;     // Base64
  data: string;   // Base64(AES-GCM(gzip(JSON)))
}
