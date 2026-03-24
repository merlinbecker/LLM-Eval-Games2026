import { useState, useEffect, useRef } from "react";
import { RetroWindow, RobotIcon } from "@/components/retro";
import type { CompetitionDetail, JudgeScore } from "@workspace/api-client-react";

// ─── HELPERS ───

function shortName(name: string): string {
  return name.split("/").pop() || name;
}

// ─── TYPES ───

interface ScoringEvent {
  id: string;
  modelName: string;
  itemIndex: number;
  totalItems: number;
  judgeScores: JudgeScore[];
}

type RevealPhase = "entering" | "revealing" | "holding" | "exiting" | "idle";

// ─── TIMING CONSTANTS ───

const JUDGE_REVEAL_DELAY = 700;
const HOLD_DURATION = 2000;
const ENTER_DURATION = 500;
const EXIT_DURATION = 500;
const MAX_QUEUE_SIZE = 4;

// ─── SINGLE JUDGE ROBOT WITH ANIMATED SCORE CARD ───

function JudgeRevealRobot({
  judgeName,
  score,
  isRevealed,
}: {
  judgeName: string;
  score: number;
  isRevealed: boolean;
}) {
  const scoreClass =
    score >= 9
      ? "bg-mac-black text-mac-white border-mac-black"
      : score <= 3
        ? "bg-mac-white text-mac-black border-dashed border-mac-black"
        : "bg-mac-white text-mac-black border-mac-black";

  return (
    <div className="flex flex-col items-center w-20">
      {/* Score card — slides up and bounces */}
      <div
        className="transition-all duration-500 ease-out"
        style={{
          opacity: isRevealed ? 1 : 0,
          transform: isRevealed
            ? "translateY(0) scale(1)"
            : "translateY(1.5rem) scale(0.7)",
        }}
      >
        <div
          className={`border-[3px] ${scoreClass} px-3 py-2 font-display text-3xl font-bold text-center min-w-[3.5rem] retro-shadow-sm ${
            isRevealed ? "animate-score-pop" : ""
          }`}
        >
          {score}
        </div>
      </div>

      {/* Arms holding the card */}
      <div className="flex justify-center overflow-hidden">
        <div
          className="w-1 bg-mac-black transition-all duration-300"
          style={{ height: isRevealed ? "0.75rem" : "0" }}
        />
        <div className="w-4" />
        <div
          className="w-1 bg-mac-black transition-all duration-300"
          style={{ height: isRevealed ? "0.75rem" : "0" }}
        />
      </div>

      {/* Robot body */}
      <RobotIcon
        className={`w-14 h-14 text-mac-black transition-transform duration-300 ${
          isRevealed ? "scale-110" : ""
        }`}
      />

      {/* Judge name */}
      <p
        className="text-xs font-bold uppercase mt-1 text-center truncate w-full"
        title={judgeName}
      >
        {shortName(judgeName)}
      </p>
    </div>
  );
}

// ─── MAIN COMPONENT ───

