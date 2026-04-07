import { useState } from "react";
import { useRoute } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { 
  useGetCompetition, 
  useRunCompetition,
  useListActivities,
  getGetCompetitionQueryKey,
  getListActivitiesQueryKey
} from "@workspace/api-client-react";
import { RetroButton, RetroBadge } from "@/components/retro";
import { Commentator } from "@/components/Commentator";
import { JudgesScoreReveal } from "@/components/JudgesScoreReveal";
import { Play, Loader2, BarChart3, Trophy, FileText } from "lucide-react";

import { RunProgressView } from "./competition/RunProgressView";
import { CeremonyHeader } from "./competition/CeremonyHeader";
import { OverviewTab } from "./competition/OverviewTab";
import { WinnersTab } from "./competition/WinnersTab";
import { DetailsTab } from "./competition/DetailsTab";
import type { CeremonyTab } from "./competition/types";

import { sortByQuality } from "@/lib/competition-utils";

const RUNNING_POLL_INTERVAL = 2000;

// ─── TAB CONFIG ───

const TAB_CONFIG: { id: CeremonyTab; label: string; icon: React.ReactNode }[] = [
  { id: "overview", label: "ÜBERSICHT", icon: <BarChart3 className="w-4 h-4 mr-2 inline" /> },
  { id: "winners", label: "GEWINNER & JUDGES", icon: <Trophy className="w-4 h-4 mr-2 inline" /> },
  { id: "details", label: "DETAIL-ANTWORTEN", icon: <FileText className="w-4 h-4 mr-2 inline" /> },
];

// ═══════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════

export default function CompetitionResults() {
  const [, params] = useRoute("/competitions/:id");
  const id = Number(params?.id);
  const [activeTab, setActiveTab] = useState<CeremonyTab>("overview");
  
  const queryClient = useQueryClient();
  const { data: comp, isLoading } = useGetCompetition(id, {
    query: { queryKey: getGetCompetitionQueryKey(id), refetchInterval: (query) => query.state.data?.status === 'running' ? RUNNING_POLL_INTERVAL : false }
  });
  const runMutation = useRunCompetition();

  // Fetch activities to get progress text for identifying active model
  const { data: activities } = useListActivities({
    query: {
      queryKey: getListActivitiesQueryKey(),
      refetchInterval: comp?.status === "running" ? RUNNING_POLL_INTERVAL : false,
    },
  });
  const runningActivity = activities?.find(
    (a) => a.type === "competition_run" && a.status === "running" && a.resultId === id,
  ) ?? activities?.find(
    (a) => a.type === "competition_run" && a.status === "running",
  );
  const activityProgress = runningActivity?.progress;

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
  const sortedResults = sortByQuality([...(comp.results || [])]);

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      {/* Header Bar — used as anchor for the overlay */}
      <div className="relative">
        <div className={`border-[4px] border-mac-black p-6 flex flex-col md:flex-row justify-between items-center retro-shadow ${isRunning ? "bg-dither" : "bg-mac-white"}`}>
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
            <div className="mt-4 md:mt-0 border-4 border-mac-black p-4 bg-mac-black text-mac-white text-center">
              <div className="px-4 py-2 flex items-center font-display text-xl">
                <Loader2 className="w-6 h-6 mr-3 animate-spin" /> WETTBEWERB LÄUFT
              </div>
            </div>
          )}
        </div>

        {/* Judges Score Overlay — floats above the header, anchored to bottom */}
        {isRunning && <JudgesScoreReveal competition={comp} />}
      </div>

      {/* ─── RUNNING STATE: Live progress only, no final results ─── */}
      {isRunning && (
        <>
          <Commentator competition={comp} />
          <RunProgressView comp={comp} activeModelProgress={activityProgress} />
        </>
      )}

      {/* ─── COMPLETED STATE: Ceremony + results tabs ─── */}
      {isCompleted && (
        <>
          {/* Siegerehrung */}
          <CeremonyHeader sortedResults={sortedResults} />

          {/* Live Commentator with final results */}
          <Commentator competition={comp} />

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
