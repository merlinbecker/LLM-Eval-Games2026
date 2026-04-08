import { cn } from "@/lib/utils";

/** 1-bit medal icon — gold/silver/bronze via SVG-Patterns */
export function MedalIcon({ variant, className }: { variant: "gold" | "silver" | "bronze"; className?: string }) {
  const label = variant === "gold" ? "1" : variant === "silver" ? "2" : "3";
  const patternId = `medal-fill-${variant}`;
  return (
    <svg viewBox="0 0 16 20" fill="none" className={cn("inline-block", className)} aria-hidden>
      <defs>
        {variant === "silver" && (
          <pattern id={patternId} width="4" height="4" patternUnits="userSpaceOnUse">
            <rect width="4" height="4" fill="white" />
            <line x1="0" y1="1" x2="4" y2="1" stroke="currentColor" strokeWidth="1" />
            <line x1="0" y1="3" x2="4" y2="3" stroke="currentColor" strokeWidth="1" />
          </pattern>
        )}
        {variant === "bronze" && (
          <pattern id={patternId} width="4" height="4" patternUnits="userSpaceOnUse">
            <rect width="4" height="4" fill="white" />
            <rect x="1" y="1" width="1" height="1" fill="currentColor" />
            <rect x="3" y="3" width="1" height="1" fill="currentColor" />
          </pattern>
        )}
      </defs>
      {/* ribbon */}
      <polygon points="5,0 2,6 8,4" fill="currentColor" />
      <polygon points="11,0 14,6 8,4" fill="currentColor" />
      {/* medal circle */}
      <circle cx="8" cy="12" r="7" stroke="currentColor" strokeWidth="2"
        fill={variant === "gold" ? "currentColor" : `url(#${patternId})`} />
      {/* number */}
      <text x="8" y="16" textAnchor="middle"
        fill={variant === "gold" ? "white" : "currentColor"}
        fontFamily="monospace" fontSize="9" fontWeight="bold">{label}</text>
    </svg>
  );
}
