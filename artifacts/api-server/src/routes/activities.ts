import { Router, type IRouter } from "express";
import { store } from "@workspace/store";
import { notFound } from "../lib/route-utils";

const router: IRouter = Router();

function parseActivityId(id: string, res: Parameters<typeof notFound>[0]): number | null {
  const n = Number(id);
  if (Number.isNaN(n)) {
    res.status(400).json({ error: "Invalid activity ID" });
    return null;
  }
  return n;
}

router.get("/activities", (req, res) => {
  const activities = store.listActivities(req.sessionId!);
  res.json(activities);
});

router.get("/activities/:id", (req, res) => {
  const id = parseActivityId(req.params.id, res);
  if (id === null) return;
  const activity = store.getActivity(req.sessionId!, id);
  if (!activity) { notFound(res, "Activity"); return; }
  res.json(activity);
});

router.post("/activities/:id/ack", (req, res) => {
  const id = parseActivityId(req.params.id, res);
  if (id === null) return;
  const activity = store.acknowledgeActivity(req.sessionId!, id);
  if (!activity) { notFound(res, "Activity"); return; }
  res.json(activity);
});

export default router;
