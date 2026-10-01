import { type FC, useState, useMemo, useEffect } from 'react';
import type { HistoricalRecord } from '../../types';
import Button from '../ui/Button';
import DatePicker from '../ui/DatePicker';
import { fetchHistory } from '../../services/geminiService';

const parseTime = (time: string): number => {
  const raw = time.trim().toLowerCase();
  
  // Try HH:MM (optional am/pm)
  const match = raw.match(/(\d{1,2})[:.](\d{2})\s*(am|pm)?/);
  if (match) {
    let h = parseInt(match[1], 10);
    const m = parseInt(match[2], 10);
    const amp = match[3];
    
    if (amp === 'pm' && h < 12) h += 12;
    if (amp === 'am' && h === 12) h = 0;
    
    return h * 60 + m;
  }
  
  return 0;
};

// Helper to get UK date key (YYYY-MM-DD)
const getLocalDayKey = (date?: Date) => {
  try {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/London',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(date || new Date());
    const y = parts.find((p) => p.type === 'year')?.value;
    const m = parts.find((p) => p.type === 'month')?.value;
    const d = parts.find((p) => p.type === 'day')?.value;
    if (y && m && d) return `${y}-${m}-${d}`;
  } catch {
    // fallback
  }
  const d = date || new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

type ResultsViewProps = {
  history: HistoricalRecord[];
  onBack: () => void;
};

const ResultsView: FC<ResultsViewProps> = ({ history, onBack }) => {
  const [venue, setVenue] = useState('All Venues');
  const [raceType, setRaceType] = useState('All Types');
  const [outcome, setOutcome] = useState('All Results');
  
  const [selectedDate, setSelectedDate] = useState(getLocalDayKey());
  const [fetchedHistory, setFetchedHistory] = useState<HistoricalRecord[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Load history when date changes (if not today)
  useEffect(() => {
    const today = getLocalDayKey();
    if (selectedDate === today) return;

    const loadHistory = async () => {
      setIsLoadingHistory(true);
      try {
        const data = await fetchHistory('UK and Ireland', selectedDate);
        setFetchedHistory(data);
      } catch (err) {
        console.error('Failed to load history', err);
        setFetchedHistory([]);
      } finally {
        setIsLoadingHistory(false);
      }
    };
    
    void loadHistory();
  }, [selectedDate]);

  // Determine which history source to use
  const displayHistorySource = useMemo(() => {
    const today = getLocalDayKey();
    if (selectedDate === today) {
      // Filter history to ensure we only show today's results (UK time)
      return history.filter(record => {
        if (record.date) return record.date === today;
        if (record.updatedAt) {
          const recordDayKey = getLocalDayKey(new Date(record.updatedAt));
          return recordDayKey === today;
        }
        return true; 
      });
    }
    return fetchedHistory;
  }, [history, fetchedHistory, selectedDate]);

  // Extract unique venues from current history source
  const venues = useMemo(() => {
    const v = new Set(displayHistorySource.map(h => h.course));
    return Array.from(v).sort();
  }, [displayHistorySource]);

  // Filter logic
  const filteredHistory = useMemo(() => {
    return displayHistorySource.filter(record => {
      // Venue Filter
      if (venue !== 'All Venues' && record.course !== venue) return false;

      // Outcome Filter
      if (outcome === 'Predicted Win' && !record.matched) return false;
      if (outcome === 'Predicted Loss' && record.matched) return false;

      return true;
    }).sort((a, b) => {
      // Sort by time descending (latest first)
      const tA = parseTime(a.time);
      const tB = parseTime(b.time);
      if (tA !== tB) return tB - tA;
      
      // Fallback to updatedAt if times are equal
      return (b.updatedAt || 0) - (a.updatedAt || 0);
    });
  }, [displayHistorySource, venue, raceType, outcome]);

  // Statistics
  const stats = useMemo(() => {
    const counts: Record<string, number> = {};
    let totalWins = 0;
    
    displayHistorySource.forEach(record => {
      if (record.winningBets && record.winningBets.length > 0) {
        totalWins++;
        record.winningBets.forEach(bet => {
          counts[bet] = (counts[bet] || 0) + 1;
        });
      }
    });
    
    return { counts, totalWins };
  }, [displayHistorySource]);

  const title = useMemo(() => {
    const today = getLocalDayKey();
    if (selectedDate === today) return "Today's Results";
    
    const date = new Date(selectedDate);
    return `Results for ${date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`;
  }, [selectedDate]);

  return (
    <div className="flex-1 flex flex-col max-w-[1440px] mx-auto w-full px-4 md:px-6 lg:px-12 py-6">
      {/* Breadcrumbs */}
      <div className="flex flex-wrap gap-2 pb-4 items-center">
        <button onClick={onBack} className="text-slate-500 dark:text-text-secondary text-sm font-medium hover:text-slate-900 dark:hover:text-white transition-colors">
          Home
        </button>
        <span className="material-symbols-outlined text-slate-500 dark:text-text-secondary text-xs">chevron_right</span>
        <span className="text-slate-900 dark:text-white text-sm font-medium">Results</span>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        <div className="xl:col-span-12 flex flex-col gap-6"> {/* Expanded to full width as we don't have the sidebar content from racecard.txt if any */}
          
          {/* Header & Controls */}
          <div className="flex flex-col gap-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white font-display">{title}</h1>
            </div>

            {/* Statistics Card */}
            {stats.totalWins > 0 && (
              <div className="bg-white dark:bg-card-dark rounded-xl p-4 border border-slate-200 dark:border-card-border shadow-sm">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-xl">analytics</span>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Performance Stats</h3>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {Object.entries(stats.counts).sort(([,a], [,b]) => b - a).map(([type, count]) => (
                      <div key={type} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-card-border/30 border border-slate-100 dark:border-card-border">
                        <span className="text-xs font-medium text-slate-500 dark:text-text-secondary">{type}</span>
                        <span className="text-sm font-bold text-slate-900 dark:text-white">{count}</span>
                      </div>
                    ))}
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-50 dark:bg-green-500/10 border border-green-100 dark:border-green-500/20 ml-auto">
                        <span className="text-xs font-bold text-green-700 dark:text-green-400">Total Winning Races</span>
                        <span className="text-sm font-bold text-green-800 dark:text-green-300">{stats.totalWins}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Filters */}
            <div className="bg-white dark:bg-card-dark rounded-xl p-4 border border-slate-200 dark:border-card-border grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-slate-500 dark:text-text-secondary font-medium uppercase tracking-wider">Date</label>
                <DatePicker 
                  value={selectedDate} 
                  onChange={setSelectedDate} 
                  maxDate={getLocalDayKey()} // Can't select future dates for results
                  minDate="2026-01-06" // Restrict history to Jan 6th 2026 onwards
                  className="w-full"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-slate-500 dark:text-text-secondary font-medium uppercase tracking-wider">Venue</label>
                <div className="relative">
                  <select 
                    value={venue}
                    onChange={(e) => setVenue(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-background-dark border border-slate-200 dark:border-card-border rounded px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-1 focus:ring-primary focus:border-primary appearance-none cursor-pointer"
                  >
                    <option>All Venues</option>
                    {venues.map(v => <option key={v}>{v}</option>)}
                  </select>
                  <span className="material-symbols-outlined absolute right-3 top-2.5 text-slate-500 dark:text-text-secondary pointer-events-none text-sm">arrow_drop_down</span>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-slate-500 dark:text-text-secondary font-medium uppercase tracking-wider">Race Type</label>
                <div className="relative">
                  <select 
                    value={raceType}
                    onChange={(e) => setRaceType(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-background-dark border border-slate-200 dark:border-card-border rounded px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-1 focus:ring-primary focus:border-primary appearance-none cursor-pointer"
                  >
                    <option>All Types</option>
                    <option>Flat</option>
                    <option>Jump</option>
                    <option>Handicap</option>
                  </select>
                  <span className="material-symbols-outlined absolute right-3 top-2.5 text-slate-500 dark:text-text-secondary pointer-events-none text-sm">arrow_drop_down</span>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-slate-500 dark:text-text-secondary font-medium uppercase tracking-wider">AI Outcome</label>
                <div className="relative">
                  <select 
                    value={outcome}
                    onChange={(e) => setOutcome(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-background-dark border border-slate-200 dark:border-card-border rounded px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-1 focus:ring-primary focus:border-primary appearance-none cursor-pointer"
                  >
                    <option>All Results</option>
                    <option>Predicted Win</option>
                    <option>Predicted Loss</option>
                  </select>
                  <span className="material-symbols-outlined absolute right-3 top-2.5 text-slate-500 dark:text-text-secondary pointer-events-none text-sm">filter_list</span>
                </div>
              </div>
            </div>
          </div>
          
          {isLoadingHistory && (
             <div className="p-12 flex justify-center items-center">
               <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
             </div>
          )}

          {/* Results List */}
          {!isLoadingHistory && (
          <div className="bg-white dark:bg-card-dark rounded-xl border border-slate-200 dark:border-card-border overflow-hidden">
            <div className="grid grid-cols-12 gap-4 p-4 border-b border-slate-200 dark:border-card-border bg-slate-50 dark:bg-background-dark/50 text-xs font-bold text-slate-500 dark:text-text-secondary uppercase tracking-wider">
              <div className="col-span-3 lg:col-span-3">Race Info</div>
              <div className="col-span-3 lg:col-span-3">Winner</div>
              <div className="col-span-3 lg:col-span-3">AI Prediction</div>
              <div className="col-span-3 lg:col-span-3 text-right">Outcome</div>
            </div>
            
            {filteredHistory.length === 0 ? (
              <div className="p-8 text-center text-slate-500 dark:text-text-secondary">
                No results found for the selected filters.
              </div>
            ) : (
              filteredHistory.map((record) => {
                // Determine date display
                let dateDisplay = 'Unknown Date';
                if (record.date) {
                    dateDisplay = new Date(record.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
                } else if (record.updatedAt) {
                    const d = new Date(record.updatedAt);
                    const now = new Date();
                    const isToday = d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
                    const yesterday = new Date(now);
                    yesterday.setDate(now.getDate() - 1);
                    const isYesterday = d.getDate() === yesterday.getDate() && d.getMonth() === yesterday.getMonth() && d.getFullYear() === yesterday.getFullYear();
                    
                    if (isToday) dateDisplay = 'Today';
                    else if (isYesterday) dateDisplay = 'Yesterday';
                    else dateDisplay = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
                }

                return (
                  <div key={record.raceId} className="grid grid-cols-12 gap-4 p-4 border-b border-slate-200 dark:border-card-border hover:bg-slate-50 dark:hover:bg-card-border/20 transition-colors items-center">
                    {/* Race Info */}
                    <div className="col-span-3 lg:col-span-3">
                      <div className="flex flex-col">
                        <span className="text-slate-900 dark:text-white font-bold">{record.time} {record.course}</span>
                        <span className="text-xs text-slate-500 dark:text-text-secondary mt-0.5">
                          {[record.distance, record.going, record.weather].filter(Boolean).join(' • ') || 'Race Info Unavailable'}
                        </span>
                        <span className="text-xs text-slate-500 dark:text-text-secondary">{dateDisplay}</span>
                      </div>
                    </div>

                    {/* Winner */}
                    <div className="col-span-3 lg:col-span-3">
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-yellow-700 dark:text-yellow-500">1st</span>
                          <span className="text-slate-900 dark:text-white text-sm font-bold">{record.actualWinner}</span>
                        </div>
                        {(record.actualPlaced || [])
                          .filter(h => h !== record.actualWinner)
                          .slice(0, 3)
                          .map((horse, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{idx === 0 ? '2nd' : idx === 1 ? '3rd' : '4th'}</span>
                            <span className="text-slate-600 dark:text-slate-300 text-xs font-medium">{horse}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* AI Prediction */}
                    <div className="col-span-3 lg:col-span-3">
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-primary">1st</span>
                          <span className="text-primary text-sm font-bold flex items-center gap-1">
                            {record.predictedWinner}
                            {record.matched && <span className="material-symbols-outlined text-[14px]">check_circle</span>}
                          </span>
                        </div>
                        {(record.predictedPlaced || [])
                          .filter(h => h !== record.predictedWinner)
                          .slice(0, 3)
                          .map((horse, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{idx === 0 ? '2nd' : idx === 1 ? '3rd' : '4th'}</span>
                            <span className="text-slate-600 dark:text-slate-300 text-xs font-medium">{horse}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Outcome */}
                    <div className="col-span-3 lg:col-span-3 text-right">
                      {record.winningBets && record.winningBets.length > 0 ? (
                        <div className="flex flex-col gap-1 items-end">
                          {record.winningBets.map((bet, i) => (
                             <span key={i} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20">
                               <span className="size-1.5 rounded-full bg-green-500"></span>
                               {bet}
                             </span>
                          ))}
                        </div>
                      ) : record.matched ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20">
                          <span className="size-1.5 rounded-full bg-green-500"></span>
                          Correct Win
                        </span>
                      ) : (
                         <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
                          <span className="size-1.5 rounded-full bg-red-500"></span>
                          Loss
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResultsView;
