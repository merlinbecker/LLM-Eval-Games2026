import { useState, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { 
  useListDatasets, 
  useCreateDataset,
  useUploadDataset,
  useDeleteDataset, 
  usePrivacyCheckDataset, 
  useAnonymizeDataset,
  useGenerateDataset,
  useUpdateDataset,
  useGetDataset,
  getListDatasetsQueryKey,
  useListGateways,
  useListConfiguredModels,
} from "@workspace/api-client-react";
import { RetroWindow, RetroButton, RetroInput, RetroTextarea, RetroBadge, RetroSelect, RetroDialog, RetroFormField } from "@/components/retro";
import { formatDate } from "@/lib/utils";
import { ShieldAlert, ShieldCheck, FileText, Trash2, BrainCircuit, Edit3 } from "lucide-react";
import { useVault } from "@/lib/vault/vault-store";
import type { VaultDataset } from "@/lib/vault/types";
import type { Dataset } from "@workspace/api-client-react";

function toVaultDataset(d: Dataset): VaultDataset {
  return {
    id: d.id,
    name: d.name,
    content: d.content,
    privacyStatus: d.privacyStatus ?? "unchecked",
    privacyReport: d.privacyReport ?? null,
    createdAt: d.createdAt,
  };
}

export default function Datasets() {
  const queryClient = useQueryClient();
  const { addDataset, removeDataset, updateDataset: updateVaultDataset } = useVault();
  const { data: datasets, isLoading } = useListDatasets();
  const deleteMutation = useDeleteDataset();
  const privacyMutation = usePrivacyCheckDataset();
  const anonymizeMutation = useAnonymizeDataset();

  const { data: gateways } = useListGateways();
  const { data: configuredModels } = useListConfiguredModels();
  const [activeTab, setActiveTab] = useState<"list" | "upload" | "generate">("list");
  const [actionDialog, setActionDialog] = useState<{ type: "privacy" | "anonymize"; datasetId: number } | null>(null);
  const [editDatasetId, setEditDatasetId] = useState<number | null>(null);
  const [dialogConfiguredModelId, setDialogConfiguredModelId] = useState("");

  const handleDelete = async (id: number) => {
    if (confirm("DELETE DATASET? THIS CANNOT BE UNDONE.")) {
      await deleteMutation.mutateAsync({ id });
      removeDataset(id);
      queryClient.invalidateQueries({ queryKey: getListDatasetsQueryKey() });
    }
  };

  const openActionDialog = (type: "privacy" | "anonymize", datasetId: number) => {
    setDialogConfiguredModelId("");
    setActionDialog({ type, datasetId });
  };

  const handleDialogSubmit = async () => {
    if (!actionDialog || !dialogConfiguredModelId) return;
    const cm = configuredModels?.find(m => m.id === Number(dialogConfiguredModelId));
    if (!cm) return;
    const { type, datasetId } = actionDialog;
    if (type === "privacy") {
      const result = await privacyMutation.mutateAsync({ id: datasetId, data: { gatewayId: cm.gatewayId, modelId: cm.modelId } });
      // Update vault with new privacy status
      const ds = datasets?.find(d => d.id === datasetId);
      if (ds) {
        const privacyStatus = result.status === "clean" ? "clean" : "issues_found";
        updateVaultDataset(toVaultDataset({ ...ds, privacyStatus, privacyReport: result.report ?? null }));
      }
    } else {
      await anonymizeMutation.mutateAsync({ id: datasetId, data: { gatewayId: cm.gatewayId, modelId: cm.modelId } });
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
              {datasets.map((ds) => (
                <div key={ds.id} className="border-[3px] border-mac-black p-4 flex flex-col md:flex-row gap-4 cursor-pointer hover:bg-mac-black/5 transition-colors" onClick={() => setEditDatasetId(ds.id)}>
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <FileText className="w-6 h-6" />
                      <h3 className="font-display text-xl font-bold uppercase">{ds.name}</h3>
                      <RetroBadge>ID: {ds.id}</RetroBadge>
                    </div>
                    <div className="flex items-center space-x-2 text-sm">
                      <span className="font-bold">STATUS:</span>
                      {ds.privacyStatus === 'clean' ? <ShieldCheck className="w-5 h-5" /> : null}
                      {ds.privacyStatus === 'issues_found' ? <ShieldAlert className="w-5 h-5 animate-pulse" /> : null}
                      <span className="uppercase">{ds.privacyStatus}</span>
                      <span className="mx-2">|</span>
                      <span>CREATED: {formatDate(ds.createdAt)}</span>
                    </div>
                    {ds.privacyReport && (
                      <div className="mt-4 p-3 border-2 border-dashed border-mac-black text-sm max-h-32 overflow-y-auto bg-mac-white">
                        <strong>PRIVACY REPORT:</strong><br />
                        {ds.privacyReport}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex flex-col space-y-2 justify-center md:w-48 border-l-[3px] border-mac-black pl-4" onClick={(e) => e.stopPropagation()}>
                    <RetroButton size="sm" onClick={() => setEditDatasetId(ds.id)}>
                      <Edit3 className="w-4 h-4 mr-1 inline" /> VIEW / EDIT
                    </RetroButton>
                    <RetroButton size="sm" onClick={() => openActionDialog("privacy", ds.id)}>
                      SCAN PRIVACY
                    </RetroButton>
                    {ds.privacyStatus === 'issues_found' && (
                      <RetroButton size="sm" variant="secondary" onClick={() => openActionDialog("anonymize", ds.id)}>
                        ANONYMIZE
                      </RetroButton>
                    )}
                    <RetroButton size="sm" variant="danger" onClick={() => handleDelete(ds.id)}>
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
            <RetroSelect value={dialogConfiguredModelId} onChange={(e) => setDialogConfiguredModelId(e.target.value)}>
              <option value="">-- SELECT MODEL --</option>
              {configuredModels?.map(m => {
                const gw = gateways?.find(g => g.id === m.gatewayId);
                return <option key={m.id} value={m.id}>{m.name} ({gw?.name ?? `GW #${m.gatewayId}`})</option>;
              })}
            </RetroSelect>
          </RetroFormField>
          <div className="flex space-x-3 pt-2">
            <RetroButton 
              className="flex-1" 
              onClick={handleDialogSubmit} 
              disabled={!dialogConfiguredModelId || privacyMutation.isPending || anonymizeMutation.isPending}
            >
              {(privacyMutation.isPending || anonymizeMutation.isPending) ? "PROCESSING..." : actionDialog.type === "privacy" ? "START SCAN" : "ANONYMIZE"}
            </RetroButton>
            <RetroButton variant="secondary" onClick={() => setActionDialog(null)}>CANCEL</RetroButton>
          </div>
        </RetroDialog>
      )}

      {editDatasetId !== null && (
        <DatasetEditDialog
          datasetId={editDatasetId}
          onClose={() => setEditDatasetId(null)}
        />
      )}
    </div>
  );
}

function DatasetEditDialog({ datasetId, onClose }: { datasetId: number; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { updateDataset: updateVaultDataset } = useVault();
  const { data: dataset, isLoading } = useGetDataset(datasetId);
  const updateMutation = useUpdateDataset();
  const [editName, setEditName] = useState("");
  const [editContent, setEditContent] = useState("");
  const [initialized, setInitialized] = useState(false);

  if (dataset && !initialized) {
    setEditName(dataset.name);
    setEditContent(dataset.content);
    setInitialized(true);
  }

  const handleSave = async () => {
    const result = await updateMutation.mutateAsync({
      id: datasetId,
      data: { name: editName, content: editContent },
    });
    updateVaultDataset(toVaultDataset(result));
    queryClient.invalidateQueries({ queryKey: getListDatasetsQueryKey() });
    onClose();
  };

  return (
    <RetroDialog title={`DATASET: ${dataset?.name ?? "..."}`} onClose={onClose}>
      {isLoading ? (
        <div className="p-8 text-center font-display text-xl animate-pulse">LOADING...</div>
      ) : dataset ? (
        <div className="space-y-4">
          <RetroFormField label="Name">
            <RetroInput value={editName} onChange={(e) => setEditName(e.target.value)} />
          </RetroFormField>
          <RetroFormField label="Content (Markdown)">
            <RetroTextarea
              rows={15}
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="font-mono text-sm"
            />
          </RetroFormField>
          <div className="flex space-x-3 pt-2">
            <RetroButton className="flex-1" onClick={handleSave} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "SAVING..." : "SAVE CHANGES"}
            </RetroButton>
            <RetroButton variant="secondary" onClick={onClose}>CANCEL</RetroButton>
          </div>
        </div>
      ) : (
        <div className="p-4 text-center">DATASET NOT FOUND.</div>
      )}
    </RetroDialog>
  );
}

function UploadDatasetForm({ onSuccess }: { onSuccess: () => void }) {
  const queryClient = useQueryClient();
  const { addDataset } = useVault();
  const createMutation = useCreateDataset();
  const uploadMutation = useUploadDataset();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [inputMode, setInputMode] = useState<"file" | "text">("file");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.endsWith(".md")) {
        alert("ONLY .MD FILES ACCEPTED");
        return;
      }
      setSelectedFile(file);
      if (!name) setName(file.name.replace(/\.md$/, ""));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let result;
    if (inputMode === "file" && selectedFile) {
      result = await uploadMutation.mutateAsync({ data: { file: selectedFile as Blob, name } });
    } else {
      result = await createMutation.mutateAsync({ data: { name, content } });
    }
    addDataset(toVaultDataset(result));
    queryClient.invalidateQueries({ queryKey: getListDatasetsQueryKey() });
    onSuccess();
  };

  const isPending = createMutation.isPending || uploadMutation.isPending;

  return (
    <RetroWindow title="UPLOAD MARKDOWN">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex space-x-4 mb-4">
          <RetroButton type="button" variant={inputMode === "file" ? "primary" : "secondary"} size="sm" onClick={() => setInputMode("file")}>
            UPLOAD .MD FILE
          </RetroButton>
          <RetroButton type="button" variant={inputMode === "text" ? "primary" : "secondary"} size="sm" onClick={() => setInputMode("text")}>
            PASTE TEXT
          </RetroButton>
        </div>
        <RetroFormField label="Dataset Name">
          <RetroInput required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Math Riddles" />
        </RetroFormField>
        {inputMode === "file" ? (
          <RetroFormField label="Markdown File (.md)">
            <div 
              className="border-[3px] border-dashed border-mac-black p-8 text-center cursor-pointer hover:bg-mac-black/5"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".md"
                onChange={handleFileChange}
                className="hidden"
              />
              {selectedFile ? (
                <div className="font-display">
                  <FileText className="w-10 h-10 mx-auto mb-2" />
                  <p className="text-lg uppercase">{selectedFile.name}</p>
                  <p className="text-sm">({(selectedFile.size / 1024).toFixed(1)} KB)</p>
                </div>
              ) : (
                <div className="font-display">
                  <FileText className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p className="text-lg uppercase">CLICK TO SELECT .MD FILE</p>
                  <p className="text-sm">OR DRAG &amp; DROP</p>
                </div>
              )}
            </div>
          </RetroFormField>
        ) : (
          <RetroFormField label="Markdown Content">
            <RetroTextarea required rows={10} value={content} onChange={(e) => setContent(e.target.value)} placeholder="## Question 1\n...\n\n## Question 2..." className="font-mono text-base" />
          </RetroFormField>
        )}
        <RetroButton 
          type="submit" 
          disabled={isPending || (inputMode === "file" && !selectedFile)} 
          size="lg" 
          className="w-full"
        >
          {isPending ? "UPLOADING..." : "SAVE DATASET"}
        </RetroButton>
      </form>
    </RetroWindow>
  );
}

function GenerateDatasetForm({ onSuccess }: { onSuccess: () => void }) {
  const mutation = useGenerateDataset();
  const { data: gateways } = useListGateways();
  const { data: configuredModels } = useListConfiguredModels();
  
  const [name, setName] = useState("");
  const [topic, setTopic] = useState("");
  const [examples, setExamples] = useState("");
  const [count, setCount] = useState(5);
  const [configuredModelId, setConfiguredModelId] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cm = configuredModels?.find(m => m.id === Number(configuredModelId));
    if (!cm) return;
    await mutation.mutateAsync({ 
      data: { 
        name, 
        topic, 
        numberOfItems: count,
        ...(examples.trim() ? { examples: examples.trim() } : {}),
        gatewayId: cm.gatewayId,
        modelId: cm.modelId
      } 
    });
    // Dataset generation now runs in background — the BackgroundActivityProvider
    // will show a toast and invalidate queries when done.
    onSuccess();
  };

  return (
    <RetroWindow title="AI GENERATOR">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-2 gap-6">
          <RetroFormField label="Dataset Name">
            <RetroInput required value={name} onChange={(e) => setName(e.target.value)} />
          </RetroFormField>
          <RetroFormField label="Item Count">
            <RetroInput type="number" required min="1" max="50" value={count} onChange={(e) => setCount(Number(e.target.value))} />
          </RetroFormField>
        </div>
        
        <RetroFormField label="Description">
          <RetroTextarea required rows={2} value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Describe the data to generate, e.g.: Math word problems for grade school students" />
        </RetroFormField>

        <RetroFormField label="Examples (optional)">
          <RetroTextarea rows={6} value={examples} onChange={(e) => setExamples(e.target.value)} placeholder={"Provide example items to guide style and format, e.g.:\n\n## Item 1\nA train travels 120 km in 2 hours. What is its average speed?\n\n## Item 2\nIf a rectangle has a width of 5 cm and a length of 12 cm, what is the area?"} className="font-mono text-sm" />
        </RetroFormField>

        <div className="border-[3px] border-mac-black p-4 bg-dither">
          <div className="bg-mac-white p-4 text-mac-black border-[3px] border-mac-black">
            <h4 className="font-display flex items-center mb-4"><BrainCircuit className="w-5 h-5 mr-2"/> Generator Model Config</h4>
            <RetroFormField label="Configured Model">
              <RetroSelect required value={configuredModelId} onChange={(e) => setConfiguredModelId(e.target.value)}>
                <option value="">-- SELECT MODEL --</option>
                {configuredModels?.map(m => {
                  const gw = gateways?.find(g => g.id === m.gatewayId);
                  return <option key={m.id} value={m.id}>{m.name} ({gw?.name ?? `GW #${m.gatewayId}`})</option>;
                })}
              </RetroSelect>
            </RetroFormField>
          </div>
        </div>

        <RetroButton type="submit" disabled={mutation.isPending} size="lg" className="w-full">
          {mutation.isPending ? "STARTING..." : "GENERATE DATASET"}
        </RetroButton>
      </form>
    </RetroWindow>
  );
}
