import { Router, type IRouter } from "express";
import crypto from "node:crypto";
import { store } from "@workspace/store";
import type { Gateway, Dataset, ConfiguredModel } from "@workspace/store";

const router: IRouter = Router();

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "strict" as const,
  path: "/api",
  maxAge: 2 * 60 * 60 * 1000, // 2 hours
};

router.post("/session/sync", (req, res) => {
  const { gateways, datasets, configuredModels } = req.body as {
    gateways?: Gateway[];
    datasets?: Dataset[];
    configuredModels?: ConfiguredModel[];
  };

  let sessionId = req.cookies?.sessionId as string | undefined;

  if (!sessionId || !store.hasSession(sessionId)) {
    sessionId = crypto.randomUUID();
    store.createSession(sessionId);
  }

  if (Array.isArray(gateways)) {
    store.importGateways(sessionId, gateways);
  }
  if (Array.isArray(datasets)) {
    store.importDatasets(sessionId, datasets);
  }
  if (Array.isArray(configuredModels)) {
    store.importConfiguredModels(sessionId, configuredModels);
  }

  res.cookie("sessionId", sessionId, COOKIE_OPTIONS);
  res.json({
    sessionId,
    gatewayCount: store.listGateways(sessionId).length,
    datasetCount: store.listDatasets(sessionId).length,
  });
});

router.delete("/session", (req, res) => {
  const sessionId = req.cookies?.sessionId as string | undefined;
  if (sessionId) {
    store.deleteSession(sessionId);
  }
  res.clearCookie("sessionId", { path: "/api" });
  res.json({ message: "Session deleted" });
});

export default router;
