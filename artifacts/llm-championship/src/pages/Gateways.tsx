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
import { RetroWindow, RetroButton, RetroInput, RetroBadge, RetroSelect, RetroCombobox, RetroFormField } from "@/components/retro";
import { Server, Trash2, Bot, Plus, X } from "lucide-react";
import type { CreateGatewayType } from "@workspace/api-client-react";
import { useVault } from "@/lib/vault/vault-store";

function isCustomType(type: string): boolean {
  return type === "custom" || type === "custom_openai" || type === "custom_anthropic" || type === "custom_gemini";
}

function getDefaultBaseUrl(type: CreateGatewayType): string {
  if (type === "openrouter") return "https://openrouter.ai/api/v1";
  if (type === "github_copilot") return "https://models.inference.ai.azure.com";
  return "";
}

function getBaseUrlPlaceholder(type: CreateGatewayType): string {
  if (type === "custom_openai") return "https://api.example.com/openai/deployments/{model}/chat/completions?api-version=2024-10-21";
  if (type === "custom_anthropic") return "https://api.example.com/anthropic/model/{model}/converse";
  if (type === "custom_gemini") return "https://api.example.com/google/v1beta1/.../models/{model}:generateContent";
  if (type === "custom") return "https://...";
  return getDefaultBaseUrl(type) || "https://...";
}

function getTypeLabel(type: string): string {
  switch (type) {
    case "openrouter": return "OpenRouter";
    case "github_copilot": return "GitHub Copilot";
    case "custom_openai": return "Custom (OpenAI)";
    case "custom_anthropic": return "Custom (Anthropic)";
    case "custom_gemini": return "Custom (Gemini)";
    case "custom": return "Custom";
    default: return type;
  }
}

