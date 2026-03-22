import type { VaultData, VaultGateway, VaultDataset } from "./types";

const API_BASE = "/api";

export async function syncToServer(
  gateways: VaultGateway[],
  datasets: VaultDataset[],
): Promise<{ sessionId: string; gatewayCount: number; datasetCount: number }> {
  const res = await fetch(`${API_BASE}/session/sync`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ gateways, datasets }),
  });
  if (!res.ok) {
    throw new Error(`Session sync failed: ${res.status}`);
  }
  return res.json();
}

export async function deleteSession(): Promise<void> {
  await fetch(`${API_BASE}/session`, {
    method: "DELETE",
    credentials: "include",
  });
}

export function buildSyncPayload(vault: VaultData): {
  gateways: VaultGateway[];
  datasets: VaultDataset[];
} {
  return {
    gateways: vault.gateways,
    datasets: vault.datasets,
  };
}
