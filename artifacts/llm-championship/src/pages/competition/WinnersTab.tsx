import { useState } from "react";
import { RetroWindow, RetroSelect, RobotIcon } from "@/components/retro";
import { shortName, formatMs, formatCost } from "@/lib/utils";
import { Award, Zap, Coins } from "lucide-react";
import { PODIUM_CONFIG, PodiumEntry, JudgeRobotCard } from "./shared";
import { computeAvgScore } from "@/lib/competition-utils";
import type { SortedResultsProps } from "./types";

export function WinnersTab({ comp, sortedResults }: SortedResultsProps) {
  const [selectedModelIdx, setSelectedModelIdx] = useState(0);
  const selectedResult = sortedResults[selectedModelIdx];

  // Collect average scores per judge for the selected model
  const judgeAverages = new Map<string, { name: string; scores: number[]; total: number }>();
  if (selectedResult) {
    for (const resp of selectedResult.responses) {
      for (const js of resp.judgeScores) {
        const entry = judgeAverages.get(js.judgeModelId) || { name: js.judgeModelName, scores: [], total: 0 };
        entry.scores.push(js.score);
        entry.total += js.score;
        judgeAverages.set(js.judgeModelId, entry);
      }
    }
  }

  const judgeList = Array.from(judgeAverages.entries()).map(([id, data]) => ({
    id,
    name: data.name,
    avgScore: data.scores.length > 0 ? data.total / data.scores.length : 0,
    numRatings: data.scores.length,
  }));

  return (
    <div className="space-y-6">
      {/* Podium */}
      <RetroWindow title="PODIUM" className="bg-mac-white">
        <div className="relative w-full min-h-[380px] border-b-[3px] border-mac-black bg-dither overflow-hidden flex flex-col items-center justify-end p-8">
          <div className="flex items-end justify-center w-full max-w-4xl relative z-20 space-x-2 md:space-x-8 pb-4">
            {PODIUM_CONFIG.map((config) => {
              const result = sortedResults[config.index];
              return result ? <PodiumEntry key={config.label} result={result} config={config} /> : null;
            })}
          </div>
        </div>
      </RetroWindow>

      {/* Model Selector */}
      <RetroWindow title="EINZELWERTUNG">
        <div className="mb-6">
          <label htmlFor="model-select" className="block font-display mb-2 uppercase text-sm">Modell auswählen:</label>
          <RetroSelect
            id="model-select"
            value={String(selectedModelIdx)}
            onChange={(e) => setSelectedModelIdx(Number(e.target.value))}
            className="max-w-md"
          >
            {sortedResults.map((r, i) => (
              <option key={r.modelId} value={i}>
                #{i + 1} — {shortName(r.modelName)} (Quality: {r.avgQuality.toFixed(1)})
              </option>
            ))}
          </RetroSelect>
        </div>

        {selectedResult && (
          <div className="space-y-6">
            {/* Big Time & Cost Display */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="border-[4px] border-mac-black bg-mac-white p-6 text-center retro-shadow">
                <Award className="w-10 h-10 mx-auto mb-2" />
                <p className="font-display text-5xl">{selectedResult.avgQuality.toFixed(1)}</p>
                <p className="font-display text-sm mt-2 uppercase tracking-widest">Quality Score</p>
              </div>
              <div className="border-[4px] border-mac-black bg-mac-white p-6 text-center retro-shadow">
                <Zap className="w-10 h-10 mx-auto mb-2" />
                <p className="font-display text-5xl">{formatMs(selectedResult.avgSpeed)}</p>
                <p className="font-display text-sm mt-2 uppercase tracking-widest">Avg Response Time</p>
              </div>
              <div className="border-[4px] border-mac-black bg-mac-white p-6 text-center retro-shadow">
                <Coins className="w-10 h-10 mx-auto mb-2" />
                <p className="font-display text-5xl">{formatCost(selectedResult.totalCost)}</p>
                <p className="font-display text-sm mt-2 uppercase tracking-widest">Gesamtkosten</p>
              </div>
            </div>

            {/* Judge Panel: Robots holding score cards */}
            <div className="border-[3px] border-mac-black bg-mac-white p-6 retro-shadow-sm">
              <h3 className="font-display text-xl uppercase mb-4 border-b-[3px] border-mac-black pb-2">
                Judge-Panel — Durchschnittswertungen
              </h3>
              <div className="flex flex-wrap justify-center gap-8 py-4">
                {judgeList.map((judge) => (
                  <JudgeRobotCard
                    key={judge.id}
                    judgeName={judge.name}
                    score={Math.round(judge.avgScore * 10) / 10}
                  />
                ))}
              </div>
            </div>

            {/* Per-Question Judge Breakdown */}
            <div className="border-[3px] border-mac-black bg-mac-white retro-shadow-sm">
              <div className="bg-mac-black text-mac-white px-4 py-2 font-display uppercase text-sm">
                Einzelwertungen pro Frage
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b-[3px] border-mac-black">
                      <th className="p-3 font-display text-sm">FRAGE</th>
                      {judgeList.map((j) => (
                        <th key={j.id} className="p-3 font-display text-xs text-center">
                          <RobotIcon className="w-5 h-5 mx-auto mb-1" />
                          {shortName(j.name)}
                        </th>
                      ))}
                      <th className="p-3 font-display text-sm text-center">Ø</th>
                      <th className="p-3 font-display text-sm text-center">ZEIT</th>
                      <th className="p-3 font-display text-sm text-center">KOSTEN</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedResult.responses.map((resp, qIdx) => {
                      const avgJudge = computeAvgScore(resp.judgeScores);
                      return (
                        <tr key={qIdx} className="border-b-2 border-mac-black">
                          <td className="p-3 font-display">#{qIdx + 1}</td>
                          {judgeList.map((judge) => {
                            const js = resp.judgeScores.find((s) => s.judgeModelId === judge.id);
                            return (
                              <td key={judge.id} className="p-3 text-center font-display text-lg">
                                {js ? js.score : "—"}
                              </td>
                            );
                          })}
                          <td className="p-3 text-center font-display font-bold">{avgJudge.toFixed(1)}</td>
                          <td className="p-3 text-center text-sm">{formatMs(resp.durationMs)}</td>
                          <td className="p-3 text-center text-sm">{formatCost(resp.cost)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </RetroWindow>
    </div>
  );
}
