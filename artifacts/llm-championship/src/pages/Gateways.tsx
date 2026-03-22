import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { 
  useListGateways, 
  useCreateGateway, 
  useDeleteGateway,
  getListGatewaysQueryKey,
} from "@workspace/api-client-react";
import { RetroWindow, RetroButton, RetroInput, RetroBadge, RetroSelect } from "@/components/retro";
import { formatDate } from "@/lib/utils";
import { Server, Trash2 } from "lucide-react";
import type { CreateGatewayType } from "@workspace/api-client-react";
import { useVault } from "@/lib/vault/vault-store";

export default function Gateways() {
  const queryClient = useQueryClient();
  const { addGateway, removeGateway } = useVault();
  const { data: gateways, isLoading } = useListGateways();
  const deleteMutation = useDeleteGateway();
  const createMutation = useCreateGateway();

  const [name, setName] = useState("");
  const [type, setType] = useState<CreateGatewayType>("openrouter");
  const [baseUrl, setBaseUrl] = useState("");
  const [apiKey, setApiKey] = useState("");

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await createMutation.mutateAsync({ data: { name, type, baseUrl, apiKey } });
    addGateway({ id: result.id, name, type, baseUrl, apiKey });
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

  return (
    <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8 pb-12">
      
      <div className="lg:col-span-2 space-y-6">
        <RetroWindow title="ACTIVE CONNECTIONS">
          {isLoading ? (
            <div className="p-8 text-center font-display text-xl animate-pulse">PINGING...</div>
          ) : !gateways?.length ? (
            <div className="p-8 text-center uppercase">NO GATEWAYS CONFIGURED.</div>
          ) : (
            <div className="space-y-4">
              {gateways.map(g => (
                <div key={g.id} className="border-[3px] border-black p-4 flex items-center justify-between hover:bg-black/5 transition-colors">
                  <div className="flex items-center space-x-4">
                    <Server className="w-8 h-8" />
                    <div>
                      <h3 className="font-display text-xl font-bold uppercase">{g.name}</h3>
                      <div className="text-sm space-x-2">
                        <RetroBadge>{g.type}</RetroBadge>
                        <span className="text-black/60">{g.baseUrl}</span>
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
            <div>
              <label className="block font-display mb-1 uppercase text-sm">Identifier</label>
              <RetroInput required value={name} onChange={e => setName(e.target.value)} placeholder="Main OpenRouter" />
            </div>
            <div>
              <label className="block font-display mb-1 uppercase text-sm">Protocol Type</label>
              <RetroSelect required value={type} onChange={e => setType(e.target.value as CreateGatewayType)}>
                <option value="openrouter">OpenRouter</option>
                <option value="github_copilot">GitHub Copilot</option>
                <option value="custom">Custom (OpenAI-compat)</option>
              </RetroSelect>
            </div>
            <div>
              <label className="block font-display mb-1 uppercase text-sm">Base URL</label>
              <RetroInput required value={baseUrl} onChange={e => setBaseUrl(e.target.value)} placeholder="https://openrouter.ai/api/v1" />
            </div>
            <div>
              <label className="block font-display mb-1 uppercase text-sm">Access Token</label>
              <RetroInput type="password" required value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="sk-..." />
            </div>
            <div className="pt-4">
              <RetroButton type="submit" disabled={createMutation.isPending} className="w-full">
                {createMutation.isPending ? "INITIALIZING..." : "ESTABLISH LINK"}
              </RetroButton>
            </div>
          </form>
        </RetroWindow>
      </div>

    </div>
  );
}
