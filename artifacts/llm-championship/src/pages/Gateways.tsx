import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { 
  useListGateways, 
  useCreateGateway, 
  useDeleteGateway,
  getListGatewaysQueryKey,
  useListGatewayModels,
  getListGatewayModelsQueryKey,
  useListConfiguredModels,
  useCreateConfiguredModel,
  useDeleteConfiguredModel,
  getListConfiguredModelsQueryKey,
} from "@workspace/api-client-react";
import { RetroWindow, RetroButton, RetroInput, RetroBadge, RetroSelect, RetroFormField } from "@/components/retro";
import { Server, Trash2, Bot } from "lucide-react";
import type { CreateGatewayType } from "@workspace/api-client-react";
import { useVault } from "@/lib/vault/vault-store";

function getDefaultBaseUrl(type: CreateGatewayType): string {
  if (type === "openrouter") return "https://openrouter.ai/api/v1";
  if (type === "github_copilot") return "https://models.inference.ai.azure.com";
  return "";
}

export default function Gateways() {
  const queryClient = useQueryClient();
  const { addGateway, removeGateway } = useVault();
  const { data: gateways, isLoading } = useListGateways();
  const deleteMutation = useDeleteGateway();
  const createMutation = useCreateGateway();

  // Configured Models state
  const { data: configuredModels, isLoading: modelsLoading } = useListConfiguredModels();
  const createModelMutation = useCreateConfiguredModel();
  const deleteModelMutation = useDeleteConfiguredModel();
  const [selectedGatewayId, setSelectedGatewayId] = useState("");
  const [selectedModelId, setSelectedModelId] = useState("");
  const [modelDisplayName, setModelDisplayName] = useState("");

  const gwId = Number(selectedGatewayId) || 0;
  const { data: gatewayModels } = useListGatewayModels(gwId, { query: { queryKey: getListGatewayModelsQueryKey(gwId), enabled: !!selectedGatewayId }});

  const [name, setName] = useState("");
  const [type, setType] = useState<CreateGatewayType>("openrouter");
  const [baseUrl, setBaseUrl] = useState("");
  const [apiKey, setApiKey] = useState("");

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const resolvedBaseUrl = baseUrl.trim() || getDefaultBaseUrl(type);
    if (!resolvedBaseUrl) {
      alert("Base URL is required for custom gateways.");
      return;
    }

    const result = await createMutation.mutateAsync({ data: { name, type, baseUrl: resolvedBaseUrl, apiKey } });
    addGateway({ id: result.id, name, type, baseUrl: resolvedBaseUrl, apiKey });
    queryClient.invalidateQueries({ queryKey: getListGatewaysQueryKey() });
    setName(""); setBaseUrl(""); setApiKey("");
  };

  const handleDelete = async (id: number) => {
    if (confirm("SEVER CONNECTION?")) {
      await deleteMutation.mutateAsync({ id });
      removeGateway(id);
      queryClient.invalidateQueries({ queryKey: getListGatewaysQueryKey() });
    }
  };

  const handleSaveModel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGatewayId || !selectedModelId) return;
    const selected = gatewayModels?.find(m => m.id === selectedModelId);
    const displayName = modelDisplayName.trim() || selected?.name || selectedModelId;
    await createModelMutation.mutateAsync({ data: { name: displayName, gatewayId: Number(selectedGatewayId), modelId: selectedModelId } });
    queryClient.invalidateQueries({ queryKey: getListConfiguredModelsQueryKey() });
    setSelectedModelId("");
    setModelDisplayName("");
  };

  const handleDeleteModel = async (id: number) => {
    if (confirm("REMOVE MODEL?")) {
      await deleteModelMutation.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: getListConfiguredModelsQueryKey() });
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      {/* Gateway Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <RetroWindow title="ACTIVE CONNECTIONS">
            {isLoading ? (
              <div className="p-8 text-center font-display text-xl animate-pulse">PINGING...</div>
            ) : !gateways?.length ? (
              <div className="p-8 text-center uppercase">NO GATEWAYS CONFIGURED.</div>
            ) : (
              <div className="space-y-4">
                {gateways.map(g => (
                  <div key={g.id} className="border-[3px] border-mac-black p-4 flex items-center justify-between hover:bg-mac-black/5 transition-colors">
                    <div className="flex items-center space-x-4">
                      <Server className="w-8 h-8" />
                      <div>
                        <h3 className="font-display text-xl font-bold uppercase">{g.name}</h3>
                        <div className="text-sm space-x-2">
                          <RetroBadge>{g.type}</RetroBadge>
                          <span className="text-mac-black/60">{g.baseUrl}</span>
                        </div>
                      </div>
                    </div>
                    <RetroButton size="sm" variant="danger" onClick={() => handleDelete(g.id)}>
                      <Trash2 className="w-4 h-4" />
                    </RetroButton>
                  </div>
                ))}
              </div>
            )}
          </RetroWindow>
        </div>

        <div className="lg:col-span-1">
          <RetroWindow title="ADD GATEWAY">
            <form onSubmit={handleCreate} className="space-y-4">
              <RetroFormField label="Identifier">
                <RetroInput required value={name} onChange={e => setName(e.target.value)} placeholder="Main OpenRouter" />
              </RetroFormField>
              <RetroFormField label="Protocol Type">
                <RetroSelect required value={type} onChange={e => setType(e.target.value as CreateGatewayType)}>
                  <option value="openrouter">OpenRouter</option>
                  <option value="github_copilot">GitHub Copilot</option>
                  <option value="custom">Custom (OpenAI-compat)</option>
                </RetroSelect>
              </RetroFormField>
              <RetroFormField label="Base URL">
                <RetroInput value={baseUrl} onChange={e => setBaseUrl(e.target.value)} placeholder={getDefaultBaseUrl(type) || "https://..."} />
              </RetroFormField>
              <RetroFormField label="Access Token">
                <RetroInput type="password" required value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="sk-..." />
              </RetroFormField>
              <div className="pt-4">
                <RetroButton type="submit" disabled={createMutation.isPending} className="w-full">
                  {createMutation.isPending ? "INITIALIZING..." : "ESTABLISH LINK"}
                </RetroButton>
              </div>
            </form>
          </RetroWindow>
        </div>
      </div>

      {/* Configured Models Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <RetroWindow title="CONFIGURED MODELS">
            {modelsLoading ? (
              <div className="p-8 text-center font-display text-xl animate-pulse">LOADING...</div>
            ) : !configuredModels?.length ? (
              <div className="p-8 text-center uppercase">NO MODELS CONFIGURED. ADD MODELS TO USE THEM IN COMPETITIONS.</div>
            ) : (
              <div className="space-y-4">
                {configuredModels.map(m => {
                  const gw = gateways?.find(g => g.id === m.gatewayId);
                  return (
                    <div key={m.id} className="border-[3px] border-mac-black p-4 flex items-center justify-between hover:bg-mac-black/5 transition-colors">
                      <div className="flex items-center space-x-4">
                        <Bot className="w-8 h-8" />
                        <div>
                          <h3 className="font-display text-xl font-bold uppercase">{m.name}</h3>
                          <div className="text-sm space-x-2">
                            <RetroBadge>{gw?.name ?? `GW #${m.gatewayId}`}</RetroBadge>
                            <span className="text-mac-black/60">{m.modelId}</span>
                          </div>
                        </div>
                      </div>
                      <RetroButton size="sm" variant="danger" onClick={() => handleDeleteModel(m.id)}>
                        <Trash2 className="w-4 h-4" />
                      </RetroButton>
                    </div>
                  );
                })}
              </div>
            )}
          </RetroWindow>
        </div>

        <div className="lg:col-span-1">
          <RetroWindow title="ADD MODEL">
            <form onSubmit={handleSaveModel} className="space-y-4">
              <RetroFormField label="Gateway">
                <RetroSelect required value={selectedGatewayId} onChange={e => { setSelectedGatewayId(e.target.value); setSelectedModelId(""); setModelDisplayName(""); }}>
                  <option value="">-- SELECT GATEWAY --</option>
                  {gateways?.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </RetroSelect>
              </RetroFormField>
              <RetroFormField label="Model (from List)">
                <RetroSelect
                  value={gatewayModels?.some(m => m.id === selectedModelId) ? selectedModelId : ""}
                  onChange={e => {
                    const id = e.target.value;
                    setSelectedModelId(id);
                    const sel = gatewayModels?.find(m => m.id === id);
                    if (sel) setModelDisplayName(sel.name);
                  }}
                  disabled={!selectedGatewayId || !gatewayModels?.length}
                >
                  <option value="">-- SELECT MODEL --</option>
                  {gatewayModels?.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </RetroSelect>
              </RetroFormField>
              <RetroFormField label="Model Identifier">
                <RetroInput
                  value={selectedModelId}
                  onChange={e => setSelectedModelId(e.target.value)}
                  placeholder="z. B. openai/gpt-4o-mini"
                  disabled={!selectedGatewayId}
                />
              </RetroFormField>
              <RetroFormField label="Display Name">
                <RetroInput
                  value={modelDisplayName}
                  onChange={e => setModelDisplayName(e.target.value)}
                  placeholder="Falls leer, wird Modellname genutzt"
                  disabled={!selectedGatewayId}
                />
              </RetroFormField>
              <div className="pt-4">
                <RetroButton type="submit" disabled={createModelMutation.isPending || !selectedModelId} className="w-full">
                  {createModelMutation.isPending ? "SAVING..." : "SAVE MODEL"}
                </RetroButton>
              </div>
            </form>
          </RetroWindow>
        </div>
      </div>
    </div>
  );
}
