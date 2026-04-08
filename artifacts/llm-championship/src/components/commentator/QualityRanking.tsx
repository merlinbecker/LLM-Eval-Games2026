import type { CompetitionResult } from "@workspace/api-client-react";
import { Crown, TrendingUp } from "lucide-react";
import { shortName } from "@/lib/utils";
import { sortByQuality, filterWithScore } from "@/lib/competition-utils";

export function QualityRanking({ results }: { results: CompetitionResult[] }) {
  const sorted = sortByQuality(filterWithScore([...results]));
  if (sorted.length === 0) {
    return null;
  }

  return (
    <div className="border-[2px] border-mac-black bg-mac-white p-2">
      <h4 className="font-display text-xs uppercase mb-2 flex items-center gap-1">
        <TrendingUp className="w-3 h-3" /> Qualitätsranking
      </h4>
      <div className="space-y-1">
        {sorted.map((result, index) => (
          <div key={result.modelId} className="flex items-center gap-2 text-xs">
            <span className="font-display w-5 text-right">#{index + 1}</span>
            <span className="font-bold truncate flex-1">{shortName(result.modelName)}</span>
            <span className="font-display flex-shrink-0">
              {result.avgQuality.toFixed(1)}/10
              {index === 0 && <Crown className="w-3 h-3 inline ml-1" />}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}