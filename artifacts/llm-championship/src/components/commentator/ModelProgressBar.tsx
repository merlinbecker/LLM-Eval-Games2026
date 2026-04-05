import type { CompetitionResult } from "@workspace/api-client-react";
import { RobotIcon } from "@/components/retro";
import { formatMs, shortName } from "@/lib/utils";

export function ModelProgressBar({
  result,
  totalItems,
  isLeading,
}: {
  result: CompetitionResult;
  totalItems: number;
  isLeading: boolean;
}) {
  const name = shortName(result.modelName);
  const completed = result.responses.filter(
    (response) =>
      response.response &&
      response.response.trim().length > 0 &&
      !response.response.startsWith("Error:"),
  ).length;
  const progressPercent = totalItems > 0 ? (completed / totalItems) * 100 : 0;

  return (
    <div className="flex items-center gap-3 py-1">
      <RobotIcon className="w-5 h-5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-baseline mb-1">
          <span className="font-display text-xs uppercase truncate">{name}</span>
          <span className="font-display text-xs ml-2 flex-shrink-0">
            {completed}/{totalItems}
            {isLeading && result.avgQuality > 0 && (
              <span className="ml-1 text-[10px] border border-mac-black px-1">LEADER</span>
            )}
          </span>
        </div>
        <div className="w-full h-3 border-[2px] border-mac-black bg-mac-white">
          <div
            className="h-full bg-mac-black transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        {result.avgSpeed > 0 && (
          <div className="flex gap-3 text-[10px] font-bold uppercase mt-0.5 text-mac-black/60">
            <span>⌀ {formatMs(result.avgSpeed)}</span>
            {result.avgQuality > 0 && <span>⌀ {result.avgQuality.toFixed(1)}/10</span>}
          </div>
        )}
      </div>
    </div>
  );
}