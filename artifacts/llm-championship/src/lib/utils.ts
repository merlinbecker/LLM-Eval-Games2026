import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { parseDatasetMarkdownItems } from "@workspace/store/dataset-markdown";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format a cost value in USD with cent precision (minimum $0.01 for non-zero costs). */
export function formatCost(cost: number): string {
  if (cost <= 0) return "$0.00";
  const rounded = Math.max(0.01, Math.round(cost * 100) / 100);
  return `$${rounded.toFixed(2)}`;
}

export function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Extract the short display name from a fully-qualified model name (e.g. "openai/gpt-4" → "gpt-4"). */
export function shortName(name: string): string {
  return name.split("/").pop() || name;
}

/** Format a duration in milliseconds to a human-readable string (e.g. 1500 → "1.5s", 800 → "800ms"). */
export function formatMs(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

/** Parse a Markdown document into individual items, split by `## ` headings or double-newline paragraphs. */
export function parseDatasetItems(content: string): string[] {
  return parseDatasetMarkdownItems(content);
}
