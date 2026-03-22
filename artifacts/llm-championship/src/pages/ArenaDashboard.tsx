import { Link } from "wouter";
import { useListCompetitions } from "@workspace/api-client-react";
import { RetroWindow, RetroButton, RetroBadge } from "@/components/retro";
import { formatDate } from "@/lib/utils";
import { Trophy, Activity, TerminalSquare } from "lucide-react";

export default function ArenaDashboard() {
  const { data: competitions, isLoading } = useListCompetitions();

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      {/* Hero Podium Section */}
      <RetroWindow title="THE ARENA" className="bg-white">
        <div className="relative w-full h-[400px] border-b-[3px] border-black bg-dither overflow-hidden flex flex-col items-center justify-end p-8">
          <div className="absolute top-4 left-4 bg-white p-2 border-2 border-black retro-shadow-sm">
            <h1 className="text-3xl font-display uppercase tracking-widest">WINTER GAMES '85</h1>
            <p className="font-sans text-xl uppercase">1-Bit Large Language Model Evaluation</p>
          </div>
          
          <img 
            src={`${import.meta.env.BASE_URL}images/podium.png`}
            alt="Olympic Podium"
            className="w-full max-w-2xl h-auto relative z-10"
          />
          
          {/* Decorative robots placed absolutely over the podium image if we had exact coords, 
              but we'll just show them prominently in the results page instead. */}
        </div>
        <div className="p-6 bg-white grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="border-[3px] border-black p-4 flex items-start space-x-4">
            <TerminalSquare className="w-8 h-8 flex-shrink-0" />
            <div>
              <h3 className="font-display font-bold uppercase mb-1">1. Configure</h3>
              <p className="text-lg leading-tight">Setup your Gateways & Models.</p>
            </div>
          </div>
          <div className="border-[3px] border-black p-4 flex items-start space-x-4">
            <Activity className="w-8 h-8 flex-shrink-0" />
            <div>
              <h3 className="font-display font-bold uppercase mb-1">2. Evaluate</h3>
              <p className="text-lg leading-tight">Upload datasets & run tests.</p>
            </div>
          </div>
          <div className="border-[3px] border-black p-4 flex items-start space-x-4 bg-black text-white">
            <Trophy className="w-8 h-8 flex-shrink-0" />
            <div>
              <h3 className="font-display font-bold uppercase mb-1">3. Crown Victor</h3>
              <p className="text-lg leading-tight">Analyze speed, cost & quality.</p>
            </div>
          </div>
        </div>
      </RetroWindow>

      {/* Recent Competitions */}
      <RetroWindow title="RECENT COMPETITIONS">
        {isLoading ? (
          <div className="p-8 text-center font-display text-2xl animate-pulse">LOADING LOGS...</div>
        ) : !competitions || competitions.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center">
            <Trophy className="w-16 h-16 mb-4" />
            <p className="text-2xl mb-6">No competitions found in the database.</p>
            <Link href="/competitions/new">
              <RetroButton size="lg">START NEW COMPETITION</RetroButton>
            </Link>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b-[3px] border-black font-display text-sm">
                <th className="p-3 uppercase">ID</th>
                <th className="p-3 uppercase">Name</th>
                <th className="p-3 uppercase">Status</th>
                <th className="p-3 uppercase">Date</th>
                <th className="p-3 uppercase text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {competitions.map((comp) => (
                <tr key={comp.id} className="border-b-2 border-black/20 hover:bg-black/5">
                  <td className="p-3 font-display">#{comp.id}</td>
                  <td className="p-3 font-bold uppercase">{comp.name}</td>
                  <td className="p-3">
                    <RetroBadge className={comp.status === 'completed' ? 'bg-black text-white' : ''}>
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
