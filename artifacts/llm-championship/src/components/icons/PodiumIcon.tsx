import { cn } from "@/lib/utils";

/** CSS/SVG podium with robot avatars and medals — 1-bit */
export function PodiumIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 100" fill="none" className={cn("inline-block", className)} aria-hidden>
      <defs>
        <pattern id="podium-silver-fill" width="4" height="4" patternUnits="userSpaceOnUse">
          <rect width="4" height="4" fill="white" />
          <line x1="0" y1="1" x2="4" y2="1" stroke="currentColor" strokeWidth="1" />
          <line x1="0" y1="3" x2="4" y2="3" stroke="currentColor" strokeWidth="1" />
        </pattern>
        <pattern id="podium-bronze-fill" width="4" height="4" patternUnits="userSpaceOnUse">
          <rect width="4" height="4" fill="white" />
          <rect x="1" y="1" width="1" height="1" fill="currentColor" />
          <rect x="3" y="3" width="1" height="1" fill="currentColor" />
        </pattern>
      </defs>

      {/* ── 2nd place (left) ── */}
      <polygon points="18,22 15,27 21,25.5" fill="currentColor" />
      <polygon points="26,22 29,27 23,25.5" fill="currentColor" />
      <circle cx="22" cy="32" r="6" stroke="currentColor" strokeWidth="1.5" fill="url(#podium-silver-fill)" />
      <text x="22" y="35" textAnchor="middle" fill="currentColor" fontFamily="monospace" fontSize="7" fontWeight="bold">2</text>
      <line x1="22" y1="38" x2="22" y2="41" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="22" cy="38" r="1" fill="currentColor" />
      <rect x="14" y="41" width="16" height="12" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <rect x="17" y="45" width="2.5" height="2.5" fill="currentColor" />
      <rect x="24" y="45" width="2.5" height="2.5" fill="currentColor" />
      <line x1="18" y1="50" x2="26" y2="50" stroke="currentColor" strokeWidth="1.5" />
      <rect x="5" y="55" width="35" height="45" fill="currentColor" stroke="currentColor" strokeWidth="2" />

      {/* ── 1st place (center) ── */}
      <polygon points="55,2 52,7 58,5.5" fill="currentColor" />
      <polygon points="65,2 68,7 62,5.5" fill="currentColor" />
      <circle cx="60" cy="12" r="7" stroke="currentColor" strokeWidth="1.5" fill="currentColor" />
      <text x="60" y="15.5" textAnchor="middle" fill="white" fontFamily="monospace" fontSize="9" fontWeight="bold">1</text>
      <line x1="60" y1="19" x2="60" y2="23" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="60" cy="19" r="1" fill="currentColor" />
      <rect x="50" y="23" width="20" height="15" rx="1" stroke="currentColor" strokeWidth="2" fill="none" />
      <rect x="54" y="28" width="3" height="3" fill="currentColor" />
      <rect x="63" y="28" width="3" height="3" fill="currentColor" />
      <line x1="55" y1="34" x2="65" y2="34" stroke="currentColor" strokeWidth="2" />
      <rect x="42" y="40" width="36" height="60" fill="currentColor" stroke="currentColor" strokeWidth="2" />

      {/* ── 3rd place (right) ── */}
      <polygon points="93,32 90,37 96,35.5" fill="currentColor" />
      <polygon points="101,32 104,37 98,35.5" fill="currentColor" />
      <circle cx="97" cy="42" r="5.5" stroke="currentColor" strokeWidth="1.5" fill="url(#podium-bronze-fill)" />
      <text x="97" y="45" textAnchor="middle" fill="currentColor" fontFamily="monospace" fontSize="7" fontWeight="bold">3</text>
      <line x1="97" y1="48" x2="97" y2="51" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="97" cy="48" r="1" fill="currentColor" />
      <rect x="89" y="51" width="16" height="12" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <rect x="92" y="55" width="2.5" height="2.5" fill="currentColor" />
      <rect x="99" y="55" width="2.5" height="2.5" fill="currentColor" />
      <line x1="93" y1="60" x2="101" y2="60" stroke="currentColor" strokeWidth="1.5" />
      <rect x="80" y="65" width="35" height="35" fill="currentColor" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}
