import { RetroWindow, RobotIcon } from "@/components/retro";
import { TriangleChart } from "@/components/TriangleChart";
import { shortName, formatMs, formatCost } from "@/lib/utils";
import { Award, Zap, Coins, Users, Hash, Clock } from "lucide-react";
import { StatCard } from "./shared";
import type { SortedResultsProps } from "./types";

export function OverviewTab({ comp, sortedResults }: SortedResultsProps) {
  const winner = sortedResults[0];
  const totalQuestions = comp.results?.[0]?.responses?.length ?? 0;
  const fastest = sortedResults.length > 0
    ? [...sortedResults].sort((a, b) => a.avgSpeed - b.avgSpeed)[0]
    : null;
  const cheapest = sortedResults.length > 0
    ? [...sortedResults].sort((a, b) => a.totalCost - b.totalCost)[0]
    : null;

  // Normalize scores 1–10 relative to best/worst across all models.
  // Quality: higher is better. Speed & Cost: lower is better (inverted).
  const allResults = comp.results ?? [];
  const worstCost = allResults.length > 0 ? Math.max(...allResults.map(r => r.totalCost)) : undefined;
  const worstLatency = allResults.length > 0 ? Math.max(...allResults.map(r => r.avgSpeed)) : undefined;
  const radarData = (() => {
    if (allResults.length === 0) return [];

    const speeds = allResults.map(r => r.avgSpeed);
    const costs = allResults.map(r => r.totalCost);
    const qualities = allResults.map(r => r.avgQuality);

    const minSpeed = Math.min(...speeds);
    const maxSpeed = Math.max(...speeds);
    const minCost = Math.min(...costs);
    const maxCost = Math.max(...costs);
    const minQuality = Math.min(...qualities);
    const maxQuality = Math.max(...qualities);

    // Map value into 1–10 range. If all values are identical, use 5.
    const normalize = (value: number, min: number, max: number) =>
      max > min ? 1 + ((value - min) / (max - min)) * 9 : 5;

    return allResults.map(r => ({
      name: shortName(r.modelName),
      // Speed & Cost inverted: best (lowest) → 10, worst (highest) → 1
      speedScore: normalize(maxSpeed - r.avgSpeed, 0, maxSpeed - minSpeed),
      costScore: normalize(maxCost - r.totalCost, 0, maxCost - minCost),
      qualityScore: normalize(r.avgQuality, minQuality, maxQuality),
    }));
  })();

  return (
    <div className="space-y-6">
      {/* Winner Highlight */}
      {winner && (
        <div className="border-[4px] border-mac-black bg-mac-black text-mac-white p-6 retro-shadow flex flex-col md:flex-row items-center gap-6">
          <RobotIcon className="w-20 h-20 text-mac-white" />
          <div className="flex-1 text-center md:text-left">
            <p className="font-display text-sm tracking-widest mb-1">GEWINNER</p>
            <p className="font-display text-3xl uppercase">{shortName(winner.modelName)}</p>
            <p className="text-sm mt-1">{winner.modelId}</p>
          </div>
          <div className="flex gap-6 text-center">
            <div>
              <p className="font-display text-4xl">{winner.avgQuality.toFixed(1)}</p>
              <p className="text-xs uppercase tracking-wider">Qualität</p>
            </div>
            <div>
              <p className="font-display text-4xl">{formatMs(winner.avgSpeed)}</p>
              <p className="text-xs uppercase tracking-wider">Ø Tempo</p>
            </div>
            <div>
              <p className="font-display text-4xl">{formatCost(winner.totalCost)}</p>
              <p className="text-xs uppercase tracking-wider">Σ Kosten</p>
            </div>
          </div>
        </div>
      )}

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={<Users className="w-8 h-8" />}
          label="Teilnehmer"
          value={String(comp.contestantModels?.length ?? 0)}
        />
        <StatCard
          icon={<Award className="w-8 h-8" />}
          label="Judges"
          value={String(comp.judgeModels?.length ?? 0)}
        />
        <StatCard
          icon={<Hash className="w-8 h-8" />}
          label="Fragen"
          value={String(totalQuestions)}
        />
        <StatCard
          icon={<Clock className="w-8 h-8" />}
          label="Erstellt"
          value={new Date(comp.createdAt).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })}
          subValue={new Date(comp.createdAt).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}
        />
      </div>

      {/* Best-in-Category */}
      {(fastest || cheapest) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {fastest && (
            <div className="border-[3px] border-mac-black bg-mac-white p-4 flex items-center gap-4 retro-shadow-sm">
              <Zap className="w-10 h-10 flex-shrink-0" />
              <div>
                <p className="text-xs font-bold uppercase tracking-wider">Schnellstes Modell</p>
                <p className="font-display text-xl">{shortName(fastest.modelName)}</p>
                <p className="text-sm">{formatMs(fastest.avgSpeed)} avg</p>
              </div>
            </div>
          )}
          {cheapest && (
            <div className="border-[3px] border-mac-black bg-mac-white p-4 flex items-center gap-4 retro-shadow-sm">
              <Coins className="w-10 h-10 flex-shrink-0" />
              <div>
                <p className="text-xs font-bold uppercase tracking-wider">Günstigstes Modell</p>
                <p className="font-display text-xl">{shortName(cheapest.modelName)}</p>
                <p className="text-sm">{formatCost(cheapest.totalCost)} gesamt</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Radar + Ranking side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance Triangle */}
        <RetroWindow title="PERFORMANCE DREIECK">
          <div className="w-full bg-mac-white flex items-center justify-center p-2">
            <TriangleChart data={radarData} worstCost={worstCost} worstLatency={worstLatency} formatCost={formatCost} formatLatency={formatMs} />
          </div>
            <div className="p-3 border-t-[3px] border-mac-black bg-pattern-5">
            <p className="text-xs uppercase font-bold mb-1">Leserichtung:</p>
            <p className="text-xs">Je näher ein Punkt an einer Ecke liegt, desto stärker ist das Modell in dieser Dimension.</p>
          </div>
        </RetroWindow>

        {/* Ranking Table */}
        <RetroWindow title="RANGLISTE">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b-[3px] border-mac-black">
                  <th className="p-2 font-display text-sm">#</th>
                  <th className="p-2 font-display text-sm">MODELL</th>
                  <th className="p-2 font-display text-sm text-center">QUALITY</th>
                  <th className="p-2 font-display text-sm text-center">SPEED</th>
                  <th className="p-2 font-display text-sm text-center">COST</th>
                  <th className="p-2 font-display text-sm text-center">TOKENS</th>
                </tr>
              </thead>
              <tbody>
                {sortedResults.map((r, i) => (
                  <tr key={r.modelId} className={`border-b-2 border-mac-black ${i === 0 ? 'bg-pattern-12 font-bold' : ''}`}>
                    <td className="p-2 font-display">{i + 1}</td>
                    <td className="p-2 font-bold truncate max-w-[10rem]" title={r.modelId}>{shortName(r.modelName)}</td>
                    <td className="p-2 text-center font-display">{r.avgQuality.toFixed(1)}</td>
                    <td className="p-2 text-center">{formatMs(r.avgSpeed)}</td>
                    <td className="p-2 text-center">{formatCost(r.totalCost)}</td>
                    <td className="p-2 text-center">{r.totalTokens.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </RetroWindow>
      </div>
    </div>
  );
}
