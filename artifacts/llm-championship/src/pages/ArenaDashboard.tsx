import { Link } from "wouter";
import { useListCompetitions, getGetCompetitionQueryOptions } from "@workspace/api-client-react";
import type { CompetitionDetail } from "@workspace/api-client-react";
import { useQueries } from "@tanstack/react-query";
import { RetroWindow, RetroButton, RetroBadge, PodiumIcon, TrophyIcon } from "@/components/retro";
import { formatDate } from "@/lib/utils";
import { Activity, TerminalSquare } from "lucide-react";

function useOverallChampions(competitions: { id: number; status: string }[]) {
  const completedComps = competitions.filter(c => c.status === 'completed');
  const queries = useQueries({
    queries: completedComps.map(c => getGetCompetitionQueryOptions(c.id)),
  });

  const medalMap = new Map<string, { gold: number; silver: number; bronze: number; modelName: string }>();

  queries.forEach(query => {
    const data = query.data as CompetitionDetail | undefined;
    if (data?.results?.length) {
      const sorted = [...data.results].sort((a, b) => b.avgQuality - a.avgQuality);
      sorted.slice(0, 3).forEach((result, index) => {
        const key = result.modelName;
        const existing = medalMap.get(key) || { gold: 0, silver: 0, bronze: 0, modelName: key };
        if (index === 0) existing.gold++;
        else if (index === 1) existing.silver++;
        else if (index === 2) existing.bronze++;
        medalMap.set(key, existing);
      });
    }
  });

  return [...medalMap.values()]
    .sort((a, b) => (b.gold * 3 + b.silver * 2 + b.bronze) - (a.gold * 3 + a.silver * 2 + a.bronze))
    .slice(0, 3);
}

export default function ArenaDashboard() {
  const { data: competitions, isLoading } = useListCompetitions();
  const competitionList = Array.isArray(competitions) ? competitions : [];
  const topModels = useOverallChampions(competitionList);

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      {/* Hero Podium Section */}
      <RetroWindow title="THE ARENA" className="bg-mac-white">
        <div className="relative w-full h-[400px] border-b-[3px] border-mac-black bg-dither overflow-hidden flex flex-col items-center justify-end p-8">
          <div className="absolute top-4 left-4 bg-mac-white p-2 border-2 border-mac-black retro-shadow-sm">
            <h1 className="text-3xl font-display uppercase tracking-widest">LLM EVAL GAMES '26</h1>
            <p className="font-sans text-xl uppercase">1-Bit Large Language Model Evaluation</p>
          </div>
          {/* Podium with overall champions */}
          <div className="relative w-full max-w-md z-10">
            {topModels.length > 0 && (
              <div className="flex justify-between items-end mb-1 px-1">
                {/* 2nd place label */}
                <div className="w-[35%] text-center">
                  {topModels[1] && (
                    <div className="bg-mac-white border-2 border-mac-black px-1 py-0.5 retro-shadow-sm">
                      <p className="font-display text-xs uppercase truncate" title={topModels[1].modelName}>{topModels[1].modelName}</p>
                      <p className="text-[10px]">🥈{topModels[1].gold}G {topModels[1].silver}S {topModels[1].bronze}B</p>
                    </div>
                  )}
                </div>
                {/* 1st place label */}
                <div className="w-[30%] text-center">
                  {topModels[0] && (
                    <div className="bg-mac-white border-2 border-mac-black px-1 py-0.5 retro-shadow-sm">
                      <p className="font-display text-xs uppercase truncate" title={topModels[0].modelName}>{topModels[0].modelName}</p>
                      <p className="text-[10px]">🥇{topModels[0].gold}G {topModels[0].silver}S {topModels[0].bronze}B</p>
                    </div>
                  )}
                </div>
                {/* 3rd place label */}
                <div className="w-[35%] text-center">
                  {topModels[2] && (
                    <div className="bg-mac-white border-2 border-mac-black px-1 py-0.5 retro-shadow-sm">
                      <p className="font-display text-xs uppercase truncate" title={topModels[2].modelName}>{topModels[2].modelName}</p>
                      <p className="text-[10px]">🥉{topModels[2].gold}G {topModels[2].silver}S {topModels[2].bronze}B</p>
                    </div>
                  )}
                </div>
              </div>
            )}
            <PodiumIcon className="w-full h-auto text-mac-black" />
          </div>
        </div>
        <div className="p-6 bg-mac-white grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link href="/gateways" className="border-[3px] border-mac-black p-4 flex items-start space-x-4 hover:bg-mac-black/5 transition-colors cursor-pointer">
            <TerminalSquare className="w-8 h-8 flex-shrink-0" />
            <div>
              <h3 className="font-display font-bold uppercase mb-1">1. Configure</h3>
              <p className="text-lg leading-tight">Setup your Gateways &amp; Models.</p>
            </div>
          </Link>
          <Link href="/datasets" className="border-[3px] border-mac-black p-4 flex items-start space-x-4 hover:bg-mac-black/5 transition-colors cursor-pointer">
            <Activity className="w-8 h-8 flex-shrink-0" />
            <div>
              <h3 className="font-display font-bold uppercase mb-1">2. Evaluate</h3>
              <p className="text-lg leading-tight">Upload datasets &amp; run tests.</p>
            </div>
          </Link>
          <Link href="/competitions/new" className="border-[3px] border-mac-black p-4 flex items-start space-x-4 bg-mac-black text-mac-white hover:bg-mac-black/90 transition-colors cursor-pointer">
            <TrophyIcon className="w-8 h-8 flex-shrink-0" />
            <div>
              <h3 className="font-display font-bold uppercase mb-1">3. Start the Games</h3>
              <p className="text-lg leading-tight">Analyze speed, cost &amp; quality.</p>
            </div>
          </Link>
        </div>
      </RetroWindow>

      {/* Recent Competitions */}
      <RetroWindow title="RECENT COMPETITIONS">
        {isLoading ? (
          <div className="p-8 text-center font-display text-2xl animate-pulse">LOADING LOGS...</div>
        ) : competitionList.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center">
            <TrophyIcon className="w-16 h-16 mb-4" />
            <p className="text-2xl mb-6">No competitions found in the database.</p>
            <Link href="/competitions/new">
              <RetroButton size="lg">START NEW COMPETITION</RetroButton>
            </Link>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b-[3px] border-mac-black font-display text-sm">
                <th className="p-3 uppercase">ID</th>
                <th className="p-3 uppercase">Name</th>
                <th className="p-3 uppercase">Status</th>
                <th className="p-3 uppercase">Date</th>
                <th className="p-3 uppercase text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {competitionList.map((comp) => (
                <tr key={comp.id} className="border-b-2 border-mac-black/20 hover:bg-mac-black/5">
                  <td className="p-3 font-display">#{comp.id}</td>
                  <td className="p-3 font-bold uppercase">{comp.name}</td>
                  <td className="p-3">
                    <RetroBadge className={comp.status === 'completed' ? 'bg-mac-black text-mac-white' : ''}>
                      {comp.status}
                    </RetroBadge>
                  </td>
                  <td className="p-3">{formatDate(comp.createdAt)}</td>
                  <td className="p-3 text-right">
                    <Link href={`/competitions/${comp.id}`}>
                      <RetroButton size="sm">VIEW RESULTS</RetroButton>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </RetroWindow>
    </div>
  );
}
