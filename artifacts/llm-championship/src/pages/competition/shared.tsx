import { RobotIcon } from "@/components/retro";
import { shortName, formatMs, formatCost } from "@/lib/utils";
import type { CompetitionResult } from "@workspace/api-client-react";

// ─── PODIUM ───

export const PODIUM_CONFIG = [
  { index: 1, label: "2ND", iconSize: "w-20 h-20", textSize: "text-xl", cardWidth: "w-36", cardBg: "bg-mac-white", pedestalH: "h-16", z: "" },
  { index: 0, label: "1ST", iconSize: "w-24 h-24", textSize: "text-2xl", cardWidth: "w-44", cardBg: "bg-mac-black text-mac-white", pedestalH: "h-24", z: "z-30" },
  { index: 2, label: "3RD", iconSize: "w-16 h-16", textSize: "text-xl", cardWidth: "w-32", cardBg: "bg-mac-white", pedestalH: "h-10", z: "" },
] as const;

export function PodiumEntry({ result, config }: { result: CompetitionResult; config: typeof PODIUM_CONFIG[number] }) {
  return (
    <div className={`flex flex-col items-center ${config.z}`}>
      <RobotIcon className={`${config.iconSize} text-mac-black bg-mac-white border-4 border-mac-black p-2 retro-shadow-sm`} />
      <div className={`mt-2 ${config.cardBg} border-4 border-mac-black p-2 text-center ${config.cardWidth} font-bold uppercase`}>
        <p className={`font-display ${config.textSize}`}>{config.label}</p>
        <p className="text-sm truncate">{shortName(result.modelName)}</p>
        <p className={config.textSize}>{result.avgQuality.toFixed(1)}/10</p>
        <p className="text-xs mt-1">{formatMs(result.avgSpeed)} · {formatCost(result.totalCost)}</p>
      </div>
      <div className={`${config.cardWidth} ${config.pedestalH} bg-mac-black border-2 border-mac-black mt-1`} />
    </div>
  );
}

// ─── JUDGE ROBOT WITH SCORE CARD ───

export function JudgeRobotCard({ judgeName, score }: { judgeName: string; score: number }) {
  return (
    <div className="flex flex-col items-center">
      {/* Score card held above robot */}
      <div className="border-[3px] border-mac-black bg-mac-white px-4 py-2 font-display text-3xl font-bold text-center min-w-[3.5rem] retro-shadow-sm">
        {score}
      </div>
      {/* Arms holding the card */}
      <div className="flex justify-center">
        <div className="w-1 h-3 bg-mac-black" />
        <div className="w-4" />
        <div className="w-1 h-3 bg-mac-black" />
      </div>
      {/* Robot */}
      <RobotIcon className="w-12 h-12 text-mac-black" />
      <p className="text-xs font-bold uppercase mt-1 text-center max-w-[5rem] truncate">
        {shortName(judgeName)}
      </p>
    </div>
  );
}

// ─── STAT CARD ───

export function StatCard({ icon, label, value, subValue }: { icon: React.ReactNode; label: string; value: string; subValue?: string }) {
  return (
    <div className="border-[3px] border-mac-black bg-mac-white p-4 flex flex-col items-center text-center retro-shadow-sm">
      <div className="mb-2">{icon}</div>
      <span className="font-display text-2xl">{value}</span>
      {subValue && <span className="text-xs text-mac-black mt-1">{subValue}</span>}
      <span className="text-xs uppercase font-bold mt-1">{label}</span>
    </div>
  );
}
