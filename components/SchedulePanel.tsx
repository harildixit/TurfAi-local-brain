import type { FC } from 'react';
import { useMemo, useState } from 'react';
import type { Prediction, Race } from '../types';
import Badge from './ui/Badge';
import { cx } from './ui/cx';
import { getActiveRunnerCount } from '../utils/racing';

type SchedulePanelProps = {
  races: Race[];
  activeRaceId: string | null;
  predictions: Record<string, Prediction>;
  onSelectRace: (race: Race) => void;
};

const SchedulePanel: FC<SchedulePanelProps> = ({ races, activeRaceId, predictions, onSelectRace }) => {
  const [filter, setFilter] = useState('');
  const [collapsedMeetings, setCollapsedMeetings] = useState<Record<string, boolean>>({});

  const toggleMeeting = (meeting: string) => {
    setCollapsedMeetings(prev => ({
      ...prev,
      [meeting]: !prev[meeting]
    }));
  };

  const byMeeting = useMemo(() => {
    const toMinutes = (time: string) => {
      const match = time.match(/(\d{1,2})[:.](\d{2})/);
      if (!match) return Number.POSITIVE_INFINITY;
      return Number(match[1]) * 60 + Number(match[2]);
    };

    const q = filter.trim().toLowerCase();
    const filtered = q
      ? races.filter(r => `${r.course} ${r.time} ${r.distance} ${r.going} ${r.weather}`.toLowerCase().includes(q))
      : races;

    const grouped: Record<string, Race[]> = {};
    for (const race of filtered) {
      const key = (race.course || 'Unknown').trim() || 'Unknown';
      (grouped[key] ||= []).push(race);
    }

    for (const key of Object.keys(grouped)) grouped[key].sort((a, b) => toMinutes(a.time) - toMinutes(b.time));

    return Object.entries(grouped)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([meeting, meetingRaces]) => ({ meeting, meetingRaces }));
  }, [races, filter]);

  return (
    <div className="space-y-6">
      {/* Search/Filter - Styled Darker */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg className="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <input
          type="text"
          className="block w-full rounded-xl border border-slate-800 bg-slate-900/50 pl-10 pr-3 py-2.5 text-sm font-medium text-slate-200 placeholder-slate-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none transition-colors"
          placeholder="Filter meetings or horses..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>

      {/* Meeting Lists */}
      <div className="space-y-6">
        {byMeeting.map(({ meeting, meetingRaces }) => {
          return (
            <div key={meeting} className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/30">
              {/* Meeting Header */}
              <button 
                onClick={() => toggleMeeting(meeting)}
                className="w-full bg-slate-800/40 px-4 py-3 border-b border-slate-700/50 flex items-center justify-between hover:bg-slate-800/60 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 font-bold text-xs">
                    {meeting.substring(0, 1).toUpperCase()}
                  </div>
                  <div className="text-left">
                    <h3 className="text-sm font-black text-white">{meeting}</h3>
                    <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                      {meetingRaces[0]?.going || 'Going unknown'}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="px-2 py-1 rounded bg-slate-950 text-[10px] font-bold text-slate-500 border border-slate-800">
                    {meetingRaces.length} Races
                  </div>
                  <svg 
                    className={`w-4 h-4 text-slate-500 transition-transform ${collapsedMeetings[meeting] ? '' : 'rotate-180'}`} 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>

              {/* Races List */}
              {!collapsedMeetings[meeting] && (
              <div className="divide-y divide-slate-800/50">
                {meetingRaces.map((race) => {
                  const isActive = race.id === activeRaceId;
                  const prediction = predictions[race.id];
                  const isAbandoned = race.status === 'abandoned';

                  return (
                    <button
                      key={race.id}
                      onClick={() => onSelectRace(race)}
                      disabled={isAbandoned}
                      className={cx(
                        'w-full flex items-center gap-3 px-4 py-3 transition-all relative group text-left',
                        isActive ? 'bg-slate-800/50' : 'hover:bg-slate-800/20',
                        isAbandoned ? 'opacity-50 grayscale' : ''
                      )}
                    >
                      {/* Active Indicator */}
                      {isActive && (
                        <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                      )}

                      {/* Time */}
                      <div className={cx(
                        "w-12 text-sm font-black tabular-nums text-right",
                        isActive ? "text-emerald-400" : "text-slate-400 group-hover:text-slate-300"
                      )}>
                        {race.time}
                      </div>

                      {/* Divider */}
                      <div className="w-px h-8 bg-slate-800" />

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className={cx(
                            "text-xs font-bold truncate pr-2",
                            isActive ? "text-white" : "text-slate-300 group-hover:text-white"
                          )}>
                            {isAbandoned ? 'ABANDONED' : `${race.distance} Handicap`}
                          </span>
                          
                          {!isAbandoned && prediction && (
                            <span className={cx(
                              "text-[10px] font-black",
                              prediction.confidence > 70 ? "text-emerald-400" : "text-slate-500"
                            )}>
                              {Math.round(prediction.confidence)}%
                            </span>
                          )}
                        </div>

                        {/* Runners Count / Status */}
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-slate-500 font-medium">
                            {getActiveRunnerCount(race.horses)} Runners
                          </span>
                          {/* Mini Bar */}
                          {!isAbandoned && prediction && (
                            <div className="w-12 h-1 bg-slate-800 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-emerald-500 rounded-full"
                                style={{ width: `${prediction.confidence}%` }}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SchedulePanel;