export default function Gateways() {
  const queryClient = useQueryClient();
  const { addGateway, removeGateway, addConfiguredModel, removeConfiguredModel } = useVault();
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
  const [inputCost, setInputCost] = useState("");
  const [outputCost, setOutputCost] = useState("");

  const gwId = Number(selectedGatewayId) || 0;
  const selectedGw = gateways?.find(g => g.id === gwId);
  const isSelectedGwCustom = selectedGw ? isCustomType(selectedGw.type) : false;
  const { data: gatewayModels } = useListGatewayModels(gwId, { query: { queryKey: getListGatewayModelsQueryKey(gwId), enabled: !!selectedGatewayId && !isSelectedGwCustom }});

  const [name, setName] = useState("");
  const [type, setType] = useState<CreateGatewayType>("openrouter");
  const [baseUrl, setBaseUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [customHeaders, setCustomHeaders] = useState<Array<{ key: string; value: string }>>([]);

  const addHeaderRow = () => setCustomHeaders(prev => [...prev, { key: "", value: "" }]);
  const removeHeaderRow = (index: number) => setCustomHeaders(prev => prev.filter((_, i) => i !== index));
  const updateHeaderRow = (index: number, field: "key" | "value", val: string) => {
    setCustomHeaders(prev => prev.map((h, i) => i === index ? { ...h, [field]: val } : h));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const resolvedBaseUrl = baseUrl.trim() || getDefaultBaseUrl(type);
    if (!resolvedBaseUrl) {
      alert("Base URL is required for custom gateways.");
      return;
    }

    // Build custom headers object from key-value pairs
    const headersObj: Record<string, string> = {};
    for (const h of customHeaders) {
      const k = h.key.trim();
      const v = h.value.trim();
      if (k && v) headersObj[k] = v;
    }
    const customHeadersPayload = Object.keys(headersObj).length > 0 ? headersObj : undefined;

    const result = await createMutation.mutateAsync({ data: { name, type, baseUrl: resolvedBaseUrl, apiKey, customHeaders: customHeadersPayload } });
    addGateway({ id: result.id, name, type, baseUrl: resolvedBaseUrl, apiKey, customHeaders: customHeadersPayload });
    queryClient.invalidateQueries({ queryKey: getListGatewaysQueryKey() });
    setName(""); setBaseUrl(""); setApiKey(""); setCustomHeaders([]);
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
    const parsedInputCost = inputCost.trim() ? Number(inputCost) : null;
    const parsedOutputCost = outputCost.trim() ? Number(outputCost) : null;
    const result = await createModelMutation.mutateAsync({ data: { 
      name: displayName, 
      gatewayId: Number(selectedGatewayId), 
      modelId: selectedModelId,
      inputCostPerMillionTokens: parsedInputCost,
      outputCostPerMillionTokens: parsedOutputCost,
    } });
    addConfiguredModel({
      id: result.id,
      name: displayName,
      gatewayId: Number(selectedGatewayId),
      modelId: selectedModelId,
      inputCostPerMillionTokens: parsedInputCost,
      outputCostPerMillionTokens: parsedOutputCost,
      createdAt: result.createdAt,
    });
    queryClient.invalidateQueries({ queryKey: getListConfiguredModelsQueryKey() });
    setSelectedModelId("");
    setModelDisplayName("");
    setInputCost("");
    setOutputCost("");
  };

  const handleDeleteModel = async (id: number) => {
    if (confirm("REMOVE MODEL?")) {
      await deleteModelMutation.mutateAsync({ id });
      removeConfiguredModel(id);
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
                          <RetroBadge>{getTypeLabel(g.type)}</RetroBadge>
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
                <RetroSelect required value={type} onChange={e => { setType(e.target.value as CreateGatewayType); setBaseUrl(""); setCustomHeaders([]); }}>
                  <option value="openrouter">OpenRouter</option>
                  <option value="github_copilot">GitHub Copilot</option>
                  <option value="custom_openai">Custom (OpenAI-kompatibel)</option>
                  <option value="custom_anthropic">Custom (Anthropic/Converse)</option>
                  <option value="custom_gemini">Custom (Gemini/generateContent)</option>
                </RetroSelect>
              </RetroFormField>
              <RetroFormField label={isCustomType(type) ? "Vollständige Endpunkt-URL" : "Base URL"}>
                <RetroInput 
                  required={isCustomType(type)} 
                  value={baseUrl} 
                  onChange={e => setBaseUrl(e.target.value)} 
                  placeholder={getBaseUrlPlaceholder(type)} 
                />
                {isCustomType(type) && (
                  <p className="text-xs text-mac-black/50 mt-1">
                    Nutze <code className="bg-mac-black/10 px-1">&#123;model&#125;</code> als Platzhalter für die Model-ID in der URL
                  </p>
                )}
              </RetroFormField>
              <RetroFormField label="Access Token">
                <RetroInput type="password" required value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="sk-..." />
              </RetroFormField>
              {isCustomType(type) && (
                <RetroFormField label="Custom HTTP Headers">
                  <div className="space-y-2">
                    {customHeaders.map((h, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <RetroInput
                          className="flex-1"
                          value={h.key}
                          onChange={e => updateHeaderRow(i, "key", e.target.value)}
                          placeholder="Header-Name (z.B. api-key)"
                        />
                        <RetroInput
                          className="flex-1"
                          value={h.value}
                          onChange={e => updateHeaderRow(i, "value", e.target.value)}
                          placeholder="Wert"
                        />
                        <RetroButton type="button" size="sm" variant="danger" onClick={() => removeHeaderRow(i)}>
                          <X className="w-3 h-3" />
                        </RetroButton>
                      </div>
                    ))}
                    <RetroButton type="button" size="sm" onClick={addHeaderRow} className="w-full">
                      <Plus className="w-3 h-3 mr-1 inline" /> Header hinzufügen
                    </RetroButton>
                  </div>
                </RetroFormField>
              )}
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
                          {(m.inputCostPerMillionTokens != null || m.outputCostPerMillionTokens != null) && (
                            <div className="text-xs text-mac-black/50 mt-1">
                              {m.inputCostPerMillionTokens != null && <span>Input: ${m.inputCostPerMillionTokens}/M </span>}
                              {m.outputCostPerMillionTokens != null && <span>Output: ${m.outputCostPerMillionTokens}/M</span>}
                            </div>
                          )}
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
                  {gateways?.map(g => <option key={g.id} value={g.id}>{g.name} ({getTypeLabel(g.type)})</option>)}
                </RetroSelect>
              </RetroFormField>
              {!isSelectedGwCustom && (
                <RetroFormField label="Model (from List)">
                  <RetroCombobox
                    options={gatewayModels?.map(m => ({ value: m.id, label: m.name })) ?? []}
                    value={gatewayModels?.some(m => m.id === selectedModelId) ? selectedModelId : ""}
                    onChange={(id) => {
                      setSelectedModelId(id);
                      const sel = gatewayModels?.find(m => m.id === id);
                      if (sel) setModelDisplayName(sel.name);
                    }}
                    disabled={!selectedGatewayId || !gatewayModels?.length}
                    placeholder="-- SELECT MODEL --"
                  />
                </RetroFormField>
              )}
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
              <div className="grid grid-cols-2 gap-4">
                <RetroFormField label="Input $/M Tokens">
                  <RetroInput
                    type="number"
                    step="any"
                    min="0"
                    value={inputCost}
                    onChange={e => setInputCost(e.target.value)}
                    placeholder="z. B. 3.00"
                    disabled={!selectedGatewayId}
                  />
                </RetroFormField>
                <RetroFormField label="Output $/M Tokens">
                  <RetroInput
                    type="number"
                    step="any"
                    min="0"
                    value={outputCost}
                    onChange={e => setOutputCost(e.target.value)}
                    placeholder="z. B. 15.00"
                    disabled={!selectedGatewayId}
                  />
                </RetroFormField>
              </div>
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
