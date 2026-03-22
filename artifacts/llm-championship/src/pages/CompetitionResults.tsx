import { useRoute } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { 
  useGetCompetition, 
  useRunCompetition,
  getGetCompetitionQueryKey
} from "@workspace/api-client-react";
import { RetroWindow, RetroButton, RetroBadge } from "@/components/retro";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from "recharts";
import { Play, Loader2, Award, Zap, Coins } from "lucide-react";

export default function CompetitionResults() {
  const [, params] = useRoute("/competitions/:id");
  const id = Number(params?.id);
  
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

  // Format data for radar chart
  const radarData = comp.results?.map(r => ({
    name: r.modelName.split('/').pop() || r.modelName, // short name
    speedScore: Math.max(0, 10 - (r.avgSpeed / 1000)), // dummy normalization: 10s = 0, 0s = 10
    costScore: Math.max(0, 10 - (r.avgCost * 100)), // dummy normalization
    qualityScore: r.avgQuality,
  })) || [];

  // Flattening for Recharts Radar
  const chartData = [
    { subject: 'QUALITY', ...radarData.reduce((acc, curr) => ({...acc, [curr.name]: curr.qualityScore}), {}) },
    { subject: 'SPEED', ...radarData.reduce((acc, curr) => ({...acc, [curr.name]: curr.speedScore}), {}) },
    { subject: 'EFFICIENCY (COST)', ...radarData.reduce((acc, curr) => ({...acc, [curr.name]: curr.costScore}), {}) },
  ];

  // Colors mapping (monochrome using varying stroke widths/dash arrays later, but recharts needs valid css)
  // We'll use black strokes and varying stroke patterns.
  const strokes = [
    { color: '#000000', dash: [] },
    { color: '#000000', dash: [5, 5] },
    { color: '#000000', dash: [2, 2] },
    { color: '#000000', dash: [10, 5, 2, 5] }
  ];

  // Determine winners based on Quality
  const sortedResults = [...(comp.results || [])].sort((a, b) => b.avgQuality - a.avgQuality);
  const robotImages = ['robot-1.png', 'robot-2.png', 'robot-3.png'];

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      {/* Header Bar */}
      <div className="border-[4px] border-black bg-white p-6 flex flex-col md:flex-row justify-between items-center retro-shadow">
        <div>
          <h1 className="text-4xl font-display uppercase tracking-widest">{comp.name}</h1>
          <div className="flex space-x-4 mt-2 font-bold text-lg">
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
          <div className="mt-4 md:mt-0 border-4 border-black p-4 bg-dither text-center">
            <div className="bg-white px-4 py-2 border-2 border-black flex items-center font-display text-xl">
              <Loader2 className="w-6 h-6 mr-3 animate-spin" /> EVALUATING...
            </div>
          </div>
        )}
      </div>

      {(isCompleted || (isRunning && hasResults)) && (
        <>
          {/* PODIUM SECTION */}
          <RetroWindow title="CEREMONY" className="bg-white">
            <div className="relative w-full h-[500px] border-b-[3px] border-black bg-dither overflow-hidden flex flex-col items-center justify-end p-8">
              
              <div className="flex items-end justify-center w-full max-w-4xl relative z-20 space-x-2 md:space-x-8 pb-16">
                {/* 2nd Place */}
                {sortedResults[1] && (
                  <div className="flex flex-col items-center translate-y-12">
                    <img src={`${import.meta.env.BASE_URL}images/${robotImages[1]}`} alt="2nd" className="w-32 h-32 border-4 border-black bg-white shadow-[-8px_8px_0_0_#000]" />
                    <div className="mt-4 bg-white border-4 border-black p-2 text-center w-40 font-bold uppercase z-30">
                      <p className="font-display text-xl">2ND PLACE</p>
                      <p className="text-sm truncate">{sortedResults[1].modelName.split('/').pop()}</p>
                      <p className="text-xl">{sortedResults[1].avgQuality.toFixed(1)}/10</p>
                    </div>
                  </div>
                )}
                
                {/* 1st Place */}
                {sortedResults[0] && (
                  <div className="flex flex-col items-center z-30">
                    <img src={`${import.meta.env.BASE_URL}images/${robotImages[0]}`} alt="1st" className="w-40 h-40 border-4 border-black bg-white shadow-[-8px_8px_0_0_#000]" />
                    <div className="mt-4 bg-black text-white border-4 border-black p-3 text-center w-48 font-bold uppercase">
                      <p className="font-display text-2xl">1ST PLACE</p>
                      <p className="text-sm truncate">{sortedResults[0].modelName.split('/').pop()}</p>
                      <p className="text-2xl">{sortedResults[0].avgQuality.toFixed(1)}/10</p>
                    </div>
                  </div>
                )}

                {/* 3rd Place */}
                {sortedResults[2] && (
                  <div className="flex flex-col items-center translate-y-24">
                    <img src={`${import.meta.env.BASE_URL}images/${robotImages[2]}`} alt="3rd" className="w-28 h-28 border-4 border-black bg-white shadow-[-8px_8px_0_0_#000]" />
                    <div className="mt-4 bg-white border-4 border-black p-2 text-center w-36 font-bold uppercase z-30">
                      <p className="font-display text-xl">3RD PLACE</p>
                      <p className="text-sm truncate">{sortedResults[2].modelName.split('/').pop()}</p>
                      <p className="text-xl">{sortedResults[2].avgQuality.toFixed(1)}/10</p>
                    </div>
                  </div>
                )}
              </div>
              <img src={`${import.meta.env.BASE_URL}images/podium.png`} className="absolute bottom-0 w-full max-w-4xl h-auto z-10" alt="podium base" />
            </div>
          </RetroWindow>

          {/* METRICS DASHBOARD */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <RetroWindow title="PERFORMANCE RADAR">
              <div className="h-[400px] w-full bg-white flex items-center justify-center p-4">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="70%" data={chartData}>
                    <PolarGrid stroke="#000" strokeWidth={2} />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#000', fontSize: 16, fontFamily: 'Silkscreen', fontWeight: 'bold' }} />
                    <PolarRadiusAxis angle={30} domain={[0, 10]} stroke="#000" />
                    {radarData.map((d, i) => (
                      <Radar
                        key={d.name}
                        name={d.name}
                        dataKey={d.name}
                        stroke={strokes[i % strokes.length].color}
                        strokeWidth={4}
                        strokeDasharray={strokes[i % strokes.length].dash.join(' ')}
                        fill="transparent"
                      />
                    ))}
                  </RadarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 p-4 border-[3px] border-black bg-black/5">
                <h4 className="font-display uppercase mb-2">Legend:</h4>
                <div className="flex flex-wrap gap-4">
                  {radarData.map((d, i) => (
                    <div key={d.name} className="flex items-center space-x-2">
                      <div 
                        className="w-8 h-1 bg-black" 
                        style={{ borderBottom: `${strokes[i % strokes.length].dash.length ? '4px dashed white' : 'none'}` }} // hacky visualization
                      />
                      <span className="font-bold uppercase text-sm">{d.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </RetroWindow>

            <RetroWindow title="TELEMETRY DETAILS">
              <div className="flex flex-col space-y-4 overflow-y-auto max-h-[500px] pr-2">
                {sortedResults.map((r, i) => (
                  <div key={r.modelId} className="border-[3px] border-black p-4 flex flex-col relative bg-white retro-shadow-sm">
                    <div className="absolute top-0 right-0 bg-black text-white px-2 py-1 font-display">
                      RANK #{i+1}
                    </div>
                    <h3 className="font-display text-2xl truncate pr-20">{r.modelName.split('/').pop()}</h3>
                    <p className="text-sm text-black/60 mb-4 truncate">{r.modelId}</p>
                    
                    <div className="grid grid-cols-3 gap-2 text-center border-t-[3px] border-black pt-4">
                      <div className="flex flex-col items-center">
                        <Award className="w-8 h-8 mb-1" />
                        <span className="font-display text-2xl">{r.avgQuality.toFixed(1)}</span>
                        <span className="text-xs uppercase font-bold">Quality</span>
                      </div>
                      <div className="flex flex-col items-center border-l-[3px] border-black border-r-[3px]">
                        <Zap className="w-8 h-8 mb-1" />
                        <span className="font-display text-2xl">{Math.round(r.avgSpeed)}</span>
                        <span className="text-xs uppercase font-bold">Speed (ms)</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <Coins className="w-8 h-8 mb-1" />
                        <span className="font-display text-2xl">{(r.avgCost * 1000).toFixed(2)}</span>
                        <span className="text-xs uppercase font-bold">Cost/1k</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </RetroWindow>
          </div>

          {/* DETAILED LOGS */}
          <RetroWindow title="RAW JUDGMENT LOGS">
            <div className="space-y-12">
              {comp.results[0]?.responses.map((_, itemIndex) => (
                <div key={itemIndex} className="border-[4px] border-black bg-white p-6 retro-shadow">
                  <h3 className="text-3xl font-display uppercase border-b-[4px] border-black pb-2 mb-6">
                    Test Item #{itemIndex + 1}
                  </h3>
                  
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                    {comp.results.map(modelResult => {
                      const response = modelResult.responses[itemIndex];
                      return (
                        <div key={modelResult.modelId} className="border-[3px] border-black p-4 flex flex-col">
                          <h4 className="font-bold text-xl uppercase mb-2 bg-black text-white p-1 px-2 inline-block self-start">
                            {modelResult.modelName.split('/').pop()}
                          </h4>
                          
                          <div className="bg-black/5 p-4 border-[2px] border-black font-mono text-base mb-4 max-h-48 overflow-y-auto">
                            {response.response}
                          </div>
                          
                          <div className="mt-auto border-t-[3px] border-black pt-4">
                            <h5 className="font-display uppercase mb-2">Judges:</h5>
                            <div className="space-y-3">
                              {response.judgeScores.map((score, jIdx) => (
                                <div key={jIdx} className="text-sm flex border-b-2 border-dashed border-black pb-2">
                                  <div className="w-12 font-display text-2xl font-bold">{score.score}</div>
                                  <div className="flex-1">
                                    <div className="font-bold uppercase mb-1">{score.judgeModelName.split('/').pop()}</div>
                                    <div className="italic leading-snug">{score.reasoning}</div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </RetroWindow>
        </>
      )}
    </div>
  );
}
