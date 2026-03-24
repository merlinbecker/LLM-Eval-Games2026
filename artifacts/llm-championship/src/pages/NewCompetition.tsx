import { useState } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { 
  useListDatasets, 
  useListGateways, 
  useListGatewayModels,
  getListGatewayModelsQueryKey,
  useCreateCompetition,
  getListCompetitionsQueryKey,
  useListConfiguredModels,
} from "@workspace/api-client-react";
import { RetroWindow, RetroButton, RetroInput, RetroTextarea, RetroSelect, RetroCombobox, RetroBadge, RetroFormField } from "@/components/retro";
import { Bot, Swords, Gavel } from "lucide-react";
import type { ModelSelection } from "@workspace/api-client-react";

export default function NewCompetition() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const createMutation = useCreateCompetition();

  const { data: datasets } = useListDatasets();
  
  const [name, setName] = useState("");
  const [datasetId, setDatasetId] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  
  const [contestants, setContestants] = useState<ModelSelection[]>([]);
  const [judges, setJudges] = useState<ModelSelection[]>([]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!datasetId || contestants.length < 1 || judges.length < 3 || judges.length > 5) {
      alert("Requires dataset, at least 1 contestant, and 3–5 judges.");
      return;
    }
    
    const result = await createMutation.mutateAsync({
      data: {
        name,
        datasetId: Number(datasetId),
        systemPrompt,
        contestantModels: contestants,
        judgeModels: judges
      }
    });
    
    queryClient.invalidateQueries({ queryKey: getListCompetitionsQueryKey() });
    setLocation(`/competitions/${result.id}`);
  };

  return (
    <div className="max-w-6xl mx-auto pb-12">
      <h1 className="text-4xl font-display text-center mb-8 uppercase tracking-widest">Setup Championship</h1>

      <form onSubmit={handleCreate} className="space-y-8">
        {/* Basic Config */}
        <RetroWindow title="COMPETITION PARAMS">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <RetroFormField label="Event Name">
                <RetroInput required value={name} onChange={e => setName(e.target.value)} placeholder="Q1 Logic Brawl" />
              </RetroFormField>
              <RetroFormField label="Test Dataset">
                <RetroSelect required value={datasetId} onChange={e => setDatasetId(e.target.value)}>
                  <option value="">-- SELECT DATASET --</option>
                  {datasets?.map(ds => <option key={ds.id} value={ds.id}>{ds.name}</option>)}
                </RetroSelect>
              </RetroFormField>
            </div>
            <RetroFormField label="Global System Prompt (Override)">
              <RetroTextarea 
                required 
                rows={5} 
                value={systemPrompt} 
                onChange={e => setSystemPrompt(e.target.value)} 
                placeholder="You are an expert answering questions from the dataset..."
              />
            </RetroFormField>
          </div>
        </RetroWindow>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Contestants */}
          <RetroWindow title="CONTESTANTS">
            <div className="flex flex-col h-full">
              <ModelSelector 
                onAdd={(m) => setContestants([...contestants, m])} 
                buttonLabel="ADD SKATER" 
                icon={<Swords className="w-4 h-4 mr-2" />}
              />
              
              <div className="mt-6 flex-1 border-t-[3px] border-mac-black pt-4">
                <h4 className="font-display uppercase mb-4">Roster ({contestants.length})</h4>
                <div className="space-y-2">
                  {contestants.map((c, i) => (
                    <div key={i} className="flex justify-between items-center border-[3px] border-mac-black p-2 bg-mac-black/5">
                      <div className="flex items-center space-x-2">
                        <Bot className="w-5 h-5" />
                        <span className="font-bold">{c.modelName}</span>
                      </div>
                      <button type="button" onClick={() => setContestants(contestants.filter((_, idx) => idx !== i))} className="text-xl font-bold px-2 hover:bg-mac-black hover:text-mac-white">&times;</button>
                    </div>
                  ))}
                  {contestants.length === 0 && <div className="text-center p-4 border-2 border-dashed border-mac-black">NO CONTESTANTS</div>}
                </div>
              </div>
            </div>
          </RetroWindow>

          {/* Judges */}
          <RetroWindow title="JUDGING PANEL">
            <div className="flex flex-col h-full">
              <ModelSelector 
                onAdd={(m) => { if (judges.length < 5) setJudges([...judges, m]); }} 
                buttonLabel={judges.length >= 5 ? "MAX 5 JUDGES" : "ADD JUDGE"} 
                icon={<Gavel className="w-4 h-4 mr-2" />}
                disabled={judges.length >= 5}
              />
              
              <div className="mt-6 flex-1 border-t-[3px] border-mac-black pt-4">
                <h4 className="font-display uppercase mb-4">Panel ({judges.length})</h4>
                <div className="space-y-2">
                  {judges.map((c, i) => (
                    <div key={i} className="flex justify-between items-center border-[3px] border-mac-black p-2 bg-mac-black/5">
                      <div className="flex items-center space-x-2">
                        <Bot className="w-5 h-5" />
                        <span className="font-bold">{c.modelName}</span>
                      </div>
                      <button type="button" onClick={() => setJudges(judges.filter((_, idx) => idx !== i))} className="text-xl font-bold px-2 hover:bg-mac-black hover:text-mac-white">&times;</button>
                    </div>
                  ))}
                  {judges.length === 0 && <div className="text-center p-4 border-2 border-dashed border-mac-black">NO JUDGES (3–5 REQUIRED)</div>}
                </div>
              </div>
            </div>
          </RetroWindow>
        </div>

        <div className="flex justify-center pt-8">
          <RetroButton type="submit" size="lg" disabled={createMutation.isPending} className="text-2xl px-12 py-6">
            {createMutation.isPending ? "INITIALIZING..." : "START CHAMPIONSHIP"}
          </RetroButton>
        </div>
      </form>
    </div>
  );
}

