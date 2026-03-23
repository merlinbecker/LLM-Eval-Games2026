import { Router, type IRouter } from "express";
import multer from "multer";
import { store } from "@workspace/store";
import type { Dataset } from "@workspace/store";
import {
  CreateDatasetBody,
  GetDatasetParams,
  DeleteDatasetParams,
  PrivacyCheckDatasetParams,
  PrivacyCheckDatasetBody,
  AnonymizeDatasetParams,
  AnonymizeDatasetBody,
  GenerateDatasetBody,
} from "@workspace/api-zod";
import { chatCompletion } from "../lib/llm-gateway";

const router: IRouter = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

function datasetToJson(d: Dataset) {
  return {
    id: d.id,
    name: d.name,
    content: d.content,
    systemPrompt: d.systemPrompt,
    privacyStatus: d.privacyStatus,
    privacyReport: d.privacyReport ?? null,
    createdAt: d.createdAt,
  };
}

router.get("/datasets", (req, res) => {
  const datasets = store.listDatasets(req.sessionId!);
  res.json(datasets.map(datasetToJson));
});

router.post("/datasets", (req, res) => {
  const data = CreateDatasetBody.parse(req.body);
  const dataset = store.createDataset(req.sessionId!, {
    name: data.name,
    content: data.content,
    systemPrompt: data.systemPrompt,
  });
  res.status(201).json(datasetToJson(dataset));
});

router.post("/datasets/upload", upload.single("file"), (req, res) => {
  const file = req.file;
  if (!file) {
    res.status(400).json({ message: "No file uploaded" });
    return;
  }

  const originalName = file.originalname ?? "upload.md";
  if (!originalName.endsWith(".md")) {
    res.status(400).json({ message: "Only .md (Markdown) files are accepted" });
    return;
  }

  const content = file.buffer.toString("utf-8");
  if (!content.trim()) {
    res.status(400).json({ message: "File is empty" });
    return;
  }

  const name = (req.body.name as string) || originalName.replace(/\.md$/, "");
  const systemPrompt = req.body.systemPrompt as string;
  if (!systemPrompt) {
    res.status(400).json({ message: "systemPrompt is required" });
    return;
  }

  const dataset = store.createDataset(req.sessionId!, { name, content, systemPrompt });
  res.status(201).json(datasetToJson(dataset));
});

router.get("/datasets/:id", (req, res) => {
  const { id } = GetDatasetParams.parse(req.params);
  const dataset = store.getDataset(req.sessionId!, id);
  if (!dataset) {
    res.status(404).json({ error: "Dataset not found" });
    return;
  }
  res.json(datasetToJson(dataset));
});

router.delete("/datasets/:id", (req, res) => {
  const { id } = DeleteDatasetParams.parse(req.params);
  store.deleteDataset(req.sessionId!, id);
  res.json({ message: "Dataset deleted" });
});

router.post("/datasets/:id/privacy-check", async (req, res) => {
  const { id } = PrivacyCheckDatasetParams.parse(req.params);
  const { gatewayId, modelId } = PrivacyCheckDatasetBody.parse(req.body);

  const dataset = store.getDataset(req.sessionId!, id);
  if (!dataset) {
    res.status(404).json({ error: "Dataset not found" });
    return;
  }

  const gateway = store.getGateway(req.sessionId!, gatewayId);
  if (!gateway) {
    res.status(404).json({ error: "Gateway not found" });
    return;
  }

  const result = await chatCompletion(
    { type: gateway.type, baseUrl: gateway.baseUrl, apiKey: gateway.apiKey },
    modelId,
    [
      {
        role: "system",
        content: `You are a data privacy analyst. Analyze the following text for personally identifiable information (PII), internal company data, or sensitive information that should not be used in public test datasets. 

Respond in JSON format with this structure:
{
  "status": "clean" or "issues_found",
  "findings": [
    { "type": "PII type (e.g. email, name, phone, company_internal)", "text": "the found text", "suggestion": "replacement suggestion" }
  ],
  "report": "summary of findings"
}

Only output the JSON, nothing else.`,
      },
      {
        role: "user",
        content: dataset.content,
      },
    ],
    req.sessionId,
  );

  let parsed;
  try {
    parsed = JSON.parse(result.content);
    if (!parsed.status || !Array.isArray(parsed.findings)) {
      throw new Error("Invalid response structure");
    }
  } catch {
    parsed = {
      status: "issues_found" as const,
      findings: [],
      report: `Analysis could not be completed. Raw output: ${result.content.slice(0, 500)}`,
    };
  }

  const status = parsed.status === "clean" ? "clean" : "issues_found";
  store.updateDataset(req.sessionId!, id, { privacyStatus: status, privacyReport: parsed.report });

  res.json({
    status: parsed.status,
    findings: parsed.findings ?? [],
    report: parsed.report ?? "No issues found.",
  });
});

router.post("/datasets/:id/anonymize", async (req, res) => {
  const { id } = AnonymizeDatasetParams.parse(req.params);
  const { gatewayId, modelId } = AnonymizeDatasetBody.parse(req.body);

  const dataset = store.getDataset(req.sessionId!, id);
  if (!dataset) {
    res.status(404).json({ error: "Dataset not found" });
    return;
  }

  const gateway = store.getGateway(req.sessionId!, gatewayId);
  if (!gateway) {
    res.status(404).json({ error: "Gateway not found" });
    return;
  }

  const result = await chatCompletion(
    { type: gateway.type, baseUrl: gateway.baseUrl, apiKey: gateway.apiKey },
    modelId,
    [
      {
        role: "system",
        content: `You are a data anonymization specialist. Replace all personally identifiable information (PII), company names, internal IDs, email addresses, phone numbers, and any other sensitive data in the following text with realistic but fictional placeholder values. Keep the same format and structure of the text. Output only the anonymized text, nothing else.`,
      },
      {
        role: "user",
        content: dataset.content,
      },
    ],
    req.sessionId,
  );

  const updated = store.updateDataset(req.sessionId!, id, { content: result.content, privacyStatus: "anonymized" });
  res.json(datasetToJson(updated!));
});

router.post("/datasets/generate", async (req, res) => {
  const data = GenerateDatasetBody.parse(req.body);

  const gateway = store.getGateway(req.sessionId!, data.gatewayId);
  if (!gateway) {
    res.status(404).json({ error: "Gateway not found" });
    return;
  }

  const result = await chatCompletion(
    { type: gateway.type, baseUrl: gateway.baseUrl, apiKey: gateway.apiKey },
    data.modelId,
    [
      {
        role: "system",
        content: `You are a test data generator. Generate ${data.numberOfItems} test items as a well-structured Markdown document for the topic: "${data.topic}".

Each test item should be a separate section with a heading (## Item N) containing a realistic prompt or question that could be given to an LLM using this system prompt: "${data.systemPrompt}".

Output only the Markdown document, nothing else.`,
      },
      {
        role: "user",
        content: `Generate ${data.numberOfItems} test items about: ${data.topic}`,
      },
    ],
    req.sessionId,
  );

  const dataset = store.createDataset(req.sessionId!, {
    name: data.name,
    content: result.content,
    systemPrompt: data.systemPrompt,
  });

  res.status(201).json(datasetToJson(dataset));
});

export default router;
