import type { FC, ReactNode } from 'react';
import type { ActualResults, HistoricalRecord, Prediction, Race } from '../types';
import Badge from './ui/Badge';
import Button from './ui/Button';
import Card from './ui/Card';
import { getActiveRunnerCount } from '../utils/racing';

type RaceOverviewPanelProps = {
  race: Race;
  prediction: Prediction | null;
  result: HistoricalRecord | null;
  actualResults: ActualResults | null;
  isLoadingRunners: boolean;
  onLoadRunners: () => void;
  onVerify: () => void;
  canVerify: boolean;
};

const RaceOverviewPanel: FC<RaceOverviewPanelProps> = ({
  race,
  prediction,
  result,
  actualResults,
  isLoadingRunners,
  onLoadRunners,
  onVerify,
  canVerify,
}) => {
  const isAbandoned = race.status === 'abandoned' || actualResults?.winner === 'ABANDONED' || result?.actualWinner === 'ABANDONED';

  if (isAbandoned) {
    return (
      <Card as="section" className="p-8 border-red-900/30 bg-red-900/10">
        <div className="flex flex-col items-center justify-center text-center">
          <Badge tone="danger" className="mb-4">RACE ABANDONED</Badge>
          <div className="text-xl font-black text-white mb-2">This race has been cancelled</div>
          <p className="text-slate-400 max-w-md">
            The meeting or race has been abandoned. No analysis or results will be available.
          </p>
        </div>
      </Card>
    );
  }

  const buildTop3 = (winner: string, placed: string[] | undefined) => {
    const raw = [winner, ...(placed || [])].map((v) => (typeof v === 'string' ? v.trim() : '')).filter(Boolean);
    const seen = new Set<string>();
    const out: string[] = [];
    for (const name of raw) {
      const key = name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(name);
      if (out.length >= 3) break;
    }
    return out;
  };

  const aiTop3Names = prediction ? buildTop3(prediction.winner || '', prediction.placed) : [];
  
  // Helper to find horse details
  const getHorse = (name: string) => race.horses?.find(h => h.name.toLowerCase() === name.toLowerCase());

  return (
    <Card as="section" className="overflow-hidden">
      {/* Race Header */}
      <div className="relative bg-slate-900/50 p-6 border-b border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center flex-col">
              <span className="text-xs font-bold text-slate-500 uppercase">Time</span>
              <span className="text-2xl font-black text-white">{race.time}</span>
            </div>
            <div>
              <h2 className="text-2xl font-black text-white">{race.course}</h2>
              <div className="flex items-center gap-2 mt-1 text-sm font-medium text-slate-400">
                <span>{race.distance} Handicap</span>
                <span>•</span>
                <span>{race.going || 'Going Unknown'}</span>
                <span>•</span>
                <span>{race.weather || 'Weather Unknown'}</span>
              </div>
            </div>
          </div>
          
          <div className="flex gap-3">
             <Button
              variant="secondary"
              onClick={onLoadRunners}
              disabled={isLoadingRunners || race.horses.length > 0}
            >
              {race.horses.length > 0 ? `${getActiveRunnerCount(race.horses)} Runners Loaded` : isLoadingRunners ? 'Loading...' : 'Load Runners'}
            </Button>
            
            <Button
              variant="ghost"
              onClick={onVerify}
              disabled={!canVerify}
            >
              Verify Result
            </Button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Official Result Section */}
        {(result || actualResults) && (
          <div className="mb-8 animate-fade-in">
             <div className="flex items-center justify-between mb-4">
               <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">Official Result</h3>
               {result?.matched && (
                 <Badge tone="success">Prediction Match</Badge>
               )}
             </div>
             
             <div className="rounded-xl border border-slate-700 bg-slate-900/80 p-5">
                <div className="flex flex-col gap-4">
                  {/* Winner */}
                  <div className="flex items-start gap-4">
                     <div className="h-10 w-10 shrink-0 rounded-full bg-yellow-500 text-slate-900 flex items-center justify-center font-black text-lg shadow-lg shadow-yellow-500/20">1</div>
                     <div>
                        <div className="text-lg font-black text-white">
                           {result?.actualWinner || actualResults?.winner}
                        </div>
                        <div className="text-xs text-slate-400 font-bold uppercase mt-0.5">Winner</div>
                     </div>
                  </div>

                  {/* Placed */}
                  {(result?.actualPlaced || actualResults?.placed || []).map((horse, idx) => (
                    <div key={idx} className="flex items-start gap-4">
                       <div className="h-8 w-8 shrink-0 rounded-full bg-slate-700 text-slate-300 flex items-center justify-center font-bold text-sm">{idx + 2}</div>
                       <div>
                          <div className="text-base font-bold text-slate-200">{horse}</div>
                          <div className="text-xs text-slate-500 font-bold uppercase mt-0.5">Placed</div>
                       </div>
                    </div>
                  ))}

                  {/* Winning Bets */}
                  {result?.winningBets && result.winningBets.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-slate-800">
                      <div className="text-xs font-bold text-slate-500 uppercase mb-2">Winning Bets</div>
                      <div className="flex flex-wrap gap-2">
                        {result.winningBets.map(bet => (
                          <Badge key={bet} tone="success">{bet}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
             </div>
          </div>
        )}

        {/* AI Predictions Section */}
        <div className="mb-8">
           <div className="flex items-center justify-between mb-4">
             <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">
               {prediction?.source === 'local-brain'
                 ? 'Local Brain Predicted Finish'
                 : prediction?.source === 'hybrid'
                   ? 'Local + Gemini Predicted Finish'
                   : 'AI Predicted Finish'}
             </h3>
             {prediction && (
               <div className="flex items-center gap-2">
                 <Badge tone={prediction.source === 'local-brain' ? 'warning' : 'info'}>
                   {prediction.source === 'local-brain' ? 'Local Brain' : prediction.source === 'hybrid' ? 'Local + Gemini' : 'AI'}
                 </Badge>
                 <Badge tone={prediction.confidence > 70 ? 'success' : 'neutral'}>
                   {Math.round(prediction.confidence)}% Confidence
                 </Badge>
               </div>
             )}
           </div>

           {prediction ? (
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
               {/* 1st Place */}
               <div className="relative group overflow-hidden rounded-xl border border-indigo-500/30 bg-slate-900/50 p-5 hover:border-indigo-500/50 transition-colors">
                  <div className="absolute top-0 right-0 bg-indigo-500 text-white text-[10px] font-bold px-2 py-1 rounded-bl-lg">WINNER</div>
                  <div className="flex items-start gap-4">
                    <div className="h-10 w-10 shrink-0 rounded-full bg-yellow-400/10 border border-yellow-400/50 flex items-center justify-center text-yellow-400 font-black text-lg">1</div>
                    <div className="min-w-0">
                      <div className="text-lg font-black text-white truncate">{aiTop3Names[0]}</div>
                      {getHorse(aiTop3Names[0]) ? (
                        <>
                          <div className="text-xs text-slate-400 font-medium mt-0.5 truncate">
                            J: {getHorse(aiTop3Names[0])?.jockey} • T: {getHorse(aiTop3Names[0])?.trainer}
                          </div>
                          <div className="mt-2 flex gap-2">
                             <Badge tone="info">Form: {(getHorse(aiTop3Names[0])?.recentForm || []).slice(-3).join('-')}</Badge>
                             <Badge tone="neutral">Odds: {getHorse(aiTop3Names[0])?.currentOdds}</Badge>
                          </div>
                        </>
                      ) : (
                        <div className="text-xs text-slate-500 mt-1">Runner details loading...</div>
                      )}
                    </div>
                  </div>
               </div>

               {/* 2nd Place */}
               <div className="relative rounded-xl border border-slate-800 bg-slate-900/30 p-5 opacity-80">
                  <div className="flex items-start gap-4">
                    <div className="h-8 w-8 shrink-0 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 font-bold">2</div>
                    <div className="min-w-0">
                      <div className="text-base font-black text-slate-200 truncate">{aiTop3Names[1] || 'TBD'}</div>
                      {getHorse(aiTop3Names[1]) ? (
                        <div className="text-xs text-slate-500 font-medium mt-0.5 truncate">
                           J: {getHorse(aiTop3Names[1])?.jockey}
                        </div>
                      ) : null}
                    </div>
                  </div>
               </div>

               {/* 3rd Place */}
               <div className="relative rounded-xl border border-slate-800 bg-slate-900/30 p-5 opacity-80">
                  <div className="flex items-start gap-4">
                    <div className="h-8 w-8 shrink-0 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 font-bold">3</div>
                    <div className="min-w-0">
                      <div className="text-base font-black text-slate-200 truncate">{aiTop3Names[2] || 'TBD'}</div>
                      {getHorse(aiTop3Names[2]) ? (
                        <div className="text-xs text-slate-500 font-medium mt-0.5 truncate">
                           J: {getHorse(aiTop3Names[2])?.jockey}
                        </div>
                      ) : null}
                    </div>
                  </div>
               </div>
             </div>
           ) : (
             <div className="rounded-xl border border-dashed border-slate-800 bg-slate-900/30 p-8 text-center">
               <div className="text-slate-500 font-medium">Prediction pending analysis...</div>
               <div className="text-xs text-slate-600 mt-1">This usually takes a few seconds after loading runners.</div>
             </div>
           )}
        </div>

        {/* AI Reasoning (If available) */}
        {prediction?.reasoning && (
          <div className="rounded-xl bg-emerald-900/10 border border-emerald-500/20 p-4">
            <div className="flex gap-3">
              <div className="shrink-0 text-emerald-500">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h4 className="text-sm font-black text-emerald-400 mb-1">AI Analysis</h4>
                <p className="text-sm text-slate-300 leading-relaxed">{prediction.reasoning}</p>
              </div>
            </div>
          </div>
        )}

      </div>
    </Card>
  );
};

export default RaceOverviewPanel;
