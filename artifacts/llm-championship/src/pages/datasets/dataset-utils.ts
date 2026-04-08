import type { Dataset } from "@workspace/api-client-react";
import type { VaultDataset } from "@/lib/vault/types";

export function toVaultDataset(dataset: Dataset): VaultDataset {
  return {
    id: dataset.id,
    name: dataset.name,
    content: dataset.content,
    privacyStatus: dataset.privacyStatus ?? "unchecked",
    privacyReport: dataset.privacyReport ?? null,
    createdAt: dataset.createdAt,
  };
}