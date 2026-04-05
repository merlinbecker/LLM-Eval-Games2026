import { useEffect, useRef, useState } from "react";
import type { CompetitionDetail } from "@workspace/api-client-react";
import { Mic } from "lucide-react";
import { RetroWindow } from "@/components/retro";
import { shortName } from "@/lib/utils";
import { ModelProgressBar } from "./commentator/ModelProgressBar";
import { QualityRanking } from "./commentator/QualityRanking";
import { SpeedComparisonTable } from "./commentator/SpeedComparisonTable";
import {
  generateLeaderChangeCommentary,
  generateResponseCommentary,
} from "./commentator/commentary";
import type { CommentaryEvent } from "./commentator/types";
import { useCompetitionActivityProgress } from "./commentator/useCompetitionActivityProgress";

export function Commentator({ competition }: { competition: CompetitionDetail }) {
  const [events, setEvents] = useState<CommentaryEvent[]>([]);
  const prevResultsRef = useRef<Map<string, number>>(new Map());
  const prevLeaderRef = useRef<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const startedRef = useRef(false);
  const activityProgress = useCompetitionActivityProgress(competition);

  const totalItems = competition.results?.reduce(
    (max, result) => Math.max(max, result.responses?.length ?? 0),
    0,
  ) ?? 0;

  const estimatedTotal = (() => {
    if (totalItems > 0) {
      return totalItems;
    }
    if (activityProgress) {
      const match = activityProgress.match(/(\d+)\/(\d+)/);
      if (match) {
        return parseInt(match[2], 10);
      }
    }
    return 0;
  })();

  useEffect(() => {
    if (competition.status === "running" && !startedRef.current) {
      startedRef.current = true;
      const models = competition.contestantModels.map((model) => shortName(model.modelName)).join(", ");
      const judges = competition.judgeModels.map((model) => shortName(model.modelName)).join(", ");
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

  useEffect(() => {
    if (competition.status !== "running" && competition.status !== "completed") {
      return;
    }
    if (!competition.results || competition.results.length === 0) {
      return;
    }

    const newEvents: CommentaryEvent[] = [];
    const prevMap = prevResultsRef.current;

    for (const result of competition.results) {
      const prevCount = prevMap.get(result.modelId) ?? 0;
      const currentCount = result.responses?.length ?? 0;

      for (let index = prevCount; index < currentCount; index++) {
        newEvents.push(
          ...generateResponseCommentary(
            result,
            index,
            estimatedTotal || currentCount,
            competition.results,
          ),
        );
      }

      prevMap.set(result.modelId, currentCount);
    }

    const sorted = [...competition.results]
      .filter((result) => result.avgQuality > 0)
      .sort((a, b) => b.avgQuality - a.avgQuality);
    if (sorted.length > 0) {
      const leaderEvent = generateLeaderChangeCommentary(
        prevLeaderRef.current,
        sorted[0].modelName,
        sorted[0].avgQuality,
      );
      if (leaderEvent) {
        newEvents.push(leaderEvent);
      }
      prevLeaderRef.current = sorted[0].modelName;
    }

    if (newEvents.length > 0) {
      setEvents((prev) => [...prev, ...newEvents]);
    }
  }, [competition.results, competition.status, estimatedTotal]);

  useEffect(() => {
    if (competition.status === "completed" && startedRef.current) {
      const sorted = [...(competition.results || [])]
        .filter((result) => result.avgQuality > 0)
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

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [events]);

  const currentLeader = [...(competition.results || [])]
    .filter((result) => result.avgQuality > 0)
    .sort((a, b) => b.avgQuality - a.avgQuality)[0]?.modelId;
  const isRunning = competition.status === "running";

  return (
    <RetroWindow title="LIVE-KOMMENTATOR">
      <div className="flex flex-col gap-3">
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

        {(competition.results?.length ?? 0) > 0 && (
          <div className="border-[2px] border-mac-black p-2 bg-mac-white space-y-1">
            <h4 className="font-display text-xs uppercase mb-1 border-b-[2px] border-mac-black pb-1">
              Fortschritt der Teilnehmer
            </h4>
            {competition.results!.map((result) => (
              <ModelProgressBar
                key={result.modelId}
                result={result}
                totalItems={estimatedTotal}
                isLeading={result.modelId === currentLeader}
              />
            ))}
          </div>
        )}

        {(competition.results?.length ?? 0) > 0 &&
          competition.results!.some((result) => result.avgSpeed > 0) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <SpeedComparisonTable results={competition.results!} />
              <QualityRanking results={competition.results!} />
            </div>
          )}

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
                } ${
                  event.type === "finish"
                    ? "bg-mac-black text-mac-white border-mac-black px-3 py-2 font-display uppercase"
                    : ""
                }`}
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