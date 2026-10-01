import { type FC, useState, useMemo } from 'react';
import type { Race, Prediction } from '../../types';
import { fetchDayStatus } from '../../services/geminiService';
import { getActiveRunnerCount } from '../../utils/racing';
import DatePicker from '../ui/DatePicker';

type FixturesViewProps = {
  races: Race[];
  predictions: Record<string, Prediction>;
  dayStatus: Awaited<ReturnType<typeof fetchDayStatus>> | null;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  onViewPrediction: (race: Race) => void;
  selectedDate: string;
  onDateChange: (date: string) => void;
};

const FixturesView: FC<FixturesViewProps> = ({
  races,
  predictions,
  dayStatus,
  loading,
  error,
  onRefresh,
  onViewPrediction,
  selectedDate,
  onDateChange,
}) => {
  const [filterVenue, setFilterVenue] = useState<string>('all');
  const [filterTime, setFilterTime] = useState<string>('all');
  const [collapsedVenues, setCollapsedVenues] = useState<Record<string, boolean>>({});
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/London' });
  const isToday = selectedDate === today;
  const selectedDateLabel = new Date(`${selectedDate}T12:00:00`).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const toggleVenue = (venue: string) => {
    setCollapsedVenues(prev => ({ ...prev, [venue]: !prev[venue] }));
  };

  // Derived Stats: Market Movers
  const marketMovers = useMemo(() => {
    const movers: { raceId: string; raceTime: string; raceCourse: string; horse: string; current: number; opening: number; diff: number }[] = [];
    races.forEach(race => {
      race.horses.forEach(horse => {
        if (Number.isFinite(horse.openingOdds) && Number.isFinite(horse.currentOdds) && horse.openingOdds > horse.currentOdds) {
          movers.push({
            raceId: race.id,
            raceTime: race.time,
            raceCourse: race.course,
            horse: horse.name,
            current: horse.currentOdds,
            opening: horse.openingOdds,
            diff: horse.openingOdds - horse.currentOdds
          });
        }
      });
    });
    return movers.sort((a, b) => b.diff - a.diff).slice(0, 3);
  }, [races]);

  // Derived Stats: Best Bet
  const bestBet = useMemo(() => {
    let best: { race: Race; prediction: Prediction } | null = null;
    Object.entries(predictions).forEach(([raceId, pred]: [string, Prediction]) => {
      if (!best || pred.confidence > best.prediction.confidence) {
        const race = races.find(r => r.id === raceId);
        if (race) best = { race, prediction: pred };
      }
    });
    return best;
  }, [predictions, races]);

  // Filter Races
  const filteredRaces = useMemo(() => {
    return races.filter(race => {
      if (filterVenue !== 'all' && race.course !== filterVenue) return false;
      
      if (filterTime !== 'all') {
        const hour = parseInt(race.time.split(':')[0]);
        if (filterTime === 'morning' && hour >= 12) return false;
        if (filterTime === 'afternoon' && (hour < 12 || hour >= 17)) return false;
        if (filterTime === 'evening' && hour < 17) return false;
      }
      
      return true;
    }).sort((a, b) => a.time.localeCompare(b.time));
  }, [races, filterVenue, filterTime]);

  // Group Races by Venue
  const groupedRaces = useMemo(() => {
    const groups: Record<string, Race[]> = {};
    filteredRaces.forEach(race => {
      if (!groups[race.course]) groups[race.course] = [];
      groups[race.course].push(race);
    });
    return groups;
  }, [filteredRaces]);

  // Sorted Venues
  const sortedVenues = useMemo(() => {
    return Object.keys(groupedRaces).sort((a, b) => {
      const timeA = groupedRaces[a][0]?.time || '00:00';
      const timeB = groupedRaces[b][0]?.time || '00:00';
      return timeA.localeCompare(timeB);
    });
  }, [groupedRaces]);

  const uniqueVenues = useMemo(() => Array.from(new Set((races || []).map(r => r.course))).sort(), [races]);

  if (loading) {
    return (
      <div className="py-24 flex items-center justify-center">
        <div className="rounded-2xl border border-slate-800 bg-slate-950/30 px-6 py-5 text-slate-200 font-black">
          Loading today’s races…
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-24 flex items-center justify-center">
        <div className="rounded-2xl border border-red-800 bg-red-950/30 px-6 py-5 text-red-200 font-black">
          Error: {error}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col xl:flex-row max-w-[1600px] w-full mx-auto p-4 lg:p-8 gap-6 animate-fade-in">
      {/* Left Column: Race Card Table */}
      <section className="flex flex-col flex-1 gap-6 min-w-0">
        
        {/* Page Heading & Controls */}
        <div className="flex flex-col gap-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-3">
                <h1 className="text-slate-900 dark:text-white text-3xl md:text-4xl font-black leading-tight tracking-[-0.033em]">{isToday ? "Today's Fixtures" : 'Historical Fixtures'}</h1>
                <span className="inline-flex items-center rounded-full bg-primary/20 px-2.5 py-0.5 text-xs font-medium text-blue-600 dark:text-blue-400 ring-1 ring-inset ring-blue-600/30 dark:ring-blue-400/30">{isToday ? 'Live' : 'Archive'}</span>
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-base font-normal leading-normal">
                {selectedDateLabel} · {races.length} Meetings | {dayStatus?.predictionsCached || 0} Analyses Ready
              </p>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={onRefresh}
                className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-blue-600 text-white rounded-lg text-sm font-bold transition-colors shadow-lg shadow-primary/20"
              >
                <span className="material-symbols-outlined text-[20px]">refresh</span>
                Refresh Data
              </button>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-wrap gap-3 pb-2">
            <DatePicker
              value={selectedDate}
              onChange={onDateChange}
              maxDate={today}
              minDate="2026-01-06"
              className="w-[190px]"
            />
            
            <div className="relative group">
              <button className="flex h-10 shrink-0 items-center justify-center gap-x-2 rounded-lg bg-white dark:bg-[#1c1f27] border border-slate-200 dark:border-slate-700 pl-4 pr-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                <p className="text-slate-900 dark:text-white text-sm font-medium leading-normal">
                  {filterVenue === 'all' ? 'All Venues' : filterVenue}
                </p>
                <span className="material-symbols-outlined text-slate-900 dark:text-white text-[20px]">expand_more</span>
              </button>
              {/* Simple Dropdown for Venue */}
              <select 
                className="absolute inset-0 opacity-0 cursor-pointer"
                value={filterVenue}
                onChange={(e) => setFilterVenue(e.target.value)}
              >
                <option value="all">All Venues</option>
                {uniqueVenues.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>

            <div className="relative group">
              <button className="flex h-10 shrink-0 items-center justify-center gap-x-2 rounded-lg bg-white dark:bg-[#1c1f27] border border-slate-200 dark:border-slate-700 pl-4 pr-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                <p className="text-slate-900 dark:text-white text-sm font-medium leading-normal">
                  {filterTime === 'all' ? 'Time: All Day' : `Time: ${filterTime}`}
                </p>
                <span className="material-symbols-outlined text-slate-900 dark:text-white text-[20px]">schedule</span>
              </button>
               {/* Simple Dropdown for Time */}
               <select 
                className="absolute inset-0 opacity-0 cursor-pointer"
                value={filterTime}
                onChange={(e) => setFilterTime(e.target.value)}
              >
                 <option value="all">Time: All Day</option>
                 <option value="morning">Morning (until 12)</option>
                 <option value="afternoon">Afternoon (12-5pm)</option>
                 <option value="evening">Evening (5pm+)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Fixture Matrix (Desktop Table) */}
        <div className="hidden lg:block rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1c1f27] overflow-hidden shadow-sm">
          <div className="w-full">
            <table className="w-full text-left border-collapse table-fixed">
              <thead>
                <tr className="bg-slate-50 dark:bg-[#15171e] border-b border-slate-200 dark:border-slate-700">
                  <th className="p-3 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 w-[70px]">Time</th>
                  <th className="p-3 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 w-auto">Race Details</th>
                  <th className="p-3 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 w-[150px]">Distance & Surface</th>
                  <th className="p-3 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-center w-[80px]">Runners</th>
                  <th className="p-3 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-center w-[120px]">Status</th>
                  <th className="p-3 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-right w-[220px]">Action</th>
                </tr>
              </thead>
              {sortedVenues.map(venue => {
                const venueRaces = groupedRaces[venue];
                const firstRaceTime = venueRaces[0]?.time;
                const lastRaceTime = venueRaces[venueRaces.length - 1]?.time;
                const timeRange = firstRaceTime && lastRaceTime ? `${firstRaceTime}-${lastRaceTime}` : '';

                return (
                <tbody key={venue} className="divide-y divide-slate-200 dark:divide-slate-700 border-b border-slate-200 dark:border-slate-700 last:border-0">
                  <tr 
                    className="bg-slate-100 dark:bg-[#1e212b] cursor-pointer hover:bg-slate-200 dark:hover:bg-[#252836] transition-colors" 
                    onClick={() => toggleVenue(venue)}
                  >
                    <td colSpan={6} className="p-3">
                      <div className="flex items-center gap-3 pl-2">
                        <button className="p-1 rounded-full hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors">
                          <span className={`material-symbols-outlined transition-transform duration-200 ${collapsedVenues[venue] ? '-rotate-90' : 'rotate-0'}`}>expand_more</span>
                        </button>
                        <span className="font-bold text-slate-900 dark:text-white text-lg">{venue}</span>
                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400 bg-white dark:bg-[#15171e] px-2.5 py-0.5 rounded-full border border-slate-200 dark:border-slate-700">
                          {groupedRaces[venue].length} Races
                        </span>
                        {timeRange && (
                          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                            ({timeRange})
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                  {!collapsedVenues[venue] && groupedRaces[venue].map((race) => {
                    const prediction = predictions[race.id];
                    const isFinished = race.status === 'finished';
                    const isAbandoned = race.status === 'abandoned';
                    
                    return (
                      <tr key={race.id} className={`group hover:bg-slate-50 dark:hover:bg-[#232732] transition-colors relative ${isAbandoned ? 'opacity-60 grayscale' : ''}`}>
                        {/* Time Column */}
                        <td className="p-3 align-top border-r border-slate-200/50 dark:border-slate-700/50 lg:border-none">
                          <div className="flex flex-col">
                            <span className="text-xl font-bold text-slate-900 dark:text-white font-display">{race.time}</span>
                            <span className="text-xs text-slate-500 dark:text-slate-400">GMT</span>
                          </div>
                        </td>
                        
                        {/* Race Details Column */}
                        <td className="p-3 align-top">
                          <div className="flex items-center gap-2 min-w-0">
                            {!isAbandoned && prediction && prediction.confidence > 80 && (
                              <span className="material-symbols-outlined text-yellow-500 text-[16px] shrink-0" title="High Confidence">emoji_events</span>
                            )}
                            <span 
                              className="text-slate-900 dark:text-white font-bold text-sm truncate block"
                              title={isAbandoned ? 'RACE ABANDONED' : (race.name || 'Race Details')}
                            >
                              {isAbandoned ? 'RACE ABANDONED' : (race.name || 'Race Details')}
                            </span>
                          </div>
                        </td>

                        {/* Distance & Surface Column */}
                        <td className="p-3 align-top">
                          <div className="flex flex-col gap-1.5 items-start">
                            <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/50 px-2 py-1 rounded whitespace-nowrap w-full">
                              <span className="material-symbols-outlined text-primary text-[14px]">straighten</span>
                              {race.distance}
                            </div>
                            <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/50 px-2 py-1 rounded whitespace-nowrap w-full">
                              <span className="material-symbols-outlined text-emerald-500 text-[14px]">grass</span>
                              {race.going}
                            </div>
                          </div>
                        </td>

                        {/* Runners Column */}
                        <td className="p-3 text-center align-top">
                          <span className="text-slate-900 dark:text-white font-bold text-sm">{getActiveRunnerCount(race.horses)}</span>
                        </td>

                        {/* Status Column */}
                        <td className="p-3 text-center align-top">
                          {isAbandoned ? (
                             <span className="inline-flex items-center rounded-md bg-red-500/10 px-2 py-1 text-xs font-medium text-red-600 dark:text-red-500 ring-1 ring-inset ring-red-500/20">Abandoned</span>
                          ) : isFinished ? (
                            <span className="inline-flex items-center rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-1 text-xs font-medium text-slate-600 dark:text-slate-400 ring-1 ring-inset ring-slate-500/10">Finished</span>
                          ) : prediction ? (
                            <span className="inline-flex items-center rounded-md bg-green-500/10 px-2 py-1 text-xs font-medium text-green-600 dark:text-green-500 ring-1 ring-inset ring-green-500/20">Analyzed</span>
                          ) : (
                             <span className="inline-flex items-center rounded-md bg-yellow-400/10 px-2 py-1 text-xs font-medium text-yellow-600 dark:text-yellow-500 ring-1 ring-inset ring-yellow-400/20">Upcoming</span>
                          )}
                        </td>

                        {/* Action Column */}
                        <td className="p-3 text-right align-top">
                           <div className="flex items-center justify-end gap-3 flex-wrap">
                              {!isAbandoned && prediction && (
                                <div className="hidden xl:flex flex-col items-end gap-1">
                                  <div className="h-1.5 w-16 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                    <div 
                                      className={`h-full rounded-full ${prediction.confidence > 70 ? 'bg-green-500' : prediction.confidence > 50 ? 'bg-yellow-500' : 'bg-orange-500'}`} 
                                      style={{ width: `${prediction.confidence}%` }}
                                    ></div>
                                  </div>
                                  <span className={`text-[10px] font-bold uppercase tracking-wider ${prediction.confidence > 70 ? 'text-green-500' : prediction.confidence > 50 ? 'text-yellow-500' : 'text-orange-500'}`}>
                                    {prediction.confidence}% Conf.
                                  </span>
                                </div>
                              )}
                              <button 
                                onClick={() => !isAbandoned && onViewPrediction(race)}
                                disabled={isAbandoned}
                                className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-bold shadow-sm transition-all ${
                                  isAbandoned 
                                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700 cursor-not-allowed'
                                    : 'bg-white dark:bg-[#1c1f27] border-slate-200 dark:border-slate-700 text-primary hover:bg-slate-50 dark:hover:bg-slate-800'
                                }`}
                              >
                                {isAbandoned ? 'Cancelled' : prediction ? 'View Prediction' : 'Analyze'}
                                {!isAbandoned && <span className="material-symbols-outlined text-[18px]">arrow_forward</span>}
                              </button>
                           </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                );
              })}
            </table>
          </div>
          
          {/* Table Footer */}
          <div className="border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#15171e] p-4 flex items-center justify-between">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Showing all <span className="text-slate-900 dark:text-white font-bold">{filteredRaces.length}</span> races from <span className="text-slate-900 dark:text-white font-bold">{sortedVenues.length}</span> meetings
            </p>
          </div>
        </div>

        {/* Mobile/Tablet Card View */}
        <div className="flex flex-col gap-4 lg:hidden">
          {sortedVenues.map(venue => {
            const venueRaces = groupedRaces[venue];
            const firstRaceTime = venueRaces[0]?.time;
            const lastRaceTime = venueRaces[venueRaces.length - 1]?.time;
            const timeRange = firstRaceTime && lastRaceTime ? `${firstRaceTime}-${lastRaceTime}` : '';

            return (
            <div key={venue} className="flex flex-col gap-2">
              <button 
                onClick={() => toggleVenue(venue)}
                className="flex items-center justify-between p-3 bg-white dark:bg-[#1c1f27] rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm"
              >
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 dark:text-white">{venue}</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">{groupedRaces[venue].length}</span>
                  {timeRange && (
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400 ml-1">
                      ({timeRange})
                    </span>
                  )}
                </div>
                <span className={`material-symbols-outlined transition-transform duration-200 ${collapsedVenues[venue] ? '-rotate-90' : 'rotate-0'}`}>expand_more</span>
              </button>
              
              {!collapsedVenues[venue] && (
                <div className="flex flex-col gap-4">
                  {groupedRaces[venue].map((race) => {
                    const prediction = predictions[race.id];
                    const isFinished = race.status === 'finished';
                    const isAbandoned = race.status === 'abandoned';
                    
                    return (
                      <div key={race.id} className={`bg-white dark:bg-[#1c1f27] rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm ${isAbandoned ? 'opacity-75 grayscale' : ''}`}>
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-800 rounded-lg p-2 min-w-[60px]">
                              <span className="text-xl font-bold text-slate-900 dark:text-white font-display leading-none">{race.time}</span>
                              <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 mt-1">GMT</span>
                            </div>
                            <div>
                              {/* Venue removed, showing race details */}
                              <h3 className="font-bold text-slate-900 dark:text-white text-lg leading-tight">
                                {isAbandoned ? 'RACE ABANDONED' : (race.name || 'Race Details')}
                              </h3>
                              <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 dark:text-slate-400">
                                <span className="flex items-center gap-1">
                                  <span className="material-symbols-outlined text-[14px]">straighten</span>
                                  {race.distance}
                                </span>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                  <span className="material-symbols-outlined text-[14px]">grass</span>
                                  {race.going}
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex flex-col items-end gap-1">
                             {isAbandoned ? (
                               <span className="inline-flex items-center rounded-md bg-red-500/10 px-2 py-1 text-xs font-medium text-red-600 dark:text-red-500 ring-1 ring-inset ring-red-500/20">Abandoned</span>
                             ) : isFinished ? (
                               <span className="inline-flex items-center rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-1 text-xs font-medium text-slate-600 dark:text-slate-400 ring-1 ring-inset ring-slate-500/10">Finished</span>
                             ) : prediction ? (
                               <span className="inline-flex items-center rounded-md bg-green-500/10 px-2 py-1 text-xs font-medium text-green-600 dark:text-green-500 ring-1 ring-inset ring-green-500/20">Analyzed</span>
                             ) : (
                                <span className="inline-flex items-center rounded-md bg-yellow-400/10 px-2 py-1 text-xs font-medium text-yellow-600 dark:text-yellow-500 ring-1 ring-inset ring-yellow-400/20">Upcoming</span>
                             )}
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                          <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                            {getActiveRunnerCount(race.horses)} Runners
                          </span>
                          
                          <button 
                            onClick={() => !isAbandoned && onViewPrediction(race)}
                            disabled={isAbandoned}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
                              isAbandoned
                                ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                                : 'bg-primary text-white hover:bg-blue-600 shadow-md shadow-primary/20'
                            }`}
                          >
                            {isAbandoned ? 'Cancelled' : prediction ? 'View Prediction' : 'Analyze Race'}
                            {!isAbandoned && <span className="material-symbols-outlined text-[18px]">arrow_forward</span>}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            );
          })}
        </div>
      </section>

      {/* Right Column: Sidebar */}
      <aside className="flex flex-col xl:w-80 shrink-0 gap-6">
        
        {/* AI Insight Card */}
        {bestBet && (
          <div className="rounded-xl border border-slate-200 dark:border-primary/30 bg-white dark:bg-gradient-to-b dark:from-[#1c1f27] dark:to-[#161821] overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700/50 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">psychology</span>
              <h3 className="text-slate-900 dark:text-white font-bold text-lg">AI Insight of the Day</h3>
            </div>
            <div className="p-5 flex flex-col gap-4">
              <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
                Our model has identified a <span className="text-slate-900 dark:text-white font-bold">high-value opportunity</span> in the {bestBet.race.time} at {bestBet.race.course}. Strong confidence in <span className="text-slate-900 dark:text-white font-bold">{bestBet.prediction.winner}</span>.
              </p>
              <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-3 border border-slate-200 dark:border-slate-700/50">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold">Top Pick Confidence</span>
                  <span className="text-green-600 dark:text-green-500 font-bold text-sm">{bestBet.prediction.confidence}%</span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                  <div className="bg-green-500 h-2 rounded-full" style={{ width: `${bestBet.prediction.confidence}%` }}></div>
                </div>
              </div>
              <button 
                onClick={() => onViewPrediction(bestBet!.race)}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-bold text-white shadow-lg shadow-primary/20 hover:bg-blue-600 transition-all group"
              >
                Full analysis
              </button>
            </div>
          </div>
        )}

        {/* Market Movers Mini-List */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1c1f27] overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-emerald-500">trending_up</span>
              <h3 className="text-slate-900 dark:text-white font-bold text-base">Market Movers</h3>
            </div>
          </div>
          <div className="divide-y divide-slate-200 dark:divide-slate-700">
            {marketMovers.length > 0 ? marketMovers.map((mover, i) => (
              <div key={i} className="p-3 hover:bg-slate-50 dark:hover:bg-[#232732] cursor-pointer transition-colors flex items-center justify-between">
                <div>
                  <p className="text-slate-900 dark:text-white font-bold text-sm">{mover.horse} ({mover.raceCourse})</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{mover.raceTime} Race</p>
                </div>
                <div className="text-right">
                  <p className="text-emerald-500 font-bold text-sm flex items-center gap-1 justify-end">
                    <span className="material-symbols-outlined text-[14px]">arrow_drop_down</span> {mover.current.toFixed(1)}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 decoration-line-through">was {mover.opening.toFixed(1)}</p>
                </div>
              </div>
            )) : (
              <div className="p-4 text-center text-sm text-slate-500">No major market moves yet.</div>
            )}
          </div>
        </div>


      </aside>
    </div>
  );
};

export default FixturesView;
