import { Trophy, Zap, Coins } from "lucide-react";
import { shortName, formatMs, formatCost } from "@/lib/utils";
import type { CompetitionResult } from "@workspace/api-client-react";

export function CeremonyHeader({ sortedResults }: { sortedResults: CompetitionResult[] }) {
  const winner = sortedResults[0];
  if (!winner) return null;

  return (
    <div className="border-[4px] border-mac-black bg-mac-black text-mac-white retro-shadow overflow-hidden">
      <div className="text-center py-8 px-6 space-y-4">
        <Trophy className="w-16 h-16 mx-auto" />
        <p className="font-display text-sm tracking-[0.3em] uppercase">Siegerehrung</p>
        <p className="font-display text-4xl uppercase">{shortName(winner.modelName)}</p>
        <p className="font-display text-6xl">{winner.avgQuality.toFixed(1)}<span className="text-2xl">/10</span></p>
        <div className="flex justify-center gap-8 text-sm">
          <div>
            <Zap className="w-5 h-5 mx-auto mb-1" />
            <span>{formatMs(winner.avgSpeed)}</span>
          </div>
          <div>
            <Coins className="w-5 h-5 mx-auto mb-1" />
            <span>{formatCost(winner.totalCost)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
