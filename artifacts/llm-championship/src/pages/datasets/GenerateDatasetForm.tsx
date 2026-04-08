import { useState, type FormEvent } from "react";
import {
  useGenerateDataset,
  useListConfiguredModels,
  useListGateways,
} from "@workspace/api-client-react";
import {
  RetroButton,
  RetroFormField,
  RetroInput,
  RetroSelect,
  RetroTextarea,
  RetroWindow,
} from "@/components/retro";
import { BrainCircuit } from "lucide-react";

export function GenerateDatasetForm({ onSuccess }: { onSuccess: () => void }) {
  const mutation = useGenerateDataset();
  const { data: gateways } = useListGateways();
  const { data: configuredModels } = useListConfiguredModels();
  const [name, setName] = useState("");
  const [topic, setTopic] = useState("");
  const [examples, setExamples] = useState("");
  const [count, setCount] = useState(5);
  const [configuredModelId, setConfiguredModelId] = useState("");

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const configuredModel = configuredModels?.find(
      (model) => model.id === Number(configuredModelId),
    );
    if (!configuredModel) {
      return;
    }

    await mutation.mutateAsync({
      data: {
        name,
        topic,
        numberOfItems: count,
        ...(examples.trim() ? { examples: examples.trim() } : {}),
        gatewayId: configuredModel.gatewayId,
        modelId: configuredModel.modelId,
      },
    });
    onSuccess();
  };

  return (
    <RetroWindow title="AI GENERATOR">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-2 gap-6">
          <RetroFormField label="Dataset Name">
            <RetroInput required value={name} onChange={(event) => setName(event.target.value)} />
          </RetroFormField>
          <RetroFormField label="Item Count">
            <RetroInput
              type="number"
              required
              min="1"
              max="50"
              value={count}
              onChange={(event) => setCount(Number(event.target.value))}
            />
          </RetroFormField>
        </div>

        <RetroFormField label="Description">
          <RetroTextarea
            required
            rows={2}
            value={topic}
            onChange={(event) => setTopic(event.target.value)}
            placeholder="Describe the data to generate, e.g.: Math word problems for grade school students"
          />
        </RetroFormField>

        <RetroFormField label="Examples (optional)">
          <RetroTextarea
            rows={6}
            value={examples}
            onChange={(event) => setExamples(event.target.value)}
            placeholder={"Provide example items to guide style and format, e.g.:\n\n## Item 1\nA train travels 120 km in 2 hours. What is its average speed?\n\n## Item 2\nIf a rectangle has a width of 5 cm and a length of 12 cm, what is the area?"}
            className="font-mono text-sm"
          />
        </RetroFormField>

        <div className="border-[3px] border-mac-black p-4 bg-dither">
          <div className="bg-mac-white p-4 text-mac-black border-[3px] border-mac-black">
            <h4 className="font-display flex items-center mb-4">
              <BrainCircuit className="w-5 h-5 mr-2" />
              Generator Model Config
            </h4>
            <RetroFormField label="Configured Model">
              <RetroSelect
                required
                value={configuredModelId}
                onChange={(event) => setConfiguredModelId(event.target.value)}
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
          </div>
        </div>

        <RetroButton type="submit" disabled={mutation.isPending} size="lg" className="w-full">
          {mutation.isPending ? "STARTING..." : "GENERATE DATASET"}
        </RetroButton>
      </form>
    </RetroWindow>
  );
}