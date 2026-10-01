import { type FC, useMemo } from 'react';
import type { HistoricalRecord, Prediction, Race } from '../../types';
import { getCardImage } from '../../constants';
import RaceBroadcastBoard from '../RaceBroadcastBoard';
import { normalizeName } from '../../utils/formatting';

type HomeViewProps = {
  races: Race[];
  predictions: Record<string, Prediction>;
  history: HistoricalRecord[];
  onNavigate: (view: string) => void;
  onSelectRace: (race: Race) => void;
};

const HomeView: FC<HomeViewProps> = ({ races, predictions, history, onNavigate, onSelectRace }) => {
  // Calculate Today's Stats
  const { winners, totalFinished } = useMemo(() => {
    // We need to filter history for "today"
    // Since we don't have a robust date helper here, let's assume history contains relevant recent data
    // Or check if the record was updated today.
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    
    // Filter for today's races that are finished
    const todayRecs = (history || []).filter(h => {
        if (h.date) return h.date === todayStr;
        if (h.updatedAt) {
            const d = new Date(h.updatedAt);
            return d.toISOString().split('T')[0] === todayStr;
        }
        return false; // conservative
    });
    
    return {
        winners: todayRecs.filter(h => h.matched).length,
        totalFinished: todayRecs.length
    };
  }, [history]);

  const strikeRate = totalFinished > 0 ? Math.round((winners / totalFinished) * 100) : 0;
  
  // Calculate 7-Day Stats (Rolling window from today back 7 days)
  const { weekWinners, weekStrikeRate, weekTotal } = useMemo(() => {
    // End date: Today
    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);
    
    // Start date: 6 days ago (total 7 days including today)
    const startDate = new Date(endDate);
    startDate.setDate(endDate.getDate() - 6);
    startDate.setHours(0, 0, 0, 0);
    
    // Filter history for this rolling window
    const weekRecs = (history || []).filter(h => {
        let d: Date;
        if (h.date) {
            d = new Date(h.date);
        } else if (h.updatedAt) {
            d = new Date(h.updatedAt);
        } else {
            return false;
        }
        return d >= startDate && d <= endDate;
    });
    
    const w = weekRecs.filter(h => h.matched).length;
    const firstPlaceWinners = weekRecs.filter(h =>
      normalizeName(h.predictedWinner) === normalizeName(h.actualWinner)
    ).length;
    const t = weekRecs.length;
    
    return {
      weekWinners: firstPlaceWinners,
        weekTotal: t,
        weekStrikeRate: t > 0 ? Math.round((w / t) * 100) : 0
    };
  }, [history]);

  // Recent Results for Ticker (Strictly Today)
  const recentResults = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    return (history || [])
    .filter(h => {
      // Must be from today
      if (h.date) return h.date === todayStr;
      if (h.updatedAt) {
          const d = new Date(h.updatedAt);
          return d.toISOString().split('T')[0] === todayStr;
      }
      return false;
    })
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
    .slice(0, 10);
  }, [history]);

  // Get Top 3 AI Picks (Highest confidence, upcoming)
  const topPicks = (races || [])
    .filter(race => {
      if (race.status === 'finished') return false;
      const now = new Date();
      const currentHm = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      return race.time >= currentHm;
    })
    .sort((a, b) => {
      const confA = predictions[a.id]?.confidence || 0;
      const confB = predictions[b.id]?.confidence || 0;
      return confB - confA;
    })
    .slice(0, 3);

  return (
    <div className="flex flex-col min-h-screen bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-white antialiased selection:bg-primary selection:text-white">
      
      {/* Hero Section */}
      <div className="relative w-full overflow-hidden">
        {/* Background Gradient/Image Overlay */}
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-r from-background-light via-background-light/95 to-transparent dark:from-background-dark dark:via-background-dark/95 dark:to-transparent z-10"></div>
          <div 
            className="w-full h-full bg-cover bg-center opacity-40 dark:opacity-30" 
            style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuAGrMpDW0W_uxh3ebFEtPmG2FcwiX2Y387eGQO6woWOWZASHmFrwyzU012whYd0EXK_uQK2C5ItnLqAZabGY8vcWiiNpYwnjKmu18GcKFv8poQlerqQFkP3agRLG-HasZdZCvF1TF9ZoAw4f4gV_GlnLZ-CXpYtB_pqwMX4byXXbwzpO_U4yzNgOMryc9RbC26SxhpGlIPJXE624QSDTWkNAtN6212uN_H6Ey-tddx2zn8svPB35AwWpGF7gMmqN-vqxl4ob-Gfq69w')" }}
          >
          </div>
        </div>
        
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
          <div className="max-w-2xl flex flex-col gap-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 w-fit">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              <span className="text-xs font-semibold text-primary uppercase tracking-wider">Live Analysis Active</span>
            </div>
            
            <h1 className="text-5xl sm:text-6xl font-black tracking-tight leading-[1.1]">
              Data-Driven Decisions. <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-400">Beat the Bookie.</span>
            </h1>
            
            <p className="text-lg text-slate-600 dark:text-slate-400 font-medium max-w-lg leading-relaxed">
              Our AI analyzes comprehensive race data including track conditions, pedigree, and trainer form to give you the winning edge.
            </p>
            
            <div className="flex flex-wrap gap-4 pt-4">
              <button 
                onClick={() => onNavigate('fixtures')}
                className="flex items-center justify-center h-12 px-6 bg-primary hover:bg-blue-700 text-white text-base font-bold rounded-lg transition-all shadow-xl shadow-primary/25"
              >
                View Today's Tips
              </button>
              <button 
                onClick={() => onNavigate('results')}
                className="flex items-center justify-center h-12 px-6 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-900 dark:text-white text-base font-bold rounded-lg transition-colors border border-slate-300 dark:border-slate-700"
              >
                See Results
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Dashboard Strip */}
      <div className="w-full border-y border-slate-200 dark:border-slate-800 bg-white dark:bg-[#151b26]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-200 dark:divide-slate-800">
            
            <div className="flex items-center gap-4 py-6 px-4 md:justify-center">
              <div className="p-3 rounded-full bg-green-500/10 text-green-500">
                <span className="material-symbols-outlined">trending_up</span>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Strike Rate Today</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-2xl font-bold">{strikeRate > 0 ? `${strikeRate}%*` : 'N/A'}</p>
                  <span className="text-xs font-bold text-green-500">{totalFinished > 0 ? `${totalFinished} Races` : 'No Results Yet'}</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-4 py-6 px-4 md:justify-center">
              <div className="p-3 rounded-full bg-primary/10 text-primary">
                <span className="material-symbols-outlined">analytics</span>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">7-Day Accuracy</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-2xl font-bold">{weekStrikeRate > 0 ? `${weekStrikeRate}%*` : 'N/A'}</p>
                  <span className="text-xs font-bold text-green-500">{weekTotal} Races</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-4 py-6 px-4 md:justify-center">
              <div className="p-3 rounded-full bg-purple-500/10 text-purple-500">
                <span className="material-symbols-outlined">emoji_events</span>
              </div>
              <div>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">1st Place Winners</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-2xl font-bold">{weekWinners}</p>
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Last 7 Days</span>
                </div>
              </div>
            </div>
            
          </div>
        </div>
      </div>

      {/* Main Content Container */}
      <div className="flex-1 w-full bg-background-light dark:bg-background-dark py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col gap-12">

          <RaceBroadcastBoard
            races={races}
            predictions={predictions}
            history={history}
            onSelectRace={onSelectRace}
          />
          
          {/* Top Predictions Section */}
          <section>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold">Top Predictions</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Highest confidence selections for today's cards</p>
              </div>
              <button 
                onClick={() => onNavigate('fixtures')}
                className="hidden sm:flex items-center gap-1 text-sm font-bold text-primary hover:text-blue-400 transition-colors"
              >
                View All
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {topPicks.length > 0 ? topPicks.map((race, index) => {
                const pred = predictions[race.id];
                const confidence = pred?.confidence || 0;
                const winnerHorse = race.horses.find(h => h.name === pred?.winner);
                const isNextOff = index === 0;
                const image = getCardImage(race.id);
                
                return (
                  <div 
                    key={race.id}
                    onClick={() => onSelectRace(race)}
                    className="group flex flex-col bg-white dark:bg-card-dark rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-lg hover:border-primary/50 transition-all duration-300 overflow-hidden cursor-pointer"
                  >
                    <div className="h-32 bg-cover bg-[center_30%] relative" style={{ backgroundImage: `url('${image}')` }}>
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
                      <div className="absolute bottom-3 left-4 text-white">
                        {isNextOff && (
                          <p className="text-xs font-semibold bg-primary px-2 py-0.5 rounded mb-1 w-fit">Next Off</p>
                        )}
                        <h3 className="font-bold text-lg">{race.time} {race.course}</h3>
                      </div>
                    </div>
                    
                    <div className="p-5 flex flex-col gap-4 flex-1">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">Horse</p>
                          <p className="font-bold text-lg truncate max-w-[150px]">{pred?.winner || 'Analyzing...'}</p>
                          {winnerHorse && (
                            <p className="text-xs text-slate-400">Jockey: {winnerHorse.jockey}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">Odds</p>
                          <p className="font-mono font-bold text-xl text-primary">
                            {winnerHorse?.currentOdds ? winnerHorse.currentOdds.toFixed(2) : '-'}
                          </p>
                        </div>
                      </div>
                      
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-sm font-medium">
                          <span>Prediction Confidence</span>
                          <span className={confidence >= 80 ? "text-green-500" : "text-yellow-500"}>
                            {confidence}%
                          </span>
                        </div>
                        <div className="h-2 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${confidence >= 80 ? "bg-green-500" : "bg-yellow-500"}`} 
                            style={{ width: `${confidence}%` }}
                          ></div>
                        </div>
                      </div>
                      
                      <button className="mt-auto w-full py-2.5 rounded-lg bg-slate-900 dark:bg-slate-700 text-white font-bold text-sm hover:bg-primary dark:hover:bg-primary transition-colors flex items-center justify-center gap-2">
                        <span className="material-symbols-outlined text-[18px]">visibility</span>
                        View Analysis
                      </button>
                    </div>
                  </div>
                );
              }) : (
                 <div className="col-span-3 py-12 text-center border border-dashed border-slate-300 dark:border-slate-800 rounded-2xl">
                    <p className="text-slate-500 font-medium">No upcoming high-confidence predictions found.</p>
                 </div>
              )}
            </div>
            
            <div className="mt-6 text-center sm:hidden">
              <button 
                onClick={() => onNavigate('fixtures')}
                className="inline-flex items-center gap-1 text-sm font-bold text-primary hover:text-blue-400 transition-colors"
              >
                View All Predictions
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </button>
            </div>
          </section>

          {/* Live Feed / Ticker */}
          <div className="w-full bg-slate-100 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-lg py-3 px-4 flex items-center gap-4 overflow-hidden">
            <div className="flex items-center gap-2 text-primary font-bold whitespace-nowrap">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              LATEST RESULTS
            </div>
            <div className="h-4 w-[1px] bg-slate-300 dark:bg-slate-700"></div>
            <div className="flex-1 overflow-hidden relative mask-linear-gradient">
              <div className="animate-marquee whitespace-nowrap inline-flex items-center gap-8 text-sm text-slate-600 dark:text-slate-300">
                {recentResults.length > 0 ? (
                  recentResults.map((res, i) => (
                    <span key={i}>
                      <strong className="text-slate-900 dark:text-white">{res.course} {res.time}:</strong> {res.actualWinner} wins
                    </span>
                  ))
                ) : (
                  <span><strong className="text-slate-900 dark:text-white">System:</strong> Waiting for latest results...</span>
                )}
              </div>
            </div>
          </div>

          {/* How It Works Section */}
          <section id="how-it-works" className="py-12 border-t border-slate-200 dark:border-slate-800">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold tracking-tight">How It Works</h2>
              <p className="text-slate-500 dark:text-slate-400 mt-2">Simple steps to smarter betting</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              <div className="flex flex-col items-center text-center gap-4 p-6 rounded-2xl bg-white dark:bg-card-dark border border-slate-200 dark:border-slate-800">
                <div className="size-16 rounded-full bg-blue-500/10 flex items-center justify-center text-primary mb-2">
                  <span className="material-symbols-outlined text-[32px]">calendar_month</span>
                </div>
                <h3 className="text-lg font-bold">1. We Scan Every Race</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                  Our system monitors all daily races across the UK & Ireland, identifying the best opportunities so you don't have to study the form guide.
                </p>
              </div>

              <div className="flex flex-col items-center text-center gap-4 p-6 rounded-2xl bg-white dark:bg-card-dark border border-slate-200 dark:border-slate-800">
                <div className="size-16 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-500 mb-2">
                  <span className="material-symbols-outlined text-[32px]">psychology</span>
                </div>
                <h3 className="text-lg font-bold">2. AI Analyzes the Data</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                  Our advanced AI processes millions of data points—jockey stats, weather, and track conditions—to find the horses with the highest winning potential.
                </p>
              </div>

              <div className="flex flex-col items-center text-center gap-4 p-6 rounded-2xl bg-white dark:bg-card-dark border border-slate-200 dark:border-slate-800">
                <div className="size-16 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500 mb-2">
                  <span className="material-symbols-outlined text-[32px]">trending_up</span>
                </div>
                <h3 className="text-lg font-bold">3. We Watch the Market</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                  We track real-time betting trends to spot where the 'smart money' is going, alerting you to horses that are being heavily backed.
                </p>
              </div>

              <div className="flex flex-col items-center text-center gap-4 p-6 rounded-2xl bg-white dark:bg-card-dark border border-slate-200 dark:border-slate-800">
                <div className="size-16 rounded-full bg-green-500/10 flex items-center justify-center text-green-500 mb-2">
                  <span className="material-symbols-outlined text-[32px]">verified</span>
                </div>
                <h3 className="text-lg font-bold">4. You Get the Winner</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                  Receive clear, high-confidence predictions. We verify every result instantly and track our performance openly, so you can bet with confidence.
                </p>
              </div>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
};

export default HomeView;
