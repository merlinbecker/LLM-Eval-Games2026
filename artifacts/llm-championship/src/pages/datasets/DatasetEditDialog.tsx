import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getListDatasetsQueryKey,
  useGetDataset,
  useUpdateDataset,
} from "@workspace/api-client-react";
import {
  RetroButton,
  RetroFormField,
  RetroInput,
} from "@/components/retro";
import { parseDatasetItems } from "@/lib/utils";
import { useVault } from "@/lib/vault/vault-store";
import { joinDatasetMarkdownItems } from "@workspace/store/dataset-markdown";
import { Plus, Trash2 } from "lucide-react";
import { toVaultDataset } from "./dataset-utils";

export function DatasetEditDialog({
  datasetId,
  onClose,
}: {
  datasetId: number;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const { updateDataset: updateVaultDataset } = useVault();
  const { data: dataset, isLoading } = useGetDataset(datasetId);
  const updateMutation = useUpdateDataset();
  const [editName, setEditName] = useState("");
  const [items, setItems] = useState<string[]>([]);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (!dataset || initialized) {
      return;
    }

    setEditName(dataset.name);
    setItems(parseDatasetItems(dataset.content));
    setInitialized(true);
  }, [dataset, initialized]);

  const handleItemChange = (index: number, value: string) => {
    setItems((prev) => prev.map((item, itemIndex) => (itemIndex === index ? value : item)));
  };

  const handleDeleteItem = (index: number) => {
    setItems((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
  };

  const handleAddItem = () => {
    setItems((prev) => [...prev, `## Item ${prev.length + 1}\n`]);
  };

  const handleSave = async () => {
    const content = joinDatasetMarkdownItems(items);
    const result = await updateMutation.mutateAsync({
      id: datasetId,
      data: { name: editName, content },
    });
    updateVaultDataset(toVaultDataset(result));
    queryClient.invalidateQueries({ queryKey: getListDatasetsQueryKey() });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-mac-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-mac-white border-[3px] border-mac-black w-full max-w-4xl max-h-[90vh] flex flex-col retro-shadow"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="bg-mac-black text-mac-white px-4 py-2 font-display uppercase flex items-center justify-between">
          <span>DATASET: {dataset?.name ?? "..."}</span>
          <button onClick={onClose} className="text-mac-white hover:opacity-70 font-display text-lg">
            ✕
          </button>
        </div>
        {isLoading ? (
          <div className="p-8 text-center font-display text-xl animate-pulse">LOADING...</div>
        ) : dataset ? (
          <div className="flex flex-col flex-1 overflow-hidden">
            <div className="p-4 border-b-[3px] border-mac-black">
              <RetroFormField label="Name">
                <RetroInput value={editName} onChange={(event) => setEditName(event.target.value)} />
              </RetroFormField>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-display text-sm uppercase tracking-widest">
                  {items.length} Item{items.length !== 1 ? "s" : ""}
                </span>
                <RetroButton size="sm" variant="secondary" onClick={handleAddItem}>
                  <Plus className="w-3 h-3 mr-1 inline" /> ITEM HINZUFÜGEN
                </RetroButton>
              </div>

              {items.map((item, index) => (
                <div key={index} className="border-[3px] border-mac-black bg-mac-white">
                  <div className="flex items-center justify-between px-3 py-1.5 bg-mac-black/5 border-b-[2px] border-mac-black">
                    <span className="font-display text-xs uppercase tracking-wider">
                      Item {index + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDeleteItem(index)}
                      className="text-mac-black hover:bg-mac-black hover:text-mac-white px-2 py-0.5 border-[2px] border-mac-black text-xs font-display uppercase transition-colors"
                      title="Item löschen"
                    >
                      <Trash2 className="w-3 h-3 inline mr-1" />LÖSCHEN
                    </button>
                  </div>
                  <textarea
                    rows={Math.max(3, item.split("\n").length + 1)}
                    value={item}
                    onChange={(event) => handleItemChange(index, event.target.value)}
                    className="w-full px-3 py-2 bg-mac-white text-mac-black font-mono text-sm focus:outline-none focus:ring-4 focus:ring-mac-black/20 resize-y border-0"
                  />
                </div>
              ))}

              {items.length === 0 && (
                <div className="text-center py-8 text-mac-black/40 font-display uppercase">
                  Keine Items vorhanden
                </div>
              )}
            </div>

            <div className="p-4 border-t-[3px] border-mac-black flex space-x-3">
              <RetroButton className="flex-1" onClick={handleSave} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "SAVING..." : "SAVE CHANGES"}
              </RetroButton>
              <RetroButton variant="secondary" onClick={onClose}>
                CANCEL
              </RetroButton>
            </div>
          </div>
        ) : (
          <div className="p-4 text-center">DATASET NOT FOUND.</div>
        )}
      </div>
    </div>
  );
}