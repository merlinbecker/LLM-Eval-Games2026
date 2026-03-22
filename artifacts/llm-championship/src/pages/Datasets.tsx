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
  getListDatasetsQueryKey,
  useListGateways,
  useListGatewayModels,
  getListGatewayModelsQueryKey
} from "@workspace/api-client-react";
import { RetroWindow, RetroButton, RetroInput, RetroTextarea, RetroBadge, RetroSelect } from "@/components/retro";
import { formatDate } from "@/lib/utils";
import { ShieldAlert, ShieldCheck, FileText, Trash2, BrainCircuit } from "lucide-react";
import { useVault } from "@/lib/vault/vault-store";

export default function Datasets() {
  const queryClient = useQueryClient();
  const { addDataset, removeDataset, updateDataset: updateVaultDataset } = useVault();
  const { data: datasets, isLoading } = useListDatasets();
  const deleteMutation = useDeleteDataset();
  const privacyMutation = usePrivacyCheckDataset();
  const anonymizeMutation = useAnonymizeDataset();

  const { data: gateways } = useListGateways();
  const [activeTab, setActiveTab] = useState<"list" | "upload" | "generate">("list");
  const [actionDialog, setActionDialog] = useState<{ type: "privacy" | "anonymize"; datasetId: number } | null>(null);
  const [dialogGatewayId, setDialogGatewayId] = useState("");
  const [dialogModelId, setDialogModelId] = useState("");

  const dialogGwId = Number(dialogGatewayId) || 0;
  const { data: dialogModels } = useListGatewayModels(dialogGwId, { query: { queryKey: getListGatewayModelsQueryKey(dialogGwId), enabled: !!dialogGatewayId }});

  const handleDelete = async (id: number) => {
    if (confirm("DELETE DATASET? THIS CANNOT BE UNDONE.")) {
      await deleteMutation.mutateAsync({ id });
      removeDataset(id);
      queryClient.invalidateQueries({ queryKey: getListDatasetsQueryKey() });
    }
  };

  const openActionDialog = (type: "privacy" | "anonymize", datasetId: number) => {
    setDialogGatewayId("");
    setDialogModelId("");
    setActionDialog({ type, datasetId });
  };

  const handleDialogSubmit = async () => {
    if (!actionDialog || !dialogGatewayId || !dialogModelId) return;
    const { type, datasetId } = actionDialog;
    if (type === "privacy") {
      await privacyMutation.mutateAsync({ id: datasetId, data: { gatewayId: Number(dialogGatewayId), modelId: dialogModelId } });
    } else {
      await anonymizeMutation.mutateAsync({ id: datasetId, data: { gatewayId: Number(dialogGatewayId), modelId: dialogModelId } });
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
                <div key={ds.id} className="border-[3px] border-black p-4 flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <FileText className="w-6 h-6" />
                      <h3 className="font-display text-xl font-bold uppercase">{ds.name}</h3>
                      <RetroBadge>ID: {ds.id}</RetroBadge>
                    </div>
                    <p className="text-lg line-clamp-2 mb-4 bg-black/5 p-2 border-l-4 border-black">
                      System Prompt: {ds.systemPrompt}
                    </p>
                    <div className="flex items-center space-x-2 text-sm">
                      <span className="font-bold">STATUS:</span>
                      {ds.privacyStatus === 'clean' ? <ShieldCheck className="w-5 h-5 text-black" /> : null}
                      {ds.privacyStatus === 'issues_found' ? <ShieldAlert className="w-5 h-5 text-black animate-pulse" /> : null}
                      <span className="uppercase">{ds.privacyStatus}</span>
                      <span className="mx-2">|</span>
                      <span>CREATED: {formatDate(ds.createdAt)}</span>
                    </div>
                    {ds.privacyReport && (
                      <div className="mt-4 p-3 border-2 border-dashed border-black text-sm max-h-32 overflow-y-auto bg-white">
                        <strong>PRIVACY REPORT:</strong><br />
                        {ds.privacyReport}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex flex-col space-y-2 justify-center md:w-48 border-l-[3px] border-black pl-4">
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setActionDialog(null)}>
          <div className="bg-white border-[3px] border-black p-0 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="bg-black text-white px-4 py-2 font-display uppercase">
              {actionDialog.type === "privacy" ? "PRIVACY SCAN CONFIG" : "ANONYMIZE CONFIG"}
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block font-display mb-2 uppercase text-sm">Gateway</label>
                <RetroSelect value={dialogGatewayId} onChange={(e) => { setDialogGatewayId(e.target.value); setDialogModelId(""); }}>
                  <option value="">-- SELECT GATEWAY --</option>
                  {gateways?.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </RetroSelect>
              </div>
              <div>
                <label className="block font-display mb-2 uppercase text-sm">Model</label>
                <RetroSelect value={dialogModelId} onChange={(e) => setDialogModelId(e.target.value)} disabled={!dialogModels?.length}>
                  <option value="">-- SELECT MODEL --</option>
                  {dialogModels?.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </RetroSelect>
              </div>
              <div className="flex space-x-3 pt-2">
                <RetroButton 
                  className="flex-1" 
                  onClick={handleDialogSubmit} 
                  disabled={!dialogGatewayId || !dialogModelId || privacyMutation.isPending || anonymizeMutation.isPending}
                >
                  {(privacyMutation.isPending || anonymizeMutation.isPending) ? "PROCESSING..." : actionDialog.type === "privacy" ? "START SCAN" : "ANONYMIZE"}
                </RetroButton>
                <RetroButton variant="secondary" onClick={() => setActionDialog(null)}>CANCEL</RetroButton>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function UploadDatasetForm({ onSuccess }: { onSuccess: () => void }) {
  const queryClient = useQueryClient();
  const { addDataset } = useVault();
  const createMutation = useCreateDataset();
  const uploadMutation = useUploadDataset();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [prompt, setPrompt] = useState("");
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
      result = await uploadMutation.mutateAsync({ data: { file: selectedFile as Blob, name, systemPrompt: prompt } });
    } else {
      result = await createMutation.mutateAsync({ data: { name, systemPrompt: prompt, content } });
    }
    addDataset({
      id: result.id,
      name: result.name,
      content: result.content,
      systemPrompt: result.systemPrompt,
      privacyStatus: result.privacyStatus ?? "unchecked",
      privacyReport: result.privacyReport ?? null,
      createdAt: result.createdAt,
    });
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
        <div>
          <label className="block font-display mb-2 uppercase">Dataset Name</label>
          <RetroInput required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Math Riddles" />
        </div>
        <div>
          <label className="block font-display mb-2 uppercase">System Prompt</label>
          <RetroTextarea required rows={3} value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="You are a helpful assistant..." />
        </div>
        {inputMode === "file" ? (
          <div>
            <label className="block font-display mb-2 uppercase">Markdown File (.md)</label>
            <div 
              className="border-[3px] border-dashed border-black p-8 text-center cursor-pointer hover:bg-black/5"
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
          </div>
        ) : (
          <div>
            <label className="block font-display mb-2 uppercase">Markdown Content</label>
            <RetroTextarea required rows={10} value={content} onChange={(e) => setContent(e.target.value)} placeholder="## Question 1\n...\n\n## Question 2..." className="font-mono text-base" />
          </div>
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
  const queryClient = useQueryClient();
  const { addDataset } = useVault();
  const mutation = useGenerateDataset();
  const { data: gateways } = useListGateways();
  
  const [name, setName] = useState("");
  const [topic, setTopic] = useState("");
  const [prompt, setPrompt] = useState("");
  const [count, setCount] = useState(5);
  const [gatewayId, setGatewayId] = useState("");
  const [modelId, setModelId] = useState("");

  const gwId = Number(gatewayId) || 0;
  const { data: models } = useListGatewayModels(gwId, { query: { queryKey: getListGatewayModelsQueryKey(gwId), enabled: !!gatewayId }});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await mutation.mutateAsync({ 
      data: { 
        name, 
        topic, 
        systemPrompt: prompt, 
        numberOfItems: count,
        gatewayId: Number(gatewayId),
        modelId
      } 
    });
    addDataset({
      id: result.id,
      name: result.name,
      content: result.content,
      systemPrompt: result.systemPrompt,
      privacyStatus: result.privacyStatus ?? "unchecked",
      privacyReport: result.privacyReport ?? null,
      createdAt: result.createdAt,
    });
    queryClient.invalidateQueries({ queryKey: getListDatasetsQueryKey() });
    onSuccess();
  };

  return (
    <RetroWindow title="AI GENERATOR">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block font-display mb-2 uppercase">Dataset Name</label>
            <RetroInput required value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="block font-display mb-2 uppercase">Item Count</label>
            <RetroInput type="number" required min="1" max="50" value={count} onChange={(e) => setCount(Number(e.target.value))} />
          </div>
        </div>
        
        <div>
          <label className="block font-display mb-2 uppercase">Topic / Domain</label>
          <RetroInput required value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g., Quantum Physics queries" />
        </div>

        <div>
          <label className="block font-display mb-2 uppercase">Target System Prompt</label>
          <RetroTextarea required rows={3} value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="The prompt the models will be tested against..." />
        </div>

        <div className="border-[3px] border-black p-4 bg-dither text-white">
          <div className="bg-white p-4 text-black border-[3px] border-black">
            <h4 className="font-display flex items-center mb-4"><BrainCircuit className="w-5 h-5 mr-2"/> Generator Model Config</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block font-display mb-2 uppercase text-sm">Gateway</label>
                <RetroSelect required value={gatewayId} onChange={(e) => setGatewayId(e.target.value)}>
                  <option value="">-- SELECT --</option>
                  {gateways?.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </RetroSelect>
              </div>
              <div>
                <label className="block font-display mb-2 uppercase text-sm">Model</label>
                <RetroSelect required value={modelId} onChange={(e) => setModelId(e.target.value)} disabled={!models?.length}>
                  <option value="">-- SELECT --</option>
                  {models?.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </RetroSelect>
              </div>
            </div>
          </div>
        </div>

        <RetroButton type="submit" disabled={mutation.isPending} size="lg" className="w-full">
          {mutation.isPending ? "SYNTHESIZING..." : "GENERATE DATASET"}
        </RetroButton>
      </form>
    </RetroWindow>
  );
}
