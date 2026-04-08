import type { CompetitionResult } from "@workspace/api-client-react";
import { Timer, Zap } from "lucide-react";
import { formatMs, shortName } from "@/lib/utils";

export function SpeedComparisonTable({ results }: { results: CompetitionResult[] }) {
  if (results.length === 0) {
    return null;
  }

  const sorted = [...results]
    .filter((result) => result.avgSpeed > 0)
    .sort((a, b) => a.avgSpeed - b.avgSpeed);
  if (sorted.length === 0) {
    return null;
  }

  const fastest = sorted[0].avgSpeed;

  return (
    <div className="border-[2px] border-mac-black bg-mac-white p-2">
      <h4 className="font-display text-xs uppercase mb-2 flex items-center gap-1">
        <Timer className="w-3 h-3" /> Geschwindigkeitsranking
      </h4>
      <div className="space-y-1">
        {sorted.map((result, index) => {
          const diff = result.avgSpeed - fastest;
          const widthPercent = fastest > 0 ? (fastest / result.avgSpeed) * 100 : 100;

          return (
            <div key={result.modelId} className="flex items-center gap-2 text-xs">
              <span className="font-display w-5 text-right">#{index + 1}</span>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between">
                  <span className="font-bold truncate">{shortName(result.modelName)}</span>
                  <span className="font-display ml-1 flex-shrink-0 flex items-center gap-0.5">
                    {formatMs(result.avgSpeed)}
                    {index === 0 ? (
                      <Zap className="w-3 h-3" />
                    ) : (
                      <span className="text-[10px] text-mac-black">+{formatMs(diff)}</span>
                    )}
                  </span>
                </div>
                <div className="w-full h-1.5 border border-mac-black bg-mac-white mt-0.5">
                  <div className="h-full bg-mac-black" style={{ width: `${widthPercent}%` }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}