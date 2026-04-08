import { useState } from "react";
import { RetroWindow, RobotIcon, RetroProgressBar } from "@/components/retro";
import { ChevronDown, ChevronUp } from "lucide-react";
import { shortName, formatMs, formatCost } from "@/lib/utils";
import { computeAvgScore, sortByQuality, parseProgressTotal } from "@/lib/competition-utils";
import type { CompetitionDetail } from "@workspace/api-client-react";

export function RunProgressView({
  comp,
  activeModelProgress,
}: {
  comp: CompetitionDetail;
  activeModelProgress: string | undefined;
}) {
  const [expandedModels, setExpandedModels] = useState<Set<string>>(new Set());
  const results = comp.results ?? [];

  // Parse which model is currently active from activity progress string.
  // Expected format from backend: "ModelName: item X/Y" (see competitions.ts savePartialResults)
  const activeModelName = activeModelProgress
    ? activeModelProgress.split(":")[0]?.trim() ?? null
    : null;

  const toggleModel = (modelId: string) => {
    setExpandedModels((prev) => {
      const next = new Set(prev);
      if (next.has(modelId)) next.delete(modelId);
      else next.add(modelId);
      return next;
    });
  };

  // Estimate total items from any model's progress text (format: "ModelName: item X/Y")
  const estimatedTotal = (
    (activeModelProgress ? parseProgressTotal(activeModelProgress) : null) ??
    results.reduce((max, r) => Math.max(max, r.responses?.length ?? 0), 0)
  );

  // Sort by current average quality descending
  const sorted = sortByQuality(results);

  return (
    <RetroWindow title="LAUF-ÜBERSICHT">
      <div className="space-y-4">
        {sorted.length === 0 && (
          <div className="text-center py-8 font-display text-lg animate-pulse">
            Warte auf erste Ergebnisse...
          </div>
        )}
        {sorted.map((result, rank) => {
          const name = shortName(result.modelName);
          const isActive = activeModelName === result.modelName || activeModelName === name;
          const isExpanded = expandedModels.has(result.modelId);
          const completedItems = result.responses?.filter(
            (r) => r.response && r.response.trim().length > 0 && !r.response.startsWith("Error:"),
          ).length ?? 0;
          const totalItems = estimatedTotal || completedItems;
          const pct = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;

          return (
            <div
              key={result.modelId}
              className={`${isActive ? "border-[3px] border-mac-black bg-pattern-5" : "border-[1px] border-mac-black bg-mac-white"} transition-all`}
            >
              {/* Model Header */}
              <button
                onClick={() => toggleModel(result.modelId)}
                className="w-full text-left p-3 flex items-center gap-3"
              >
                <RobotIcon className={`w-8 h-8 flex-shrink-0 ${isActive ? "animate-pulse" : ""}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-display text-sm uppercase font-bold">#{rank + 1}</span>
                    <span className="font-display text-lg uppercase truncate">{name}</span>
                    {isActive && (
                      <span className="border-[2px] border-mac-black bg-mac-black text-mac-white px-2 py-0.5 text-xs font-display uppercase animate-pulse">
                        AKTIV
                      </span>
                    )}
                    {completedItems === totalItems && totalItems > 0 && !isActive && (
                      <span className="border-[2px] border-mac-black bg-mac-white px-2 py-0.5 text-xs font-display uppercase">
                        FERTIG
                      </span>
                    )}
                  </div>
                  {/* Progress bar */}
                  <RetroProgressBar percent={pct} active={isActive} />
                  <div className="flex gap-4 text-xs font-bold uppercase mt-1">
                    <span>{completedItems}/{totalItems} Items</span>
                    {result.avgQuality > 0 && <span>⌀ {result.avgQuality.toFixed(1)}/10</span>}
                    {result.avgSpeed > 0 && <span>⌀ {formatMs(result.avgSpeed)}</span>}
                    {result.totalCost > 0 && <span>Σ {formatCost(result.totalCost)}</span>}
                  </div>
                </div>
                {isExpanded ? <ChevronUp className="w-5 h-5 flex-shrink-0" /> : <ChevronDown className="w-5 h-5 flex-shrink-0" />}
              </button>

              {/* Expanded: Individual item scores */}
              {isExpanded && result.responses && result.responses.length > 0 && (
                <div className="border-t-[2px] border-mac-black px-3 pb-3">
                  <table className="w-full text-left mt-2">
                    <thead>
                      <tr className="border-b-[2px] border-mac-black">
                        <th className="p-1.5 font-display text-xs">ITEM</th>
                        <th className="p-1.5 font-display text-xs text-center">JUDGE Ø</th>
                        <th className="p-1.5 font-display text-xs text-center">ZEIT</th>
                        <th className="p-1.5 font-display text-xs text-center">KOSTEN</th>
                        <th className="p-1.5 font-display text-xs text-center">TOKENS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.responses.map((resp, i) => {
                        const avgJudge = computeAvgScore(resp.judgeScores);
                        const isNewItem = i === result.responses.length - 1 && isActive;
                        return (
                          <tr
                            key={i}
                            className={`border-b border-mac-black ${isNewItem ? "bg-pattern-12 font-bold" : ""}`}
                          >
                            <td className="p-1.5 font-display text-sm">#{i + 1}</td>
                            <td className="p-1.5 text-center font-display text-sm">
                              {avgJudge > 0 ? avgJudge.toFixed(1) : "—"}
                            </td>
                            <td className="p-1.5 text-center text-sm">{resp.durationMs > 0 ? formatMs(resp.durationMs) : "—"}</td>
                            <td className="p-1.5 text-center text-sm">{resp.cost > 0 ? formatCost(resp.cost) : "—"}</td>
                            <td className="p-1.5 text-center text-sm">
                              {resp.promptTokens + resp.completionTokens > 0
                                ? (resp.promptTokens + resp.completionTokens).toLocaleString()
                                : "—"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    {/* Running total */}
                    <tfoot>
                      <tr className="border-t-[2px] border-mac-black font-bold">
                        <td className="p-1.5 font-display text-xs uppercase">Summe / ⌀</td>
                        <td className="p-1.5 text-center font-display text-sm">{result.avgQuality > 0 ? result.avgQuality.toFixed(1) : "—"}</td>
                        <td className="p-1.5 text-center text-sm">{result.avgSpeed > 0 ? formatMs(result.avgSpeed) : "—"}</td>
                        <td className="p-1.5 text-center text-sm">{result.totalCost > 0 ? formatCost(result.totalCost) : "—"}</td>
                        <td className="p-1.5 text-center text-sm">{result.totalTokens > 0 ? result.totalTokens.toLocaleString() : "—"}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </RetroWindow>
  );
}
