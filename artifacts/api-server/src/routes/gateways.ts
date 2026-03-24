import { Router, type IRouter } from "express";
import { store } from "@workspace/store";
import {
  CreateGatewayBody,
  DeleteGatewayParams,
  ListGatewayModelsParams,
  CreateConfiguredModelBody,
  DeleteConfiguredModelParams,
  UpdateConfiguredModelBody,
} from "@workspace/api-zod";
import { listModelsFromGateway, getDefaultBase, chatCompletion } from "../lib/llm-gateway";

const router: IRouter = Router();

function resolveGatewayBaseUrl(type: string, baseUrl: string): string {
  return baseUrl.trim() || getDefaultBase(type);
}

router.get("/gateways", (req, res) => {
  const gateways = store.listGateways(req.sessionId!);
  const safe = gateways.map((g) => ({
    id: g.id,
    name: g.name,
    type: g.type,
    baseUrl: g.baseUrl,
    customHeaders: g.customHeaders,
    createdAt: g.createdAt,
  }));
  res.json(safe);
});

router.post("/gateways", (req, res) => {
  const data = CreateGatewayBody.parse(req.body);
  const baseUrl = resolveGatewayBaseUrl(data.type, data.baseUrl);
  if (!baseUrl) {
    res.status(400).json({ error: "Base URL is required for custom gateways" });
    return;
  }
  const gateway = store.createGateway(req.sessionId!, {
    name: data.name,
    type: data.type,
    baseUrl,
    apiKey: data.apiKey,
    customHeaders: data.customHeaders,
  });
  res.status(201).json({
    id: gateway.id,
    name: gateway.name,
    type: gateway.type,
    baseUrl: gateway.baseUrl,
    customHeaders: gateway.customHeaders,
    createdAt: gateway.createdAt,
  });
});

router.delete("/gateways/:id", (req, res) => {
  const { id } = DeleteGatewayParams.parse(req.params);
  store.deleteGateway(req.sessionId!, id);
  res.json({ message: "Gateway deleted" });
});

router.get("/gateways/:id/models", async (req, res) => {
  const { id } = ListGatewayModelsParams.parse(req.params);
  const gateway = store.getGateway(req.sessionId!, id);

  if (!gateway) {
    res.status(404).json({ error: "Gateway not found" });
    return;
  }

  let models: Array<{ id: string; name: string }> = [];
  try {
    models = await listModelsFromGateway({
      type: gateway.type,
      baseUrl: gateway.baseUrl,
      apiKey: gateway.apiKey,
      customHeaders: gateway.customHeaders,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to list models";
    res.status(400).json({ error: message });
    return;
  }

  res.json(
    models.map((m) => ({
      id: m.id,
      name: m.name,
      gatewayId: gateway.id,
      gatewayName: gateway.name,
    })),
  );
});

// --- Configured Models ---

router.get("/configured-models", (req, res) => {
  const models = store.listConfiguredModels(req.sessionId!);
  res.json(models);
});

router.post("/configured-models", (req, res) => {
  const data = CreateConfiguredModelBody.parse(req.body);

  // Validate that the gateway exists
  const gateway = store.getGateway(req.sessionId!, data.gatewayId);
  if (!gateway) {
    res.status(400).json({ error: "Gateway not found" });
    return;
  }

  const model = store.createConfiguredModel(req.sessionId!, {
    name: data.name,
    gatewayId: data.gatewayId,
    modelId: data.modelId,
    inputCostPerMillionTokens: data.inputCostPerMillionTokens,
    outputCostPerMillionTokens: data.outputCostPerMillionTokens,
  });
  res.status(201).json(model);
});

router.put("/configured-models/:id", (req, res) => {
  const { id } = DeleteConfiguredModelParams.parse(req.params);
  const data = UpdateConfiguredModelBody.parse(req.body);
  const model = store.updateConfiguredModel(req.sessionId!, id, data);
  if (!model) {
    res.status(404).json({ error: "Configured model not found" });
    return;
  }
  res.json(model);
});

router.delete("/configured-models/:id", (req, res) => {
  const { id } = DeleteConfiguredModelParams.parse(req.params);
  store.deleteConfiguredModel(req.sessionId!, id);
  res.json({ message: "Configured model deleted" });
});

router.post("/configured-models/:id/test", async (req, res) => {
  const { id } = DeleteConfiguredModelParams.parse(req.params);
  const model = store.getConfiguredModel(req.sessionId!, id);
  if (!model) {
    res.status(404).json({ error: "Configured model not found" });
    return;
  }
  const gateway = store.getGateway(req.sessionId!, model.gatewayId);
  if (!gateway) {
    res.status(400).json({ success: false, response: "Gateway not found", durationMs: 0 });
    return;
  }

  try {
    const result = await chatCompletion(
      {
        type: gateway.type,
        baseUrl: gateway.baseUrl,
        apiKey: gateway.apiKey,
        customHeaders: gateway.customHeaders,
      },
      model.modelId,
      [{ role: "user", content: "Say hello in one sentence." }],
      req.sessionId,
    );
    res.json({
      success: true,
      response: result.content,
      durationMs: result.durationMs,
      promptTokens: result.promptTokens,
      completionTokens: result.completionTokens,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(400).json({ success: false, response: message, durationMs: 0 });
  }
});

export default router;
