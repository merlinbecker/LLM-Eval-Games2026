import { cn } from "@/lib/utils";

/** Trophy icon — 1-bit SVG */
export function TrophyIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={cn("inline-block", className)} aria-hidden>
      {/* cup */}
      <path d="M7 4h10v6a5 5 0 01-10 0V4z" stroke="currentColor" strokeWidth="2" />
      {/* handles */}
      <path d="M7 6H4a1 1 0 00-1 1v1a3 3 0 003 3h1" stroke="currentColor" strokeWidth="2" fill="none" />
      <path d="M17 6h3a1 1 0 011 1v1a3 3 0 01-3 3h-1" stroke="currentColor" strokeWidth="2" fill="none" />
      {/* stem */}
      <line x1="12" y1="15" x2="12" y2="19" stroke="currentColor" strokeWidth="2" />
      {/* base */}
      <rect x="8" y="19" width="8" height="2" fill="currentColor" />
    </svg>
  );
}
