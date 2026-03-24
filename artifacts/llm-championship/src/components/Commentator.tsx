import { useEffect, useRef, useState } from "react";
import { RetroWindow, RobotIcon } from "@/components/retro";
import { Mic, Timer, Zap, TrendingUp, Crown } from "lucide-react";
import type { CompetitionDetail, CompetitionResult } from "@workspace/api-client-react";
import { useListActivities, getListActivitiesQueryKey } from "@workspace/api-client-react";

// ─── TYPES ───

interface CommentaryEvent {
  id: number;
  timestamp: number;
  type: "start" | "response" | "leader_change" | "speed_record" | "finish" | "progress";
  modelName?: string;
  message: string;
  highlight?: boolean;
}

// ─── COMMENTARY GENERATOR ───

function shortName(name: string): string {
  return name.split("/").pop() || name;
}

function formatMs(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function generateResponseCommentary(
  model: CompetitionResult,
  itemIndex: number,
  totalItems: number,
  allResults: CompetitionResult[],
): CommentaryEvent[] {
  const events: CommentaryEvent[] = [];
  const name = shortName(model.modelName);
  const resp = model.responses[itemIndex];
  if (!resp) return events;

  const duration = resp.durationMs;

  // Find how this time compares to others on the same item
  const otherTimes = allResults
    .filter((r) => r.modelId !== model.modelId)
    .map((r) => ({ name: shortName(r.modelName), time: r.responses[itemIndex]?.durationMs }))
    .filter((t) => t.time != null && t.time > 0);

  const fastest = otherTimes.length > 0 ? Math.min(...otherTimes.map((t) => t.time!)) : null;
  const slowest = otherTimes.length > 0 ? Math.max(...otherTimes.map((t) => t.time!)) : null;

  // Base commentary
  const commentaryOptions = [
    `${name} antwortet auf Item #${itemIndex + 1} in ${formatMs(duration)}!`,
    `${name} feuert los — ${formatMs(duration)} für Aufgabe #${itemIndex + 1}!`,
    `Antwort #${itemIndex + 1} von ${name}: ${formatMs(duration)} auf der Uhr!`,
    `${name} liefert ab! ${formatMs(duration)} für Item #${itemIndex + 1}!`,
  ];
  let msg = commentaryOptions[Math.floor(Math.random() * commentaryOptions.length)];

  // Speed comparisons
  let highlight = false;
  if (fastest !== null && duration < fastest) {
    const diff = fastest - duration;
    msg += ` >> BLITZSCHNELL — ${formatMs(diff)} schneller als die Konkurrenz!`;
    highlight = true;
  } else if (slowest !== null && duration > slowest * 1.5) {
    msg += ` .. Braucht etwas länger hier...`;
  } else if (fastest !== null && duration < fastest * 1.1) {
    msg += ` Kopf-an-Kopf-Rennen bei den Zeiten!`;
  }

  // Judge scores
  if (resp.judgeScores.length > 0) {
    const avgScore = resp.judgeScores.reduce((s, j) => s + j.score, 0) / resp.judgeScores.length;
    if (avgScore >= 9) {
      msg += ` ** WELTKLASSE-Bewertung: ${avgScore.toFixed(1)}/10!`;
      highlight = true;
    } else if (avgScore >= 7) {
      msg += ` Solide ${avgScore.toFixed(1)}/10 von den Judges.`;
    } else if (avgScore < 4) {
      msg += ` Nur ${avgScore.toFixed(1)}/10 — das tut weh!`;
    }
  }

  events.push({
    id: Date.now() + Math.random(),
    timestamp: Date.now(),
    type: "response",
    modelName: model.modelName,
    message: msg,
    highlight,
  });

  return events;
}

function generateLeaderChangeCommentary(
  prevLeader: string | null,
  newLeader: string,
  score: number,
): CommentaryEvent | null {
  if (prevLeader === newLeader) return null;
  const name = shortName(newLeader);
  const messages = prevLeader
    ? [
        `>>> FÜHRUNGSWECHSEL! ${name} übernimmt die Spitze mit ${score.toFixed(1)}/10!`,
        `SENSATION! ${name} verdrängt ${shortName(prevLeader)} von Platz 1!`,
        `${name} setzt sich an die Spitze! Neuer Schnitt: ${score.toFixed(1)}/10!`,
      ]
    : [`${name} geht als Erste:r in Führung mit ${score.toFixed(1)}/10!`];

  return {
    id: Date.now() + Math.random(),
    timestamp: Date.now(),
    type: "leader_change",
    modelName: newLeader,
    message: messages[Math.floor(Math.random() * messages.length)],
    highlight: true,
  };
}

// ─── PROGRESS BAR ───

function ModelProgressBar({
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
    (r) => r.response && r.response.trim().length > 0 && !r.response.startsWith("Error:"),
  ).length;
  const pct = totalItems > 0 ? (completed / totalItems) * 100 : 0;

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
            style={{ width: `${pct}%` }}
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

// ─── SPEED COMPARISON TABLE ───

function SpeedComparisonTable({ results }: { results: CompetitionResult[] }) {
  if (results.length === 0) return null;

  const sorted = [...results].filter((r) => r.avgSpeed > 0).sort((a, b) => a.avgSpeed - b.avgSpeed);
  if (sorted.length === 0) return null;

  const fastest = sorted[0].avgSpeed;

  return (
    <div className="border-[2px] border-mac-black bg-mac-white p-2">
      <h4 className="font-display text-xs uppercase mb-2 flex items-center gap-1">
        <Timer className="w-3 h-3" /> Geschwindigkeitsranking
      </h4>
      <div className="space-y-1">
        {sorted.map((r, i) => {
          const diff = r.avgSpeed - fastest;
          const pct = fastest > 0 ? (fastest / r.avgSpeed) * 100 : 100;
          return (
            <div key={r.modelId} className="flex items-center gap-2 text-xs">
              <span className="font-display w-5 text-right">#{i + 1}</span>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between">
                  <span className="font-bold truncate">{shortName(r.modelName)}</span>
                  <span className="font-display ml-1 flex-shrink-0 flex items-center gap-0.5">
                    {formatMs(r.avgSpeed)}
                    {i === 0 ? (
                      <Zap className="w-3 h-3" />
                    ) : (
                      <span className="text-[10px] text-mac-black/50">+{formatMs(diff)}</span>
                    )}
                  </span>
                </div>
                <div className="w-full h-1.5 border border-mac-black bg-mac-white mt-0.5">
                  <div className="h-full bg-mac-black" style={{ width: `${pct}%` }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── QUALITY RANKING ───

function QualityRanking({ results }: { results: CompetitionResult[] }) {
  const sorted = [...results].filter((r) => r.avgQuality > 0).sort((a, b) => b.avgQuality - a.avgQuality);
  if (sorted.length === 0) return null;

  return (
    <div className="border-[2px] border-mac-black bg-mac-white p-2">
      <h4 className="font-display text-xs uppercase mb-2 flex items-center gap-1">
        <TrendingUp className="w-3 h-3" /> Qualitätsranking
      </h4>
      <div className="space-y-1">
        {sorted.map((r, i) => (
          <div key={r.modelId} className="flex items-center gap-2 text-xs">
            <span className="font-display w-5 text-right">#{i + 1}</span>
            <span className="font-bold truncate flex-1">{shortName(r.modelName)}</span>
            <span className="font-display flex-shrink-0">
              {r.avgQuality.toFixed(1)}/10
              {i === 0 && <Crown className="w-3 h-3 inline ml-1" />}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── MAIN COMMENTATOR COMPONENT ───

export function Commentator({
  competition,
}: {
  competition: CompetitionDetail;
}) {
  const [events, setEvents] = useState<CommentaryEvent[]>([]);
  const prevResultsRef = useRef<Map<string, number>>(new Map());
  const prevLeaderRef = useRef<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const startedRef = useRef(false);

  // Fetch activities to get progress text
  const { data: activities } = useListActivities({
    query: {
      queryKey: getListActivitiesQueryKey(),
      refetchInterval: competition.status === "running" ? 2000 : false,
    },
  });

  // Find the current competition's activity
  const currentActivity = activities?.find(
    (a) => a.type === "competition_run" && a.status === "running" && a.resultId === competition.id,
  );
  // Also look for by title match as fallback
  const activityProgress =
    currentActivity?.progress ??
    activities?.find(
      (a) => a.type === "competition_run" && a.status === "running",
    )?.progress;

  // Count total data items from responses
  const totalItems = competition.results?.reduce(
    (max, r) => Math.max(max, r.responses?.length ?? 0),
    0,
  ) ?? 0;

  // Estimate total items from progress string if we have no results yet
  const estimatedTotal = (() => {
    if (totalItems > 0) return totalItems;
    if (activityProgress) {
      const match = activityProgress.match(/(\d+)\/(\d+)/);
      if (match) return parseInt(match[2], 10);
    }
    return 0;
  })();

  // Generate start event
  useEffect(() => {
    if (competition.status === "running" && !startedRef.current) {
      startedRef.current = true;
      const models = competition.contestantModels.map((m) => shortName(m.modelName)).join(", ");
      const judges = competition.judgeModels.map((m) => shortName(m.modelName)).join(", ");
      setEvents([
        {
          id: Date.now(),
          timestamp: Date.now(),
          type: "start",
          message: `>>> Willkommen zum Wettbewerb "${competition.name}"! ${competition.contestantModels.length} Teilnehmer treten an: ${models}. Die Jury (${judges}) steht bereit. LOS GEHT'S!`,
          highlight: true,
        },
      ]);
    }
  }, [competition.status, competition.name, competition.contestantModels, competition.judgeModels]);

  // Track new results and generate commentary
  useEffect(() => {
    if (competition.status !== "running" && competition.status !== "completed") return;
    if (!competition.results || competition.results.length === 0) return;

    const newEvents: CommentaryEvent[] = [];
    const prevMap = prevResultsRef.current;

    for (const result of competition.results) {
      const key = result.modelId;
      const prevCount = prevMap.get(key) ?? 0;
      const currentCount = result.responses?.length ?? 0;

      // Generate commentary for each new response
      for (let i = prevCount; i < currentCount; i++) {
        const respEvents = generateResponseCommentary(
          result,
          i,
          estimatedTotal || currentCount,
          competition.results,
        );
        newEvents.push(...respEvents);
      }

      prevMap.set(key, currentCount);
    }

    // Check for leader change
    const sorted = [...competition.results]
      .filter((r) => r.avgQuality > 0)
      .sort((a, b) => b.avgQuality - a.avgQuality);
    if (sorted.length > 0) {
      const leader = sorted[0].modelName;
      const leaderEvent = generateLeaderChangeCommentary(
        prevLeaderRef.current,
        leader,
        sorted[0].avgQuality,
      );
      if (leaderEvent) newEvents.push(leaderEvent);
      prevLeaderRef.current = leader;
    }

    if (newEvents.length > 0) {
      setEvents((prev) => [...prev, ...newEvents]);
    }
  }, [competition.results, competition.status, estimatedTotal]);

  // Completion event
  useEffect(() => {
    if (competition.status === "completed" && startedRef.current) {
      const sorted = [...(competition.results || [])]
        .filter((r) => r.avgQuality > 0)
        .sort((a, b) => b.avgQuality - a.avgQuality);
      const winner = sorted[0];
      if (winner) {
        setEvents((prev) => [
          ...prev,
          {
            id: Date.now(),
            timestamp: Date.now(),
            type: "finish",
            message: `== DER WETTBEWERB IST VORBEI! ${shortName(winner.modelName)} gewinnt mit einer Durchschnittsbewertung von ${winner.avgQuality.toFixed(1)}/10! Was für ein Kampf!`,
            highlight: true,
          },
        ]);
      }
      startedRef.current = false;
    }
  }, [competition.status, competition.results]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [events]);

  // Find current leader
  const currentLeader = [...(competition.results || [])]
    .filter((r) => r.avgQuality > 0)
    .sort((a, b) => b.avgQuality - a.avgQuality)[0]?.modelId;

  const isRunning = competition.status === "running";

  return (
    <RetroWindow title="LIVE-KOMMENTATOR">
      <div className="flex flex-col gap-3">
        {/* Status Bar */}
        {isRunning && (
          <div className="border-[2px] border-mac-black bg-dither p-2">
            <div className="bg-mac-white border-[2px] border-mac-black px-3 py-1.5 flex items-center gap-2">
              <Mic className="w-4 h-4 animate-pulse" />
              <span className="font-display text-sm uppercase">
                {activityProgress ?? "Wettbewerb läuft..."}
              </span>
              <span className="ml-auto">
                <span className="inline-block w-2 h-2 bg-mac-black rounded-full animate-ping" />
              </span>
            </div>
          </div>
        )}

        {/* Model Progress Bars */}
        {(competition.results?.length ?? 0) > 0 && (
          <div className="border-[2px] border-mac-black p-2 bg-mac-white space-y-1">
            <h4 className="font-display text-xs uppercase mb-1 border-b-[2px] border-mac-black pb-1">
              Fortschritt der Teilnehmer
            </h4>
            {competition.results!.map((r) => (
              <ModelProgressBar
                key={r.modelId}
                result={r}
                totalItems={estimatedTotal}
                isLeading={r.modelId === currentLeader}
              />
            ))}
          </div>
        )}

        {/* Speed + Quality side by side */}
        {(competition.results?.length ?? 0) > 0 &&
          competition.results!.some((r) => r.avgSpeed > 0) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <SpeedComparisonTable results={competition.results!} />
              <QualityRanking results={competition.results!} />
            </div>
          )}

        {/* Commentary Feed */}
        <div className="border-[2px] border-mac-black bg-mac-black/5">
          <div className="bg-mac-black text-mac-white px-3 py-1 font-display text-xs uppercase flex items-center gap-1">
            <Mic className="w-3 h-3" /> Live-Ticker
          </div>
          <div ref={scrollRef} className="max-h-64 overflow-y-auto p-2 space-y-1.5">
            {events.length === 0 && (
              <p className="text-sm text-mac-black/40 italic p-2">
                Warte auf den Startschuss...
              </p>
            )}
            {events.map((event) => (
              <div
                key={event.id}
                className={`text-sm font-sans leading-snug px-2 py-1 border-l-[3px] ${
                  event.highlight
                    ? "border-mac-black bg-mac-black/10 font-bold"
                    : "border-mac-black/30"
                } ${event.type === "finish" ? "bg-mac-black text-mac-white border-mac-black px-3 py-2 font-display uppercase" : ""}`}
              >
                <span className="text-[10px] text-mac-black/40 mr-2 font-display">
                  {new Date(event.timestamp).toLocaleTimeString("de-DE", {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })}
                </span>
                {event.message}
              </div>
            ))}

            {/* Blinking cursor at end while running */}
            {isRunning && (
              <div className="px-2 py-1">
                <span className="inline-block w-2 h-4 bg-mac-black animate-blink" />
              </div>
            )}
          </div>
        </div>
      </div>
    </RetroWindow>
  );
}
