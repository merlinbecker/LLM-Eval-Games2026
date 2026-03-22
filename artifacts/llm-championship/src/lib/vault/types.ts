export interface VaultGateway {
  id: number;
  name: string;
  type: "openrouter" | "github_copilot" | "custom";
  baseUrl: string;
  apiKey: string;
}

export interface VaultDataset {
  id: number;
  name: string;
  content: string;
  systemPrompt: string;
  privacyStatus: string;
  privacyReport: string | null;
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
  settings: VaultSettings;
}

export interface StoredVault {
  v: 1;
  salt: string;   // Base64
  iv: string;     // Base64
  data: string;   // Base64(AES-GCM(gzip(JSON)))
}
