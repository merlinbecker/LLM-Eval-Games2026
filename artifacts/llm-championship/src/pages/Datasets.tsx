import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getListDatasetsQueryKey,
  useAnonymizeDataset,
  useDeleteDataset,
  useListConfiguredModels,
  useListDatasets,
  useListGateways,
  usePrivacyCheckDataset,
} from "@workspace/api-client-react";
import {
  RetroBadge,
  RetroButton,
  RetroDialog,
  RetroFormField,
  RetroSelect,
  RetroWindow,
} from "@/components/retro";
import { formatDate } from "@/lib/utils";
import { useVault } from "@/lib/vault/vault-store";
import { BrainCircuit, Edit3, FileText, ShieldAlert, ShieldCheck, Trash2 } from "lucide-react";
import { DatasetEditDialog } from "./datasets/DatasetEditDialog";
import { GenerateDatasetForm } from "./datasets/GenerateDatasetForm";
import { UploadDatasetForm } from "./datasets/UploadDatasetForm";
import { toVaultDataset } from "./datasets/dataset-utils";

export default function Datasets() {
  const queryClient = useQueryClient();
  const { removeDataset, updateDataset: updateVaultDataset } = useVault();
  const { data: datasets, isLoading } = useListDatasets();
  const deleteMutation = useDeleteDataset();
  const privacyMutation = usePrivacyCheckDataset();
  const anonymizeMutation = useAnonymizeDataset();
  const { data: gateways } = useListGateways();
  const { data: configuredModels } = useListConfiguredModels();

  const [activeTab, setActiveTab] = useState<"list" | "upload" | "generate">("list");
  const [actionDialog, setActionDialog] = useState<{
    type: "privacy" | "anonymize";
    datasetId: number;
  } | null>(null);
  const [editDatasetId, setEditDatasetId] = useState<number | null>(null);
  const [dialogConfiguredModelId, setDialogConfiguredModelId] = useState("");

  const handleDelete = async (id: number) => {
    if (!confirm("DELETE DATASET? THIS CANNOT BE UNDONE.")) {
      return;
    }

    await deleteMutation.mutateAsync({ id });
    removeDataset(id);
    queryClient.invalidateQueries({ queryKey: getListDatasetsQueryKey() });
  };

  const openActionDialog = (type: "privacy" | "anonymize", datasetId: number) => {
    setDialogConfiguredModelId("");
    setActionDialog({ type, datasetId });
  };

  const handleDialogSubmit = async () => {
    if (!actionDialog || !dialogConfiguredModelId) {
      return;
    }

    const configuredModel = configuredModels?.find(
      (model) => model.id === Number(dialogConfiguredModelId),
    );
    if (!configuredModel) {
      return;
    }

    const { type, datasetId } = actionDialog;

    if (type === "privacy") {
      const result = await privacyMutation.mutateAsync({
        id: datasetId,
        data: { gatewayId: configuredModel.gatewayId, modelId: configuredModel.modelId },
      });

      const dataset = datasets?.find((entry) => entry.id === datasetId);
      if (dataset) {
        const privacyStatus = result.status === "clean" ? "clean" : "issues_found";
        updateVaultDataset(
          toVaultDataset({
            ...dataset,
            privacyStatus,
            privacyReport: result.report ?? null,
          }),
        );
      }
    } else {
      const result = await anonymizeMutation.mutateAsync({
        id: datasetId,
        data: { gatewayId: configuredModel.gatewayId, modelId: configuredModel.modelId },
      });
      updateVaultDataset(toVaultDataset(result));
    }

    queryClient.invalidateQueries({ queryKey: getListDatasetsQueryKey() });
    setActionDialog(null);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      <div className="flex space-x-4 mb-8">
        <RetroButton
          variant={activeTab === "list" ? "primary" : "secondary"}
          onClick={() => setActiveTab("list")}
        >
          DATABANKS
        </RetroButton>
        <RetroButton
          variant={activeTab === "upload" ? "primary" : "secondary"}
          onClick={() => setActiveTab("upload")}
        >
          UPLOAD NEW
        </RetroButton>
        <RetroButton
          variant={activeTab === "generate" ? "primary" : "secondary"}
          onClick={() => setActiveTab("generate")}
        >
          AI GENERATOR
        </RetroButton>
      </div>

      {activeTab === "list" && (
        <RetroWindow title="DATASET REGISTRY">
          {isLoading ? (
            <div className="p-8 text-center font-display text-xl animate-pulse">READING TAPE...</div>
          ) : !datasets?.length ? (
            <div className="p-8 text-center">NO DATASETS FOUND.</div>
          ) : (
            <div className="grid gap-6">
              {datasets.map((dataset) => (
                <div
                  key={dataset.id}
                  className="border-[3px] border-mac-black p-4 flex flex-col md:flex-row gap-4 cursor-pointer hover:bg-pattern-5 transition-colors"
                  onClick={() => setEditDatasetId(dataset.id)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setEditDatasetId(dataset.id); }}
                  role="button"
                  tabIndex={0}
                >
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <FileText className="w-6 h-6" />
                      <h3 className="font-display text-xl font-bold uppercase">{dataset.name}</h3>
                      <RetroBadge>ID: {dataset.id}</RetroBadge>
                    </div>
                    <div className="flex items-center space-x-2 text-sm">
                      <span className="font-bold">STATUS:</span>
                      {dataset.privacyStatus === "clean" ? <ShieldCheck className="w-5 h-5" /> : null}
                      {dataset.privacyStatus === "issues_found" ? (
                        <ShieldAlert className="w-5 h-5 animate-pulse" />
                      ) : null}
                      <span className="uppercase">{dataset.privacyStatus}</span>
                      <span className="mx-2">|</span>
                      <span>CREATED: {formatDate(dataset.createdAt)}</span>
                    </div>
                    {dataset.privacyReport && (
                      <div className="mt-4 p-3 border-2 border-dashed border-mac-black text-sm max-h-32 overflow-y-auto bg-mac-white">
                        <strong>PRIVACY REPORT:</strong>
                        <br />
                        {dataset.privacyReport}
                      </div>
                    )}
                  </div>

                  <div
                    className="flex flex-col space-y-2 justify-center md:w-48 border-l-[3px] border-mac-black pl-4"
                    onClick={(event) => event.stopPropagation()}
                    onKeyDown={(event) => event.stopPropagation()}
                  >
                    <RetroButton size="sm" onClick={() => setEditDatasetId(dataset.id)}>
                      <Edit3 className="w-4 h-4 mr-1 inline" /> VIEW / EDIT
                    </RetroButton>
                    <RetroButton size="sm" onClick={() => openActionDialog("privacy", dataset.id)}>
                      SCAN PRIVACY
                    </RetroButton>
                    {dataset.privacyStatus === "issues_found" && (
                      <RetroButton
                        size="sm"
                        variant="secondary"
                        onClick={() => openActionDialog("anonymize", dataset.id)}
                      >
                        ANONYMIZE
                      </RetroButton>
                    )}
                    <RetroButton size="sm" variant="danger" onClick={() => handleDelete(dataset.id)}>
                      <Trash2 className="w-4 h-4 mx-auto" />
                    </RetroButton>
                  </div>
                </div>
              ))}
            </div>
          )}
        </RetroWindow>
      )}

      {activeTab === "upload" && <UploadDatasetForm onSuccess={() => setActiveTab("list")} />}
      {activeTab === "generate" && <GenerateDatasetForm onSuccess={() => setActiveTab("list")} />}

      {actionDialog && (
        <RetroDialog
          title={actionDialog.type === "privacy" ? "PRIVACY SCAN CONFIG" : "ANONYMIZE CONFIG"}
          onClose={() => setActionDialog(null)}
        >
          <RetroFormField label="Configured Model">
            <RetroSelect
              value={dialogConfiguredModelId}
              onChange={(event) => setDialogConfiguredModelId(event.target.value)}
            >
              <option value="">-- SELECT MODEL --</option>
              {configuredModels?.map((model) => {
                const gateway = gateways?.find((entry) => entry.id === model.gatewayId);
                return (
                  <option key={model.id} value={model.id}>
                    {model.name} ({gateway?.name ?? `GW #${model.gatewayId}`})
                  </option>
                );
              })}
            </RetroSelect>
          </RetroFormField>
          <div className="flex space-x-3 pt-2">
            <RetroButton
              className="flex-1"
              onClick={handleDialogSubmit}
              disabled={
                !dialogConfiguredModelId ||
                privacyMutation.isPending ||
                anonymizeMutation.isPending
              }
            >
              {privacyMutation.isPending || anonymizeMutation.isPending
                ? "PROCESSING..."
                : actionDialog.type === "privacy"
                  ? "START SCAN"
                  : "ANONYMIZE"}
            </RetroButton>
            <RetroButton variant="secondary" onClick={() => setActionDialog(null)}>
              CANCEL
            </RetroButton>
          </div>
        </RetroDialog>
      )}

      {editDatasetId !== null && (
        <DatasetEditDialog datasetId={editDatasetId} onClose={() => setEditDatasetId(null)} />
      )}
    </div>
  );
}