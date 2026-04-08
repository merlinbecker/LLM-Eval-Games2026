import { Link } from "wouter";
import { useListCompetitions, getGetCompetitionQueryOptions } from "@workspace/api-client-react";
import type { CompetitionDetail } from "@workspace/api-client-react";
import { useQueries } from "@tanstack/react-query";
import { RetroWindow, RetroButton, RetroBadge, TrophyIcon, RobotIcon } from "@/components/retro";
import { formatDate } from "@/lib/utils";
import { sortByQuality } from "@/lib/competition-utils";
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
      const sorted = sortByQuality([...data.results]);
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
          <div className="relative w-full max-w-3xl z-10 mt-16">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:items-end">
              {[topModels[1], topModels[0], topModels[2]].map((model, idx) => {
                const label = idx === 1 ? "Gold" : idx === 0 ? "Silber" : "Bronze";
                return (
                  <div
                    key={idx}
                    className={`flex flex-col items-center text-center bg-mac-white border-2 border-mac-black px-3 py-3 retro-shadow-sm ${
                      idx === 1 ? "sm:-translate-y-8" : idx === 0 ? "sm:translate-y-3" : "sm:translate-y-8"
                    }`}
                  >
                    <span className="font-display text-xs uppercase mb-1">{label}</span>
                    {model ? (
                      <RobotIcon className="w-16 h-16 text-mac-black" />
                    ) : (
                      <span className="w-16 h-16 flex items-center justify-center text-4xl text-mac-black select-none">?</span>
                    )}
                    {model ? (
                      <>
                        <p className="font-display text-xs uppercase mt-2 truncate w-full" title={model.modelName}>{model.modelName}</p>
                        <p className="text-[10px] mt-1">G: {model.gold} S: {model.silver} B: {model.bronze}</p>
                      </>
                    ) : (
                      <>
                        <p className="font-display text-xs uppercase mt-2 text-mac-black/40">---</p>
                        <p className="text-[10px] mt-1 text-mac-black/40">G: - S: - B: -</p>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
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
