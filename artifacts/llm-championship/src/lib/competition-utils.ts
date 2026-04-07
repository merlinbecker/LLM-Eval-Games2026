import type { JudgeScore, CompetitionResult } from "@workspace/api-client-react";

/** Average judge score across all judge entries. Returns 0 if the array is empty. */
export function computeAvgScore(judgeScores: JudgeScore[]): number {
  if (judgeScores.length === 0) return 0;
  return judgeScores.reduce((s, js) => s + js.score, 0) / judgeScores.length;
}

/** Sort competition results by avgQuality descending (highest quality first). */
export function sortByQuality<T extends { avgQuality: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => b.avgQuality - a.avgQuality);
}

/**
 * Parse the total item count from a progress string of the form "ModelName: item X/Y".
 * Returns null if the format doesn't match or the total cannot be determined.
 */
export function parseProgressTotal(progress: string): number | null {
  const match = progress.match(/(\d+)\/(\d+)/);
  if (!match) return null;
  const total = parseInt(match[2], 10);
  return Number.isNaN(total) || total <= 0 ? null : total;
}

/** Filter competition results to only those that have a scored judge evaluation (avgQuality > 0). */
export function filterWithScore<T extends { avgQuality: number }>(items: T[]): T[] {
  return items.filter((r) => r.avgQuality > 0);
}
