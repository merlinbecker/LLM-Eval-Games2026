import { cn } from "@/lib/utils";

/** Pixel-art robot head — 1-bit, scalable */
export function RobotIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={cn("inline-block", className)} aria-hidden>
      {/* antenna */}
      <line x1="12" y1="1" x2="12" y2="5" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="1" r="1" fill="currentColor" />
      {/* head */}
      <rect x="4" y="5" width="16" height="14" rx="1" stroke="currentColor" strokeWidth="2" fill="none" />
      {/* eyes */}
      <rect x="7" y="9" width="3" height="3" fill="currentColor" />
      <rect x="14" y="9" width="3" height="3" fill="currentColor" />
      {/* mouth */}
      <line x1="8" y1="15" x2="16" y2="15" stroke="currentColor" strokeWidth="2" />
      {/* ears */}
      <rect x="1" y="9" width="3" height="6" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <rect x="20" y="9" width="3" height="6" stroke="currentColor" strokeWidth="1.5" fill="none" />
    </svg>
  );
}