function ModelSelector({ onAdd, buttonLabel, icon, disabled }: { onAdd: (m: ModelSelection) => void, buttonLabel: string, icon: React.ReactNode, disabled?: boolean }) {
  const { data: gateways } = useListGateways();
  const { data: configuredModels } = useListConfiguredModels();
  const [mode, setMode] = useState<"configured" | "manual">("configured");
  const [configuredModelId, setConfiguredModelId] = useState("");
  const [gatewayId, setGatewayId] = useState("");
  const [modelId, setModelId] = useState("");
  const [modelName, setModelName] = useState("");
  
  const gwId = Number(gatewayId) || 0;
  const { data: models } = useListGatewayModels(gwId, { query: { queryKey: getListGatewayModelsQueryKey(gwId), enabled: !!gatewayId }});

  const handleAdd = () => {
    if (mode === "configured") {
      if (!configuredModelId) return;
      const cm = configuredModels?.find(m => m.id === Number(configuredModelId));
      if (!cm) return;
      onAdd({
        gatewayId: cm.gatewayId,
        modelId: cm.modelId,
        modelName: cm.name,
      });
      setConfiguredModelId("");
    } else {
      if (!gatewayId || !modelId) return;
      const selected = models?.find(m => m.id === modelId);
      onAdd({
        gatewayId: Number(gatewayId),
        modelId,
        modelName: modelName.trim() || selected?.name || modelId,
      });
      setModelId("");
      setModelName("");
    }
  };

  const hasConfiguredModels = (configuredModels?.length ?? 0) > 0;

  return (
    <div className="space-y-4">
      {hasConfiguredModels && (
        <div className="flex space-x-2">
          <RetroButton type="button" size="sm" variant={mode === "configured" ? "primary" : "secondary"} onClick={() => setMode("configured")}>
            SAVED MODELS
          </RetroButton>
          <RetroButton type="button" size="sm" variant={mode === "manual" ? "primary" : "secondary"} onClick={() => setMode("manual")}>
            MANUAL
          </RetroButton>
        </div>
      )}

      {mode === "configured" && hasConfiguredModels ? (
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 items-end">
          <RetroFormField label="Configured Model" className="sm:col-span-4">
            <RetroSelect value={configuredModelId} onChange={e => setConfiguredModelId(e.target.value)}>
              <option value="">-- SELECT MODEL --</option>
              {configuredModels?.map(m => {
                const gw = gateways?.find(g => g.id === m.gatewayId);
                return <option key={m.id} value={m.id}>{m.name} ({gw?.name ?? `GW #${m.gatewayId}`})</option>;
              })}
            </RetroSelect>
          </RetroFormField>
          <div className="sm:col-span-1">
            <RetroButton type="button" onClick={handleAdd} className="w-full flex items-center justify-center p-2" disabled={!configuredModelId || disabled}>
              {icon} ADD
            </RetroButton>
          </div>
        </div>
      ) : (
        <div>
          <div className="grid grid-cols-1 sm:grid-cols-7 gap-4 items-end">
            <RetroFormField label="Gateway" className="sm:col-span-2">
              <RetroSelect value={gatewayId} onChange={e => setGatewayId(e.target.value)}>
                <option value="">- SELECT -</option>
                {gateways?.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </RetroSelect>
            </RetroFormField>
            <RetroFormField label="Model (List)" className="sm:col-span-2">
              <RetroCombobox
                options={models?.map(m => ({ value: m.id, label: m.name })) ?? []}
                value={models?.some((m) => m.id === modelId) ? modelId : ""}
                onChange={(id) => {
                  setModelId(id);
                  const selected = models?.find((m) => m.id === id);
                  if (selected) setModelName(selected.name);
                }}
                disabled={!gatewayId || !models?.length}
                placeholder="- OPTIONAL -"
              />
            </RetroFormField>
            <RetroFormField label="Model Identifier" className="sm:col-span-2">
              <RetroInput
                value={modelId}
                onChange={e => setModelId(e.target.value)}
                placeholder="z. B. openai/gpt-4o-mini"
                disabled={!gatewayId}
              />
            </RetroFormField>
            <div className="sm:col-span-1">
              <RetroButton type="button" onClick={handleAdd} className="w-full flex items-center justify-center p-2" disabled={!modelId || disabled}>
                {icon} ADD
              </RetroButton>
            </div>
            <RetroFormField label="Display Name (optional)" className="sm:col-span-7">
              <RetroInput
                value={modelName}
                onChange={e => setModelName(e.target.value)}
                placeholder="Falls leer, wird Name aus Liste oder Identifier genutzt"
                disabled={!gatewayId}
              />
            </RetroFormField>
          </div>
        </div>
      )}
    </div>
  );
}
