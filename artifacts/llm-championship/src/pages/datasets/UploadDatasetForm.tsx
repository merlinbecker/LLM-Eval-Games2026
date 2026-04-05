import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getListDatasetsQueryKey,
  useCreateDataset,
  useUploadDataset,
} from "@workspace/api-client-react";
import {
  RetroButton,
  RetroFormField,
  RetroInput,
  RetroTextarea,
  RetroWindow,
} from "@/components/retro";
import { useVault } from "@/lib/vault/vault-store";
import { FileText } from "lucide-react";
import { toVaultDataset } from "./dataset-utils";

export function UploadDatasetForm({ onSuccess }: { onSuccess: () => void }) {
  const queryClient = useQueryClient();
  const { addDataset } = useVault();
  const createMutation = useCreateDataset();
  const uploadMutation = useUploadDataset();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [inputMode, setInputMode] = useState<"file" | "text">("file");

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (!file.name.endsWith(".md")) {
      alert("ONLY .MD FILES ACCEPTED");
      return;
    }

    setSelectedFile(file);
    if (!name) {
      setName(file.name.replace(/\.md$/, ""));
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    const result = inputMode === "file" && selectedFile
      ? await uploadMutation.mutateAsync({ data: { file: selectedFile as Blob, name } })
      : await createMutation.mutateAsync({ data: { name, content } });

    addDataset(toVaultDataset(result));
    queryClient.invalidateQueries({ queryKey: getListDatasetsQueryKey() });
    onSuccess();
  };

  const isPending = createMutation.isPending || uploadMutation.isPending;

  return (
    <RetroWindow title="UPLOAD MARKDOWN">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex space-x-4 mb-4">
          <RetroButton
            type="button"
            variant={inputMode === "file" ? "primary" : "secondary"}
            size="sm"
            onClick={() => setInputMode("file")}
          >
            UPLOAD .MD FILE
          </RetroButton>
          <RetroButton
            type="button"
            variant={inputMode === "text" ? "primary" : "secondary"}
            size="sm"
            onClick={() => setInputMode("text")}
          >
            PASTE TEXT
          </RetroButton>
        </div>
        <RetroFormField label="Dataset Name">
          <RetroInput
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g., Math Riddles"
          />
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
            <RetroTextarea
              required
              rows={10}
              value={content}
              onChange={(event) => setContent(event.target.value)}
              placeholder="## Question 1\n...\n\n## Question 2..."
              className="font-mono text-base"
            />
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