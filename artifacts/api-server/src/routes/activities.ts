import { Router, type IRouter } from "express";
import { store } from "@workspace/store";

const router: IRouter = Router();

router.get("/activities", (req, res) => {
  const activities = store.listActivities(req.sessionId!);
  res.json(activities);
});

router.get("/activities/:id", (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid activity ID" });
    return;
  }
  const activity = store.getActivity(req.sessionId!, id);
  if (!activity) {
    res.status(404).json({ error: "Activity not found" });
    return;
  }
  res.json(activity);
});

router.post("/activities/:id/ack", (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid activity ID" });
    return;
  }
  const activity = store.acknowledgeActivity(req.sessionId!, id);
  if (!activity) {
    res.status(404).json({ error: "Activity not found" });
    return;
  }
  res.json(activity);
});

export default router;
