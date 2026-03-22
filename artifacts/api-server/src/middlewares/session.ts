import type { Request, Response, NextFunction } from "express";
import { store } from "@workspace/store";

declare global {
  namespace Express {
    interface Request {
      sessionId?: string;
    }
  }
}

const PUBLIC_PATHS = new Set(["/healthz", "/session/sync"]);

export function sessionMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (PUBLIC_PATHS.has(req.path)) {
    return next();
  }

  const sessionId = req.cookies?.sessionId as string | undefined;

  if (!sessionId || !store.hasSession(sessionId)) {
    res.status(401).json({ error: "No active session. Sync vault first." });
    return;
  }

  req.sessionId = sessionId;
  store.touchSession(sessionId);
  next();
}
