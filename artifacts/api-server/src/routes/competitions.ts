import { Router, type IRouter } from "express";
import { store } from "@workspace/store";
import type { Competition } from "@workspace/store";
import {
  CreateCompetitionBody,
  GetCompetitionParams,
  DeleteCompetitionParams,
  RunCompetitionParams,
} from "@workspace/api-zod";
import { logger } from "../lib/logger";
import { runCompetition } from "../services/competition-runner";

const router: IRouter = Router();

function competitionToJson(c: Competition) {
  return {
    id: c.id,
    name: c.name,
    datasetId: c.datasetId,
    systemPrompt: c.systemPrompt,
    status: c.status,
    contestantModels: c.contestantModels,
    judgeModels: c.judgeModels,
    results: c.results ?? [],
    createdAt: c.createdAt,
  };
}

router.get("/competitions", (req, res) => {
  const competitions = store.listCompetitions(req.sessionId!);
  res.json(
    competitions.map((c) => ({
      id: c.id,
      name: c.name,
      datasetId: c.datasetId,
      status: c.status,
      createdAt: c.createdAt,
    })),
  );
});

router.post("/competitions", (req, res) => {
  const data = CreateCompetitionBody.parse(req.body);
  if (data.judgeModels.length < 3 || data.judgeModels.length > 5) {
    res.status(400).json({ error: "Judge panel must have 3–5 models" });
    return;
  }
  const competition = store.createCompetition(req.sessionId!, {
    name: data.name,
    datasetId: data.datasetId,
    systemPrompt: data.systemPrompt,
    contestantModels: data.contestantModels,
    judgeModels: data.judgeModels,
  });
  res.status(201).json(competitionToJson(competition));
});

router.get("/competitions/:id", (req, res) => {
  const { id } = GetCompetitionParams.parse(req.params);
  const competition = store.getCompetition(req.sessionId!, id);
  if (!competition) {
    res.status(404).json({ error: "Competition not found" });
    return;
  }
  res.json(competitionToJson(competition));
});

router.delete("/competitions/:id", (req, res) => {
  const { id } = DeleteCompetitionParams.parse(req.params);
  store.deleteCompetition(req.sessionId!, id);
  res.json({ message: "Competition deleted" });
});

router.post("/competitions/:id/run", (req, res) => {
  const { id } = RunCompetitionParams.parse(req.params);
  const sessionId = req.sessionId!;

  const competition = store.getCompetition(sessionId, id);
  if (!competition) {
    res.status(404).json({ error: "Competition not found" });
    return;
  }
  if (competition.status === "running") {
    res.status(409).json({ error: "Competition is already running" });
    return;
  }

  const dataset = store.getDataset(sessionId, competition.datasetId);
  if (!dataset) {
    res.status(404).json({ error: "Dataset not found" });
    return;
  }

  const activity = store.createActivity(sessionId, {
    type: "competition_run",
    title: `Run: ${competition.name}`,
  });

  const running = store.updateCompetition(sessionId, id, { status: "running", results: [] });
  res.json({ ...competitionToJson(running!), activityId: activity.id });

  runCompetition(sessionId, id, competition, dataset, activity.id).catch((err) => {
    logger.error({ err, competitionId: id }, "Competition run failed");
    store.updateCompetition(sessionId, id, { status: "error" });
    store.updateActivity(sessionId, activity.id, {
      status: "error",
      error: (err as Error).message,
      completedAt: new Date().toISOString(),
    });
  });
});

export default router;
