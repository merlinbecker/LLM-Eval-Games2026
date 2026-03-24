import { useState } from "react";
import { useRoute } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { 
  useGetCompetition, 
  useRunCompetition,
  getGetCompetitionQueryKey
} from "@workspace/api-client-react";
import { RetroWindow, RetroButton, RetroBadge, RetroSelect, RobotIcon } from "@/components/retro";
import { Commentator } from "@/components/Commentator";
import { TriangleChart } from "@/components/TriangleChart";
import { Play, Loader2, Award, Zap, Coins, Trophy, Users, Hash, Clock, BarChart3, FileText } from "lucide-react";
import type { CompetitionResult, CompetitionDetail, JudgeScore } from "@workspace/api-client-react";

// ─── HELPERS ───

function shortName(name: string): string {
  return name.split("/").pop() || name;
}

function formatMs(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatCost(cost: number): string {
  if (cost < 0.001) return `$${(cost * 1_000_000).toFixed(1)}µ`;
  if (cost < 1) return `$${(cost * 1000).toFixed(2)}m`;
  return `$${cost.toFixed(4)}`;
}

// ─── TAB TYPES ───

type CeremonyTab = "overview" | "winners" | "details";

const TAB_CONFIG: { id: CeremonyTab; label: string; icon: React.ReactNode }[] = [
  { id: "overview", label: "ÜBERSICHT", icon: <BarChart3 className="w-4 h-4 mr-2 inline" /> },
  { id: "winners", label: "GEWINNER & JUDGES", icon: <Trophy className="w-4 h-4 mr-2 inline" /> },
  { id: "details", label: "DETAIL-ANTWORTEN", icon: <FileText className="w-4 h-4 mr-2 inline" /> },
];

// ─── PODIUM ───

const PODIUM_CONFIG = [
  { index: 1, label: "2ND", iconSize: "w-20 h-20", textSize: "text-xl", cardWidth: "w-36", cardBg: "bg-mac-white", pedestalH: "h-16", z: "" },
  { index: 0, label: "1ST", iconSize: "w-24 h-24", textSize: "text-2xl", cardWidth: "w-44", cardBg: "bg-mac-black text-mac-white", pedestalH: "h-24", z: "z-30" },
  { index: 2, label: "3RD", iconSize: "w-16 h-16", textSize: "text-xl", cardWidth: "w-32", cardBg: "bg-mac-white", pedestalH: "h-10", z: "" },
] as const;

function PodiumEntry({ result, config }: { result: CompetitionResult; config: typeof PODIUM_CONFIG[number] }) {
  return (
    <div className={`flex flex-col items-center ${config.z}`}>
      <RobotIcon className={`${config.iconSize} text-mac-black bg-mac-white border-4 border-mac-black p-2 retro-shadow-sm`} />
      <div className={`mt-2 ${config.cardBg} border-4 border-mac-black p-2 text-center ${config.cardWidth} font-bold uppercase`}>
        <p className={`font-display ${config.textSize}`}>{config.label}</p>
        <p className="text-sm truncate">{shortName(result.modelName)}</p>
        <p className={config.textSize}>{result.avgQuality.toFixed(1)}/10</p>
      </div>
      <div className={`${config.cardWidth} ${config.pedestalH} bg-mac-black border-2 border-mac-black mt-1`} />
    </div>
  );
}

// ─── JUDGE ROBOT WITH SCORE CARD ───

function JudgeRobotCard({ judgeName, score }: { judgeName: string; score: number }) {
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

function StatCard({ icon, label, value, subValue }: { icon: React.ReactNode; label: string; value: string; subValue?: string }) {
  return (
    <div className="border-[3px] border-mac-black bg-mac-white p-4 flex flex-col items-center text-center retro-shadow-sm">
      <div className="mb-2">{icon}</div>
      <span className="font-display text-2xl">{value}</span>
      {subValue && <span className="text-xs text-mac-black/60 mt-1">{subValue}</span>}
      <span className="text-xs uppercase font-bold mt-1">{label}</span>
    </div>
  );
}

// ═══════════════════════════════════════════════
// TAB 1: ÜBERSICHT / CHEAT SHEET
// ═══════════════════════════════════════════════

function OverviewTab({ comp, sortedResults }: { comp: CompetitionDetail; sortedResults: CompetitionResult[] }) {
  const winner = sortedResults[0];
  const totalQuestions = comp.results?.[0]?.responses?.length ?? 0;
  const fastest = sortedResults.length > 0
    ? [...sortedResults].sort((a, b) => a.avgSpeed - b.avgSpeed)[0]
    : null;
  const cheapest = sortedResults.length > 0
    ? [...sortedResults].sort((a, b) => a.avgCost - b.avgCost)[0]
    : null;

  const radarData = comp.results?.map(r => ({
    name: shortName(r.modelName),
    speedScore: Math.max(0, 10 - (r.avgSpeed / 1000)),
    costScore: Math.max(0, 10 - (r.avgCost * 100)),
    qualityScore: r.avgQuality,
  })) || [];

  return (
    <div className="space-y-6">
      {/* Winner Highlight */}
      {winner && (
        <div className="border-[4px] border-mac-black bg-mac-black text-mac-white p-6 retro-shadow flex flex-col md:flex-row items-center gap-6">
          <RobotIcon className="w-20 h-20 text-mac-white" />
          <div className="flex-1 text-center md:text-left">
            <p className="font-display text-sm tracking-widest mb-1">GEWINNER</p>
            <p className="font-display text-3xl uppercase">{shortName(winner.modelName)}</p>
            <p className="text-sm opacity-70 mt-1">{winner.modelId}</p>
          </div>
          <div className="flex gap-6 text-center">
            <div>
              <p className="font-display text-4xl">{winner.avgQuality.toFixed(1)}</p>
              <p className="text-xs uppercase tracking-wider">Quality</p>
            </div>
            <div>
              <p className="font-display text-4xl">{formatMs(winner.avgSpeed)}</p>
              <p className="text-xs uppercase tracking-wider">Avg Speed</p>
            </div>
            <div>
              <p className="font-display text-4xl">{formatCost(winner.avgCost)}</p>
              <p className="text-xs uppercase tracking-wider">Avg Cost</p>
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
                <p className="text-sm">{formatCost(cheapest.avgCost)} avg</p>
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
            <TriangleChart data={radarData} />
          </div>
          <div className="p-3 border-t-[3px] border-mac-black bg-mac-black/5">
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
                  <tr key={r.modelId} className={`border-b-2 border-mac-black/20 ${i === 0 ? 'bg-mac-black/10 font-bold' : ''}`}>
                    <td className="p-2 font-display">{i + 1}</td>
                    <td className="p-2 font-bold truncate max-w-[10rem]" title={r.modelId}>{shortName(r.modelName)}</td>
                    <td className="p-2 text-center font-display">{r.avgQuality.toFixed(1)}</td>
                    <td className="p-2 text-center">{formatMs(r.avgSpeed)}</td>
                    <td className="p-2 text-center">{formatCost(r.avgCost)}</td>
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

// ═══════════════════════════════════════════════
// TAB 2: GEWINNER & JUDGES
// ═══════════════════════════════════════════════

function WinnersTab({ comp, sortedResults }: { comp: CompetitionDetail; sortedResults: CompetitionResult[] }) {
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
          <label className="block font-display mb-2 uppercase text-sm">Modell auswählen:</label>
          <RetroSelect
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
                <p className="font-display text-5xl">{formatCost(selectedResult.avgCost)}</p>
                <p className="font-display text-sm mt-2 uppercase tracking-widest">Avg Cost / Response</p>
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
                      const avgJudge = resp.judgeScores.length > 0
                        ? resp.judgeScores.reduce((s, js) => s + js.score, 0) / resp.judgeScores.length
                        : 0;
                      return (
                        <tr key={qIdx} className="border-b-2 border-mac-black/20">
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

// ═══════════════════════════════════════════════
// TAB 3: DETAIL-ANTWORTEN
// ═══════════════════════════════════════════════

function DetailsTab({ comp, sortedResults }: { comp: CompetitionDetail; sortedResults: CompetitionResult[] }) {
  const totalQuestions = comp.results?.[0]?.responses?.length ?? 0;
  const [selectedQuestion, setSelectedQuestion] = useState(0);

  if (totalQuestions === 0) {
    return <p className="font-display text-xl text-center py-12">Keine Antworten vorhanden.</p>;
  }

  return (
    <div className="space-y-6">
      {/* Question Selector */}
      <div className="border-[3px] border-mac-black bg-mac-white p-4 retro-shadow-sm flex flex-col md:flex-row items-start md:items-center gap-4">
        <label className="font-display uppercase text-sm whitespace-nowrap">Frage auswählen:</label>
        <RetroSelect
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

      {/* Responses for this question */}
      <div className="space-y-6">
        {sortedResults.map((modelResult) => {
          const response = modelResult.responses?.[selectedQuestion];
          const judgeScores: JudgeScore[] = response?.judgeScores ?? [];
          const avgScore = judgeScores.length > 0
            ? judgeScores.reduce((s, js) => s + js.score, 0) / judgeScores.length
            : 0;

          return (
            <RetroWindow key={modelResult.modelId} title={shortName(modelResult.modelName)}>
              {/* Header with metrics */}
              <div className="flex flex-wrap gap-4 mb-4 pb-4 border-b-[3px] border-mac-black">
                <div className="flex items-center gap-2 border-[2px] border-mac-black px-3 py-1 bg-mac-black/5">
                  <Award className="w-4 h-4" />
                  <span className="font-display text-lg">{avgScore.toFixed(1)}</span>
                  <span className="text-xs uppercase">Ø Score</span>
                </div>
                {response && (
                  <>
                    <div className="flex items-center gap-2 border-[2px] border-mac-black px-3 py-1 bg-mac-black/5">
                      <Zap className="w-4 h-4" />
                      <span className="font-display text-lg">{formatMs(response.durationMs)}</span>
                    </div>
                    <div className="flex items-center gap-2 border-[2px] border-mac-black px-3 py-1 bg-mac-black/5">
                      <Coins className="w-4 h-4" />
                      <span className="font-display text-lg">{formatCost(response.cost)}</span>
                    </div>
                    <div className="flex items-center gap-2 border-[2px] border-mac-black px-3 py-1 bg-mac-black/5">
                      <span className="text-xs uppercase">{response.promptTokens + response.completionTokens} Tokens</span>
                    </div>
                  </>
                )}
              </div>

              {/* Response text */}
              <div className="bg-mac-black/5 p-4 border-[2px] border-mac-black font-mono text-sm mb-4 max-h-64 overflow-y-auto whitespace-pre-wrap">
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

// ═══════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════

export default function CompetitionResults() {
  const [, params] = useRoute("/competitions/:id");
  const id = Number(params?.id);
  const [activeTab, setActiveTab] = useState<CeremonyTab>("overview");
  
  const queryClient = useQueryClient();
  const { data: comp, isLoading } = useGetCompetition(id, {
    query: { queryKey: getGetCompetitionQueryKey(id), refetchInterval: (query) => query.state.data?.status === 'running' ? 2000 : false }
  });
  const runMutation = useRunCompetition();

  const handleRun = () => {
    runMutation.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetCompetitionQueryKey(id) });
      },
    });
  };

  if (isLoading) return <div className="text-center p-20 font-display text-4xl animate-pulse">LOADING TAPE...</div>;
  if (!comp) return <div className="text-center p-20 font-display text-2xl">COMPETITION NOT FOUND</div>;

  const isCompleted = comp.status === 'completed';
  const isRunning = comp.status === 'running';
  const hasResults = (comp.results?.length ?? 0) > 0;
  const sortedResults = [...(comp.results || [])].sort((a, b) => b.avgQuality - a.avgQuality);

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      {/* Header Bar */}
      <div className="border-[4px] border-mac-black bg-mac-white p-6 flex flex-col md:flex-row justify-between items-center retro-shadow">
        <div>
          <h1 className="text-4xl font-display uppercase tracking-widest">{comp.name}</h1>
          <div className="flex flex-wrap space-x-4 mt-2 font-bold text-lg">
            <p>ID: {comp.id}</p>
            <p>|</p>
            <p>DATASET: #{comp.datasetId}</p>
            <p>|</p>
            <p className="flex items-center">
              STATUS: 
              <RetroBadge className="ml-2 px-3 py-1 text-sm">{comp.status}</RetroBadge>
            </p>
          </div>
        </div>
        
        {comp.status === 'draft' && (
          <RetroButton size="lg" onClick={handleRun} disabled={runMutation.isPending} className="mt-4 md:mt-0 animate-pulse">
            <Play className="w-6 h-6 mr-2 inline" /> INITIATE RUN
          </RetroButton>
        )}
        {isRunning && (
          <div className="mt-4 md:mt-0 border-4 border-mac-black p-4 bg-dither text-center">
            <div className="bg-mac-white px-4 py-2 border-2 border-mac-black flex items-center font-display text-xl">
              <Loader2 className="w-6 h-6 mr-3 animate-spin" /> EVALUATING...
            </div>
          </div>
        )}
      </div>

      {/* Live Commentator — visible while running or just completed */}
      {(isRunning || isCompleted) && (
        <Commentator competition={comp} />
      )}

      {(isCompleted || (isRunning && hasResults)) && (
        <>
          {/* Tab Navigation */}
          <div className="flex flex-wrap gap-2 border-[3px] border-mac-black bg-mac-white p-2 retro-shadow-sm">
            {TAB_CONFIG.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center px-4 py-2 font-display text-sm uppercase tracking-wider border-[3px] border-mac-black transition-all
                  ${activeTab === tab.id
                    ? 'bg-mac-black text-mac-white'
                    : 'bg-mac-white text-mac-black hover:bg-mac-black/10'
                  }
                `}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          {activeTab === "overview" && (
            <OverviewTab comp={comp} sortedResults={sortedResults} />
          )}
          {activeTab === "winners" && (
            <WinnersTab comp={comp} sortedResults={sortedResults} />
          )}
          {activeTab === "details" && (
            <DetailsTab comp={comp} sortedResults={sortedResults} />
          )}
        </>
      )}
    </div>
  );
}
