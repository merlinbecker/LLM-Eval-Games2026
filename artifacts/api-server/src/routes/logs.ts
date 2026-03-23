import { Router, type IRouter } from "express";
import { store } from "@workspace/store";

const router: IRouter = Router();

router.get("/logs", (req, res) => {
  const logs = store.listLlmLogs(req.sessionId!);
  // Return newest first
  res.json([...logs].reverse());
});

router.delete("/logs", (req, res) => {
  store.clearLlmLogs(req.sessionId!);
  res.json({ message: "Logs cleared" });
});

export default router;