export function JudgesScoreReveal({
  competition,
  onActiveChange,
}: {
  competition: CompetitionDetail;
  onActiveChange?: (active: boolean) => void;
}) {
  const [queue, setQueue] = useState<ScoringEvent[]>([]);
  const [currentEvent, setCurrentEvent] = useState<ScoringEvent | null>(null);
  const [phase, setPhase] = useState<RevealPhase>("idle");
  const [revealedCount, setRevealedCount] = useState(0);
  const prevResultsRef = useRef<Map<string, number>>(new Map());

  // ─── Detect new scores and enqueue ───
  useEffect(() => {
    if (!competition.results || competition.results.length === 0) return;
    if (competition.status !== "running") return;

    const newEvents: ScoringEvent[] = [];
    const prevMap = prevResultsRef.current;

    const estimatedTotal = competition.results.reduce(
      (max, r) => Math.max(max, r.responses?.length ?? 0),
      0,
    );

    for (const result of competition.results) {
      const key = result.modelId;
      const prevCount = prevMap.get(key) ?? 0;
      const currentCount = result.responses?.length ?? 0;

      for (let i = prevCount; i < currentCount; i++) {
        const resp = result.responses[i];
        if (resp?.judgeScores?.length > 0) {
          newEvents.push({
            id: `${key}-${i}`,
            modelName: result.modelName,
            itemIndex: i,
            totalItems: estimatedTotal,
            judgeScores: resp.judgeScores,
          });
        }
      }

      prevMap.set(key, currentCount);
    }

    if (newEvents.length > 0) {
      setQueue((prev) => {
        const combined = [...prev, ...newEvents];
        return combined.length > MAX_QUEUE_SIZE
          ? combined.slice(-MAX_QUEUE_SIZE)
          : combined;
      });
    }
  }, [competition.results, competition.status]);

  // ─── Dequeue next event when idle ───
  useEffect(() => {
    if (phase === "idle" && queue.length > 0 && !currentEvent) {
      const [next, ...rest] = queue;
      setQueue(rest);
      setCurrentEvent(next);
      setRevealedCount(0);
      setPhase("entering");
    }
  }, [phase, queue, currentEvent]);

  // ─── Animation state machine ───
  useEffect(() => {
    if (!currentEvent) return;

    let timer: ReturnType<typeof setTimeout>;

    switch (phase) {
      case "entering":
        timer = setTimeout(() => setPhase("revealing"), ENTER_DURATION);
        break;

      case "revealing":
        if (revealedCount < currentEvent.judgeScores.length) {
          timer = setTimeout(
            () => setRevealedCount((c) => c + 1),
            JUDGE_REVEAL_DELAY,
          );
        } else {
          setPhase("holding");
        }
        break;

      case "holding":
        timer = setTimeout(() => setPhase("exiting"), HOLD_DURATION);
        break;

      case "exiting":
        timer = setTimeout(() => {
          setCurrentEvent(null);
          setPhase("idle");
        }, EXIT_DURATION);
        break;
    }

    return () => clearTimeout(timer);
  }, [phase, revealedCount, currentEvent]);

  // Notify parent about active state
  const isActive = currentEvent !== null;
  useEffect(() => {
    onActiveChange?.(isActive);
  }, [isActive, onActiveChange]);

  // ─── Nothing to show ───
  if (!currentEvent) return null;

  // Running average of revealed scores
  const revealedScores = currentEvent.judgeScores.slice(0, revealedCount);
  const runningAvg =
    revealedScores.length > 0
      ? revealedScores.reduce((s, j) => s + j.score, 0) / revealedScores.length
      : null;

  // Container opacity and position for enter/exit
  const containerStyle: React.CSSProperties = {
    opacity: phase === "entering" || phase === "exiting" ? 0 : 1,
    transform:
      phase === "entering"
        ? "translateY(1rem)"
        : phase === "exiting"
          ? "translateY(-1rem)"
          : "translateY(0)",
    transition: `opacity ${ENTER_DURATION}ms ease-out, transform ${ENTER_DURATION}ms ease-out`,
  };

  return (
    <div style={containerStyle}>
      <RetroWindow
        title={`WERTUNG — ${shortName(currentEvent.modelName)} — ITEM #${currentEvent.itemIndex + 1}/${currentEvent.totalItems}`}
      >
        <div className="py-6 px-4">
          {/* Running average score */}
          <div className="text-center mb-6">
            <p className="font-display text-sm uppercase tracking-widest mb-1">
              Durchschnittswertung
            </p>
            <p className="font-display text-5xl transition-all duration-500">
              {runningAvg !== null ? (
                <>
                  {runningAvg.toFixed(1)}
                  <span className="text-2xl">/10</span>
                </>
              ) : (
                <span className="animate-pulse">—</span>
              )}
            </p>
          </div>

          {/* Judges row */}
          <div className="flex flex-wrap justify-center gap-6 md:gap-10 py-4">
            {currentEvent.judgeScores.map((score, idx) => (
              <JudgeRevealRobot
                key={`${currentEvent.id}-judge-${idx}`}
                judgeName={score.judgeModelName}
                score={score.score}
                isRevealed={idx < revealedCount}
              />
            ))}
          </div>

          {/* Queue indicator */}
          {queue.length > 0 && (
            <p className="text-center text-xs font-display uppercase text-mac-black/50 mt-4">
              {queue.length} weitere Wertung{queue.length > 1 ? "en" : ""} in
              der Warteschlange
            </p>
          )}
        </div>
      </RetroWindow>
    </div>
  );
}
