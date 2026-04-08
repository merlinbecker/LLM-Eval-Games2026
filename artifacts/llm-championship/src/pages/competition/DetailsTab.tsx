import { useState } from "react";
import { RetroWindow, RetroButton, RetroSelect, RobotIcon } from "@/components/retro";
import { shortName, formatMs, formatCost, parseDatasetItems } from "@/lib/utils";
import { computeAvgScore } from "@/lib/competition-utils";
import { Award, Zap, Coins } from "lucide-react";
import { useGetDataset } from "@workspace/api-client-react";
import type { JudgeScore } from "@workspace/api-client-react";
import type { SortedResultsProps } from "./types";

export function DetailsTab({ comp, sortedResults }: SortedResultsProps) {
  const totalQuestions = comp.results?.[0]?.responses?.length ?? 0;
  const [selectedQuestion, setSelectedQuestion] = useState(0);

  // Fetch dataset to show original questions
  const { data: dataset } = useGetDataset(comp.datasetId);
  const dataItems = dataset?.content ? parseDatasetItems(dataset.content) : [];
  const currentQuestion = dataItems[selectedQuestion] ?? null;

  if (totalQuestions === 0) {
    return <p className="font-display text-xl text-center py-12">Keine Antworten vorhanden.</p>;
  }

  return (
    <div className="space-y-6">
      {/* Question Selector */}
      <div className="border-[3px] border-mac-black bg-mac-white p-4 retro-shadow-sm flex flex-col md:flex-row items-start md:items-center gap-4">
        <label htmlFor="question-select" className="font-display uppercase text-sm whitespace-nowrap">Frage auswählen:</label>
        <RetroSelect
          id="question-select"
          value={String(selectedQuestion)}
          onChange={(e) => setSelectedQuestion(Number(e.target.value))}
          className="max-w-xs"
        >
          {Array.from({ length: totalQuestions }, (_, i) => (
            <option key={i} value={i}>
              Frage #{i + 1}
            </option>
          ))}
        </RetroSelect>
        <div className="flex gap-2 ml-auto">
          <RetroButton
            size="sm"
            variant="secondary"
            disabled={selectedQuestion === 0}
            onClick={() => setSelectedQuestion((q) => Math.max(0, q - 1))}
          >
            ◀ Zurück
          </RetroButton>
          <RetroButton
            size="sm"
            variant="secondary"
            disabled={selectedQuestion === totalQuestions - 1}
            onClick={() => setSelectedQuestion((q) => Math.min(totalQuestions - 1, q + 1))}
          >
            Weiter ▶
          </RetroButton>
        </div>
      </div>

      {/* Original question from dataset */}
      {currentQuestion && (
           <RetroWindow title="Ursprüngliche Frage (Datensatz)">
             <div className="bg-mac-white border-[2px] border-mac-black p-4 font-mono text-sm max-h-48 overflow-y-auto whitespace-pre-wrap">
               {currentQuestion}
             </div>
           </RetroWindow>
      )}

      {/* Responses for this question */}
      <div className="space-y-6">
        {sortedResults.map((modelResult) => {
          const response = modelResult.responses?.[selectedQuestion];
          const judgeScores: JudgeScore[] = response?.judgeScores ?? [];
          const avgScore = computeAvgScore(judgeScores);

          return (
            <RetroWindow key={modelResult.modelId} title={shortName(modelResult.modelName)}>
              {/* Header with metrics */}
              <div className="flex flex-wrap gap-4 mb-4 pb-4 border-b-[3px] border-mac-black">
                <div className="flex items-center gap-2 border-[2px] border-mac-black px-3 py-1 bg-pattern-5">
                  <Award className="w-4 h-4" />
                  <span className="font-display text-lg">{avgScore.toFixed(1)}</span>
                  <span className="text-xs uppercase">Ø Score</span>
                </div>
                {response && (
                  <>
                    <div className="flex items-center gap-2 border-[2px] border-mac-black px-3 py-1 bg-pattern-5">
                      <Zap className="w-4 h-4" />
                      <span className="font-display text-lg">{formatMs(response.durationMs)}</span>
                    </div>
                    <div className="flex items-center gap-2 border-[2px] border-mac-black px-3 py-1 bg-pattern-5">
                      <Coins className="w-4 h-4" />
                      <span className="font-display text-lg">{formatCost(response.cost)}</span>
                    </div>
                    <div className="flex items-center gap-2 border-[2px] border-mac-black px-3 py-1 bg-pattern-5">
                      <span className="text-xs uppercase">{response.promptTokens + response.completionTokens} Tokens</span>
                    </div>
                  </>
                )}
              </div>

              {/* Response text */}
              <div className="bg-pattern-5 p-4 border-[2px] border-mac-black font-mono text-sm mb-4 max-h-64 overflow-y-auto whitespace-pre-wrap">
                {response?.response ?? "Keine Antwort für diese Frage."}
              </div>

              {/* Judge scores with robot icons */}
              <div className="border-t-[3px] border-mac-black pt-4">
                <h5 className="font-display uppercase mb-3 text-sm">Judge-Wertungen:</h5>
                {judgeScores.length === 0 ? (
                  <p className="text-sm italic">Keine Wertungen vorhanden.</p>
                ) : (
                  <div className="space-y-4">
                    {judgeScores.map((score, jIdx) => (
                      <div key={jIdx} className="flex gap-4 border-b-2 border-dashed border-mac-black pb-3">
                        <div className="flex flex-col items-center flex-shrink-0">
                          <div className="border-[2px] border-mac-black bg-mac-white px-2 py-1 font-display text-xl font-bold text-center min-w-[2.5rem]">
                            {score.score}
                          </div>
                          <div className="w-0.5 h-1 bg-mac-black" />
                          <RobotIcon className="w-8 h-8 text-mac-black" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold uppercase text-sm">{shortName(score.judgeModelName)}</p>
                          <p className="text-sm italic leading-snug mt-1">{score.reasoning}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </RetroWindow>
          );
        })}
      </div>
    </div>
  );
}
