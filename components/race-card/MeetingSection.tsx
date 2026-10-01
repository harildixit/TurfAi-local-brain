import { type FC, useState } from 'react';
import type { Race, Prediction, Horse } from '../../types';
import { COURSE_IMAGES, getCardImage } from '../../constants';
import Button from '../ui/Button';
import Card from '../ui/Card';
import { getActiveRunnerCount } from '../../utils/racing';

type MeetingSectionProps = {
  course: string;
  races: Race[];
  predictions: Record<string, Prediction>;
  onSelectRace: (race: Race) => void;
  viewMode?: 'list' | 'grid';
};

const MeetingSection: FC<MeetingSectionProps> = ({ course, races, predictions, onSelectRace, viewMode = 'list' }) => {
  const [expandedRaceId, setExpandedRaceId] = useState<string | null>(null);

  // Helper to get formatted details
  const getRaceDetails = (race: Race) => {
    const classStr = race.class ? `${race.class} • ` : '';
    return `${classStr}${race.distance} • ${getActiveRunnerCount(race.horses)} Runners`;
  };

  const toggleRace = (raceId: string) => {
    if (expandedRaceId === raceId) {
      setExpandedRaceId(null);
    } else {
      setExpandedRaceId(raceId);
    }
  };

  const firstRace = races[0]; // For meeting details (Weather/Going)

  return (
    <div className="mb-8">
      {/* Meeting Header */}
      <div className="relative overflow-hidden bg-slate-800/50 rounded-t-xl p-4 flex items-center justify-between border-b border-slate-700">
        {/* Background Image & Overlay */}
        <div className="absolute inset-0 z-0">
          <img 
            src={getCardImage(course)} 
            alt={course}
            className="h-full w-full object-cover object-[center_30%] opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-900/40" />
        </div>

        <div className="relative z-10 flex items-center gap-4">
          <div className="h-10 w-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-500 font-bold backdrop-blur-sm border border-emerald-500/30">
            {course.charAt(0)}
          </div>
          <div>
            <h3 className="text-lg font-black text-white">{course}</h3>
            <div className="text-xs text-slate-300 font-medium flex items-center gap-2">
              <span>☁️ {firstRace?.weather || 'Overcast'}</span>
              <span>•</span>
              <span>{firstRace?.going || 'Good to Soft'}</span>
              <span>•</span>
              <span>Right Handed</span>
            </div>
          </div>
        </div>
        <div className="relative z-10">
          <Button size="sm" variant="secondary">FULL MEETING CARD</Button>
        </div>
      </div>

      {/* Race List */}
      {viewMode === 'list' ? (
        <div className="bg-slate-900 rounded-b-xl border border-slate-800 border-t-0 divide-y divide-slate-800">
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-4 px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">
            <div className="col-span-1">Time</div>
            <div className="col-span-4">Race Details</div>
            <div className="col-span-2">Runners</div>
            <div className="col-span-3">Prediction Confidence</div>
            <div className="col-span-1">Odds</div>
            <div className="col-span-1 text-right">Action</div>
          </div>

          {/* Rows */}
          {races.map((race) => {
            const isExpanded = expandedRaceId === race.id;
            const pred = predictions[race.id];
            const isAbandoned = race.status === 'abandoned';
            const winnerHorse = pred ? race.horses.find(h => h.name === pred.winner) : null;

            return (
              <div key={race.id} className={`transition-colors ${isExpanded ? 'bg-slate-800/30' : 'hover:bg-slate-800/20'}`}>
                {/* Main Row */}
                <div 
                  className={`grid grid-cols-12 gap-4 px-6 py-4 items-center cursor-pointer ${isExpanded ? 'border-l-4 border-emerald-500 pl-[20px]' : ''}`}
                  onClick={() => toggleRace(race.id)}
                >
                  <div className="col-span-1 font-black text-white text-lg">{race.time}</div>
                  <div className="col-span-4">
                    <div className="font-bold text-white truncate pr-4">
                      {isAbandoned ? <span className="text-red-500">ABANDONED</span> : (race.name || `${course} Race`)}
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">{getRaceDetails(race)}</div>
                  </div>
                  <div className="col-span-2 flex items-center gap-1">
                    {/* Runner avatars */}
                    {(race.horses || []).length > 0 ? (
                      <>
                        <div className="flex -space-x-2">
                          {(race.horses || []).slice(0, 3).map((horse, i) => (
                            <div key={horse.id || i} className="h-6 w-6 rounded-full bg-slate-700 border border-slate-900 flex items-center justify-center text-[10px] text-white font-bold" title={horse.name}>
                              {i + 1}
                            </div>
                          ))}
                        </div>
                        <div className="text-xs text-slate-400 font-bold ml-2">+{Math.max(0, (race.horses || []).length - 3)}</div>
                      </>
                    ) : (
                      <div className="text-xs text-slate-500 italic">Loading runners...</div>
                    )}
                  </div>
                  <div className="col-span-3">
                    {isAbandoned ? (
                      <span className="text-xs font-bold text-slate-500">Race Abandoned</span>
                    ) : (
                      <div className="flex items-center gap-3">
                        <div className="h-1.5 flex-1 rounded-full bg-slate-800">
                          <div 
                            className="h-full rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" 
                            style={{ width: `${pred?.confidence || 0}%` }}
                          />
                        </div>
                        <span className="text-sm font-bold text-emerald-500">{pred?.confidence ? `${Math.round(pred.confidence)}%` : '-'}</span>
                      </div>
                    )}
                  </div>
                  <div className="col-span-1 font-bold text-white">
                    {isAbandoned ? '-' : (winnerHorse?.currentOdds?.toFixed(2) || 'SP')}
                  </div>
                  <div className="col-span-1 text-right">
                    <button className={`text-slate-400 hover:text-white transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Expanded Content */}
                {isExpanded && !isAbandoned && (
                  <div className="px-6 pb-6 pt-2 pl-[22px]">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                        {pred?.source === 'local-brain' ? 'LocalBrain Predicted Finish' : pred?.source === 'hybrid' ? 'Local + Gemini Predicted Finish' : 'AI Predicted Finish'}
                      </h4>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectRace(race);
                        }}
                        className="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                      >
                        Full Race Analysis <span>&gt;</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* 1st Prediction */}
                      {pred && winnerHorse ? (
                        <div className="bg-slate-800/50 rounded-xl p-4 border border-indigo-500/30 relative overflow-hidden group">
                          <div className="absolute top-0 right-0 bg-indigo-500 text-white text-[10px] font-bold px-2 py-1 rounded-bl-lg">
                            1st PREDICTION
                          </div>
                          <div className="flex items-start gap-4">
                            <div className="h-12 w-12 rounded-full bg-yellow-400/10 border border-yellow-400/50 flex items-center justify-center text-yellow-400 font-bold text-lg">
                              1
                            </div>
                            <div>
                              <div className="text-lg font-black text-white">{winnerHorse.name}</div>
                              <div className="text-xs text-slate-400 mb-2">J: {winnerHorse.jockey} • T: {winnerHorse.trainer}</div>
                              
                              <div className="flex flex-wrap gap-2 mb-3">
                                <span className="bg-slate-950 px-2 py-1 rounded text-[10px] font-bold text-slate-300 border border-slate-800">
                                  Form: {(winnerHorse.recentForm || []).slice(-3).join('-')}
                                </span>
                                <span className="bg-slate-950 px-2 py-1 rounded text-[10px] font-bold text-slate-300 border border-slate-800">
                                  Age: {winnerHorse.age}
                                </span>
                                <span className="bg-slate-950 px-2 py-1 rounded text-[10px] font-bold text-slate-300 border border-slate-800">
                                  Wgt: {winnerHorse.weight}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="p-4 text-center text-slate-500 text-sm italic">Analysis pending...</div>
                      )}

                      {/* 2nd Prediction */}
                      {(() => {
                        const secondHorseName = pred?.placed?.[0];
                        const secondHorse = secondHorseName ? race.horses.find(h => h.name === secondHorseName) : null;
                        
                        return (
                          <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-800 flex items-center gap-4 opacity-75">
                             <div className="h-8 w-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 font-bold text-sm">2</div>
                             <div>
                               <div className="font-bold text-slate-300">{secondHorseName || 'Unknown'}</div>
                               {secondHorse ? (
                                 <>
                                   <div className="text-xs text-slate-500">J: {secondHorse.jockey} • T: {secondHorse.trainer}</div>
                                   <div className="flex gap-2 mt-2">
                                      <span className="bg-slate-950 px-1.5 py-0.5 rounded text-[10px] text-slate-500 border border-slate-800">
                                        Form: {(secondHorse.recentForm || []).slice(-3).join('-')}
                                      </span>
                                   </div>
                                 </>
                               ) : (
                                 <div className="text-xs text-slate-500">Analysis pending...</div>
                               )}
                             </div>
                          </div>
                        );
                      })()}

                      {/* 3rd Prediction */}
                      {(() => {
                        const thirdHorseName = pred?.placed?.[1];
                        const thirdHorse = thirdHorseName ? race.horses.find(h => h.name === thirdHorseName) : null;
                        
                        return (
                          <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-800 flex items-center gap-4 opacity-75">
                             <div className="h-8 w-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 font-bold text-sm">3</div>
                             <div>
                               <div className="font-bold text-slate-300">{thirdHorseName || 'Unknown'}</div>
                               {thirdHorse ? (
                                 <>
                                   <div className="text-xs text-slate-500">J: {thirdHorse.jockey} • T: {thirdHorse.trainer}</div>
                                   <div className="flex gap-2 mt-2">
                                      <span className="bg-slate-950 px-1.5 py-0.5 rounded text-[10px] text-slate-500 border border-slate-800">
                                        Form: {(thirdHorse.recentForm || []).slice(-3).join('-')}
                                      </span>
                                   </div>
                                 </>
                               ) : (
                                 <div className="text-xs text-slate-500">Analysis pending...</div>
                               )}
                             </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4 px-4 pb-4">
          {races.map((race) => {
            const pred = predictions[race.id];
            const isAbandoned = race.status === 'abandoned';
            const winnerHorse = pred ? race.horses.find(h => h.name === pred.winner) : null;

            return (
              <Card 
                key={race.id}
                className={`relative overflow-hidden group hover:ring-1 hover:ring-slate-600 transition-all ${isAbandoned ? 'opacity-75 grayscale' : ''}`}
                onClick={() => onSelectRace(race)}
              >
                {/* Background Image */}
                <div className="absolute inset-0 z-0">
                  <img 
                    src={getCardImage(race.id)} 
                    alt={race.course}
                    className="h-full w-full object-cover opacity-20 transition-transform duration-700 group-hover:scale-110" 
                  />
                  <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-950/95 to-slate-900/90" />
                </div>

                <div className="relative z-10 p-5">
                   <div className="flex items-center justify-between mb-4">
                     <div className="flex items-center gap-2">
                        <div className="text-xs font-black text-slate-400 bg-slate-950/50 px-2 py-1 rounded-lg border border-slate-800">
                          {race.time}
                        </div>
                        {isAbandoned && <div className="text-[10px] font-black bg-red-500 text-white px-1.5 py-0.5 rounded">ABANDONED</div>}
                     </div>
                     {!isAbandoned && (
                       <div className="text-emerald-500 font-bold text-sm">
                         {pred?.confidence ? `${Math.round(pred.confidence)}% Conf.` : '-'}
                       </div>
                     )}
                   </div>

                   <div className="mb-6">
                     <div className="text-lg font-black text-white truncate mb-1">
                       {pred?.winner || (isAbandoned ? 'Race Abandoned' : 'Analyzing...')}
                     </div>
                     <div className="text-xs text-slate-400">
                       {getRaceDetails(race)}
                     </div>
                   </div>

                   <div className="flex items-end justify-between">
                     <div>
                       <div className="text-[10px] uppercase font-bold text-slate-500 mb-0.5">Best Odds</div>
                       <div className="text-xl font-black text-white">
                         {isAbandoned ? '-' : (winnerHorse?.currentOdds?.toFixed(2) || 'SP')}
                       </div>
                     </div>
                     <Button size="sm" variant="secondary" disabled={isAbandoned}>
                       Analyze
                     </Button>
                   </div>
                </div>
                {/* Confidence Bar at bottom */}
                {!isAbandoned && pred?.confidence && (
                  <div className="absolute bottom-0 left-0 h-1 bg-emerald-500 z-20" style={{ width: `${pred.confidence}%` }} />
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MeetingSection;
