import { Router, type IRouter } from "express";
import { store } from "@workspace/store";
import {
  CreateGatewayBody,
  DeleteGatewayParams,
  ListGatewayModelsParams,
} from "@workspace/api-zod";
import { listModelsFromGateway } from "../lib/llm-gateway";

const router: IRouter = Router();

router.get("/gateways", (req, res) => {
  const gateways = store.listGateways(req.sessionId!);
  const safe = gateways.map((g) => ({
    id: g.id,
    name: g.name,
    type: g.type,
    baseUrl: g.baseUrl,
    createdAt: g.createdAt,
  }));
  res.json(safe);
});

router.post("/gateways", (req, res) => {
  const data = CreateGatewayBody.parse(req.body);
  const gateway = store.createGateway(req.sessionId!, {
    name: data.name,
    type: data.type,
    baseUrl: data.baseUrl,
    apiKey: data.apiKey,
  });
  res.status(201).json({
    id: gateway.id,
    name: gateway.name,
    type: gateway.type,
    baseUrl: gateway.baseUrl,
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

  const models = await listModelsFromGateway({
    type: gateway.type,
    baseUrl: gateway.baseUrl,
    apiKey: gateway.apiKey,
  });

  res.json(
    models.map((m) => ({
      id: m.id,
      name: m.name,
      gatewayId: gateway.id,
      gatewayName: gateway.name,
    })),
  );
});

export default router;
