import type { Response } from "express";

/** Send a 404 JSON response and return false (use `if (!notFound(...)) return;` for early exit). */
export function notFound(res: Response, entity: string): void {
  res.status(404).json({ error: `${entity} not found` });
}
