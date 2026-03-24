import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

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
