import { type FC, useMemo, useState, useEffect } from 'react';
import type { Race, Prediction, Horse, ActualResults } from '../../types';
import { getCardImage } from '../../constants';
import { analyzeWinningBets } from '../../utils/betting';
import { normalizeName } from '../../utils/formatting';
import { getActiveRunners } from '../../utils/racing';

type PredictionViewProps = {
  race: Race;
  allRaces?: Race[];
  raceDate?: string;
  prediction: Prediction | null;
  actualResults?: ActualResults | null;
  onBack: () => void;
  onSelectRace?: (race: Race) => void;
  onNavigate?: (view: string) => void;
  onFetchResult?: () => Promise<void>;
};

const PredictionView: FC<PredictionViewProps> = ({ 
  race,
  allRaces = [],
  raceDate,
  prediction, 
  actualResults,
  onBack, 
  onSelectRace, 
  onNavigate,
  onFetchResult 
}) => {
  // Manual fetch logic removed
  const activeHorses = useMemo(() => getActiveRunners(race.horses), [race.horses]);
  const activeRunnerCount = activeHorses.length;

  const winnerHorse = prediction ? activeHorses.find(h => normalizeName(h.name) === normalizeName(prediction.winner)) : null;
  const confidence = prediction?.confidence || 0;
  const predictionSourceLabel = prediction?.source === 'local-brain'
    ? 'Local Brain'
    : prediction?.source === 'hybrid'
      ? 'Local + Gemini'
      : 'AI';
  const todayKey = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London' }).format(new Date());
  const isHistorical = Boolean(raceDate && raceDate !== todayKey);
  
  // Get next 2 races dynamically
  const nextRaces = useMemo(() => {
    if (!allRaces || allRaces.length === 0) return [];
    
    const now = new Date();
    // Helper to parse "HH:MM" to Date object for today
    const parseTime = (timeStr: string) => {
      const [hours, minutes] = timeStr.split(':').map(Number);
      const date = raceDate ? new Date(`${raceDate}T00:00:00`) : new Date();
      date.setHours(hours, minutes, 0, 0);
      return date;
    };

    const upcoming = allRaces.filter(r => {
      // Filter out current race
      if (r.id === race.id) return false;
      // Filter out abandoned
      if (r.status === 'abandoned') return false;
      
      const raceTime = parseTime(r.time);
      return isHistorical ? raceTime > parseTime(race.time) : raceTime > now;
    });

    return upcoming.sort((a, b) => {
      const timeA = parseTime(a.time).getTime();
      const timeB = parseTime(b.time).getTime();
      return timeA - timeB;
    }).slice(0, 2);
  }, [allRaces, race.id, race.time, raceDate, isHistorical]);

  // Sort horses: Prediction winner first, then by odds
  const sortedHorses = useMemo(() => {
    return [...activeHorses].sort((a, b) => {
      if (prediction && a.name === prediction.winner) return -1;
      if (prediction && b.name === prediction.winner) return 1;
      if (!Number.isFinite(a.currentOdds) && !Number.isFinite(b.currentOdds)) return 0;
      if (!Number.isFinite(a.currentOdds)) return 1;
      if (!Number.isFinite(b.currentOdds)) return -1;
      return a.currentOdds - b.currentOdds;
    });
  }, [activeHorses, prediction]);

  const topPicks = useMemo(() => {
    // Helper to robustly compare horses
    const areSameHorse = (h1: Horse, h2: Horse) => {
      if (h1.id && h2.id) return h1.id === h2.id;
      return normalizeName(h1.name) === normalizeName(h2.name);
    };

    // 1. Start with the Winner
    // Use robust match instead of just name
    const winner = activeHorses.find(h => normalizeName(h.name) === normalizeName(prediction?.winner || ''));
    
    if (!winner) return sortedHorses.slice(0, 4);

    let picks = [winner];

    // 2. Add Placed horses (excluding winner if present)
    if (prediction?.placed && prediction.placed.length > 0) {
       const placedHorses = prediction.placed
         .map(name => activeHorses.find(h => normalizeName(h.name) === normalizeName(name)))
         .filter((h): h is Horse => !!h && !areSameHorse(h, winner));
       
       picks = [...picks, ...placedHorses];
    }

    // 3. Fill remaining from sortedHorses (odds/logic) if needed
    if (picks.length < 4) {
        const remaining = sortedHorses.filter(h => !picks.some(p => areSameHorse(p, h)));
        picks = [...picks, ...remaining];
    }

    return picks.slice(0, 4);
  }, [prediction, activeHorses, sortedHorses]);

  // Analyze Winning Bets
  const winningBets = useMemo(() => {
    return analyzeWinningBets(prediction, actualResults, activeRunnerCount);
  }, [prediction, actualResults, activeRunnerCount]);

  const suitabilityPercent = useMemo(() => {
    if (prediction && winnerHorse) {
      const prob = prediction.winProbabilities?.find(p => p.horse === winnerHorse.name)?.probability;
      const val = typeof prob === 'number' ? prob : confidence;
      const clamped = Math.max(0, Math.min(100, Math.round(val)));
      return clamped;
    }
    return 0;
  }, [prediction, winnerHorse, confidence]);
  


  const getSilkColor = (name: string) => {
    const colors = [
      'bg-red-500', 'bg-blue-600', 'bg-green-600', 'bg-yellow-500', 
      'bg-purple-600', 'bg-pink-500', 'bg-indigo-500', 'bg-orange-500',
      'bg-teal-600', 'bg-cyan-600'
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };
  
  const getBookieColors = (name: string) => {
    if (name === 'Bet365') return { bar: 'bg-green-600', hover: 'group-hover:bg-green-500', tip: 'bg-green-700' };
    if (name === 'Sky') return { bar: 'bg-red-500', hover: 'group-hover:bg-red-400', tip: 'bg-red-600' };
    if (name === 'PP') return { bar: 'bg-green-700', hover: 'group-hover:bg-green-600', tip: 'bg-green-800' };
    if (name === 'WH') return { bar: 'bg-blue-900', hover: 'group-hover:bg-blue-800', tip: 'bg-blue-800' };
    return { bar: 'bg-gray-600', hover: 'group-hover:bg-gray-500', tip: 'bg-gray-700' };
  };

  // Market Efficiency Calculations
  const { aiPrice, marketPrice, edge, bookies } = useMemo(() => {
    if (!prediction || !winnerHorse) return { aiPrice: 0, marketPrice: null, edge: null, bookies: [] };

    // Convert confidence to decimal odds (implied probability)
    // e.g. 50% confidence -> 2.0 odds
    const aiOdds = prediction.confidence > 0 ? (100 / prediction.confidence) : 10.0;
    const mktOdds = Number.isFinite(winnerHorse.currentOdds) ? winnerHorse.currentOdds : null;

    if (mktOdds === null) {
      return { aiPrice: aiOdds, marketPrice: null, edge: null, bookies: [] };
    }
    
    // Edge calculation: (Market Odds - AI Odds) / AI Odds
    // e.g. AI says 2.0, Market says 2.5 -> (2.5 - 2.0) / 2.0 = 0.25 (25% edge)
    const edgeVal = aiOdds > 0 ? ((mktOdds - aiOdds) / aiOdds) * 100 : 0;

    return {
      aiPrice: aiOdds,
      marketPrice: mktOdds,
      edge: edgeVal,
      bookies: []
    };
  }, [prediction, winnerHorse]);

  // Normalize heights for the chart (max value is 100% height)
  const maxVal = Math.max(aiPrice || 0, ...bookies.map(b => b.odds || 0));
  const maxChartVal = (maxVal && !isNaN(maxVal) && maxVal > 0) ? maxVal * 1.2 : 10; // Ensure never 0 and give 20% headroom

  const filteredPlaced = useMemo(() => {
    if (!actualResults?.placed) return [];
    return actualResults.placed.filter(h => normalizeName(h) !== normalizeName(actualResults.winner));
  }, [actualResults]);

  if (race.status === 'abandoned') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh] gap-6 animate-fade-in p-6">
        <div className="rounded-full bg-red-500/10 p-6 ring-1 ring-red-500/20">
          <span className="material-symbols-outlined text-4xl text-red-500">block</span>
        </div>
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-black text-white">Race Abandoned</h1>
          <p className="text-slate-400 max-w-md mx-auto">
            The {race.time} at {race.course} has been abandoned. No analysis is available for this event.
          </p>
        </div>
        <button 
          onClick={() => onNavigate ? onNavigate('fixtures') : onBack()}
          className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-6 py-3 rounded-xl font-bold transition-colors"
        >
          <span className="material-symbols-outlined">arrow_back</span>
          Back to Fixtures
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col max-w-[1440px] mx-auto w-full px-4 md:px-6 lg:px-12 py-6 animate-fade-in">
      {/* Breadcrumbs */}
      <div className="flex flex-wrap gap-2 pb-4 items-center">
        <button 
          onClick={() => onNavigate ? onNavigate('home') : onBack()} 
          className="text-slate-500 dark:text-text-secondary text-sm font-medium hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          Home
        </button>
        <span className="material-symbols-outlined text-slate-400 dark:text-text-secondary text-xs">chevron_right</span>
        <button 
          onClick={() => onNavigate ? onNavigate('fixtures') : onBack()} 
          className="text-slate-500 dark:text-text-secondary text-sm font-medium hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          UK Racing
        </button>
        <span className="material-symbols-outlined text-slate-400 dark:text-text-secondary text-xs">chevron_right</span>
        <button 
          onClick={() => onNavigate ? onNavigate('fixtures') : onBack()} 
          className="text-slate-500 dark:text-text-secondary text-sm font-medium hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          {race.course}
        </button>
        <span className="material-symbols-outlined text-slate-400 dark:text-text-secondary text-xs">chevron_right</span>
        <span className="text-slate-900 dark:text-white text-sm font-medium">{race.time} Handicap</span>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* MAIN CONTENT AREA */}
        <div className="xl:col-span-8 flex flex-col gap-6">
          
          {/* Race Header Card */}
          <div className="bg-white dark:bg-card-dark rounded-xl p-6 border border-slate-200 dark:border-card-border shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-full bg-gradient-to-l from-primary/10 to-transparent pointer-events-none"></div>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 relative z-10">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <span className="bg-primary/20 text-primary px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider">{isHistorical ? 'Historical' : 'Live'}</span>
                  <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900 dark:text-white">{race.time} {race.course}</h1>
                </div>
                <p className="text-slate-500 dark:text-text-secondary font-medium">
                  Class {race.class || 'N/A'} Handicap | {race.distance} | {race.going}
                </p>
              </div>
              <div className="flex items-center gap-4">
                {/* Result Button Removed */}


                <div className="text-right hidden sm:block">
                  <div className="text-xs text-slate-500 dark:text-text-secondary uppercase tracking-wider mb-1">Runners</div>
                  <div className="text-xl font-bold text-slate-900 dark:text-white">{activeRunnerCount}</div>
                </div>
                <div className="h-10 w-px bg-slate-200 dark:bg-card-border hidden sm:block"></div>
                <div className="flex flex-col items-end">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-slate-500 dark:text-text-secondary">cloud</span>
                    <span className="text-slate-900 dark:text-white font-medium">{race.weather}</span>
                  </div>
                  <span className="text-sm text-slate-500 dark:text-text-secondary">{race.going}</span>
                </div>
              </div>
            </div>

            {/* Race Result Banner */}
            {actualResults && (
              <>
                <div className="bg-slate-900 text-white rounded-lg p-5 border border-slate-800 shadow-lg relative overflow-hidden mb-6">
                  <div className="absolute top-0 right-0 w-64 h-full bg-gradient-to-l from-yellow-500/20 to-transparent pointer-events-none"></div>
                  <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="bg-yellow-500 text-slate-900 px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider">Official Result</span>
                        <span className="text-slate-400 text-sm">{race.time} {race.course}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-full bg-yellow-500 flex items-center justify-center text-slate-900 font-bold text-xl border-4 border-slate-800">1st</div>
                        <div>
                          <h3 className="text-2xl font-bold text-white">{actualResults.winner}</h3>
                          <p className="text-yellow-500 text-sm font-medium">Winner</p>
                        </div>
                      </div>
                    </div>
                    
                    {filteredPlaced && filteredPlaced.length > 0 && (
                      <div className="flex gap-4 border-t md:border-t-0 md:border-l border-slate-700 pt-4 md:pt-0 md:pl-6">
                        {filteredPlaced.map((horse, idx) => (
                          <div key={idx} className="flex flex-col items-center">
                            <span className="text-slate-400 text-xs uppercase tracking-wider mb-1">{idx === 0 ? '2nd' : idx === 1 ? '3rd' : `${idx + 2}th`}</span>
                            <span className="font-bold">{horse}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Prediction Match Status */}
                    {prediction && (
                      <div className={`px-4 py-2 rounded-lg border ${
                        normalizeName(actualResults.winner) === normalizeName(prediction.winner)
                          ? 'bg-green-500/20 border-green-500/30 text-green-400'
                          : 'bg-red-500/20 border-red-500/30 text-red-400'
                      }`}>
                        <div className="flex items-center gap-2 font-bold">
                          <span className="material-symbols-outlined">
                            {normalizeName(actualResults.winner) === normalizeName(prediction.winner) ? 'check_circle' : 'cancel'}
                          </span>
                          {normalizeName(actualResults.winner) === normalizeName(prediction.winner) ? 'AI WON' : 'AI LOST'}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Comparison & Winning Bets Section */}
                {prediction && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    {/* Comparison Table */}
                    <div className="bg-white dark:bg-card-dark rounded-xl border border-slate-200 dark:border-card-border overflow-hidden">
                      <div className="bg-slate-50 dark:bg-background-dark/50 px-4 py-3 border-b border-slate-200 dark:border-card-border">
                        <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <span className="material-symbols-outlined text-primary">compare_arrows</span>
                          Result Comparison
                        </h3>
                      </div>
                      <div className="p-4">
                        <div className="grid grid-cols-2 gap-4">
                          {/* AI Prediction Column */}
                          <div className="space-y-3">
                              <div className="text-xs font-bold text-slate-500 dark:text-text-secondary uppercase tracking-wider border-b border-slate-200 dark:border-card-border pb-2">
                                {predictionSourceLabel} Predicted
                            </div>
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <span className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">1</span>
                                <span className={`text-sm font-medium ${
                                  normalizeName(prediction.winner) === normalizeName(actualResults.winner)
                                    ? 'text-green-600 dark:text-green-400'
                                    : 'text-slate-900 dark:text-white'
                                }`}>
                                  {prediction.winner}
                                </span>
                              </div>
                              {(prediction.placed || []).slice(0, 2).map((horse, idx) => (
                                <div key={horse + idx} className="flex items-center gap-2">
                                  <span className="h-6 w-6 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center text-xs font-bold">{idx + 2}</span>
                                  <span className={`text-sm ${
                                    actualResults.placed?.some(h => normalizeName(h) === normalizeName(horse))
                                      ? 'text-green-600 dark:text-green-400 font-medium'
                                      : 'text-slate-600 dark:text-text-secondary'
                                  }`}>
                                    {horse}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Official Result Column */}
                          <div className="space-y-3">
                            <div className="text-xs font-bold text-slate-500 dark:text-text-secondary uppercase tracking-wider border-b border-slate-200 dark:border-card-border pb-2">
                              Official Result
                            </div>
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <span className="h-6 w-6 rounded-full bg-yellow-500 text-slate-900 flex items-center justify-center text-xs font-bold">1</span>
                                <span className="text-sm font-bold text-slate-900 dark:text-white">
                                  {actualResults.winner}
                                </span>
                              </div>
                              {filteredPlaced.slice(0, 2).map((horse, idx) => (
                                <div key={horse + idx} className="flex items-center gap-2">
                                  <span className="h-6 w-6 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center text-xs font-bold">{idx + 2}</span>
                                  <span className="text-sm text-slate-600 dark:text-text-secondary">
                                    {horse}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Winning Bets Panel */}
                    <div className="bg-white dark:bg-card-dark rounded-xl border border-slate-200 dark:border-card-border overflow-hidden flex flex-col">
                      <div className="bg-slate-50 dark:bg-background-dark/50 px-4 py-3 border-b border-slate-200 dark:border-card-border">
                        <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <span className="material-symbols-outlined text-green-500">payments</span>
                          Winning Bets
                        </h3>
                      </div>
                      <div className="p-4 flex-1">
                        {winningBets.length > 0 ? (
                          <div className="space-y-2">
                            {winningBets.map((bet, idx) => (
                              <div key={idx} className="flex items-center justify-between p-3 bg-green-500/5 border border-green-500/10 rounded-lg">
                                <div className="flex items-center gap-3">
                                  <span className="material-symbols-outlined text-green-500">check_circle</span>
                                  <span className="font-bold text-slate-900 dark:text-white">{bet}</span>
                                </div>
                                <span className="text-xs font-bold text-green-600 dark:text-green-400 bg-green-500/10 px-2 py-1 rounded">WON</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="h-full flex flex-col items-center justify-center text-center p-4 text-slate-400">
                            <span className="material-symbols-outlined text-4xl mb-2 opacity-50">sentiment_dissatisfied</span>
                            <p className="text-sm">No winning bet combinations found based on AI predictions.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Prediction Breakdown Hero */}
            {prediction ? (
              <>
              <div className="bg-slate-50 dark:bg-background-dark/50 rounded-lg p-5 border border-slate-200 dark:border-card-border backdrop-blur-sm relative z-10 mb-6">
                <div className="flex flex-col md:flex-row gap-6 items-stretch">
                  {/* Horse Image & Basic Info */}
                  <div className="w-full md:w-1/3 flex flex-col gap-3">
                    <div className="relative w-full aspect-video rounded-lg overflow-hidden border border-slate-200 dark:border-card-border group bg-slate-200 dark:bg-card-border">
                      <div className="absolute top-3 left-3 z-10 bg-primary text-white text-xs font-bold px-2 py-1 rounded shadow-lg">#1 PREDICTED</div>
                      <div 
                        className="w-full h-full bg-cover bg-center transition-transform duration-500 group-hover:scale-105" 
                        style={{ backgroundImage: `url('${getCardImage(race.id)}')` }}
                      ></div>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white">{winnerHorse?.name || prediction.winner}</h3>
                      <p className="text-sm text-slate-500 dark:text-text-secondary">
                        {winnerHorse ? `J: ${winnerHorse.jockey} | T: ${winnerHorse.trainer}` : 'Form Analysis'}
                      </p>
                      {winnerHorse && (
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs bg-green-500/10 text-green-600 dark:text-green-400 px-1.5 py-0.5 rounded border border-green-500/20">
                            Form: {(winnerHorse.recentForm || []).slice(-3).join('-')}
                          </span>
                          <span className="text-xs bg-slate-200 dark:bg-card-border text-slate-600 dark:text-text-secondary px-1.5 py-0.5 rounded">Age: {winnerHorse.age}</span>
                          <span className="text-xs bg-slate-200 dark:bg-card-border text-slate-600 dark:text-text-secondary px-1.5 py-0.5 rounded">Wgt: {winnerHorse.weight}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Confidence & Stats */}
                  <div className="w-full md:w-2/3 flex flex-col justify-between">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <p className="text-sm text-slate-500 dark:text-text-secondary uppercase tracking-wider mb-1">{predictionSourceLabel} Confidence</p>
                        <div className="flex items-baseline gap-2">
                          <span className="text-4xl font-black text-slate-900 dark:text-white">{confidence}<span className="text-2xl text-primary">%</span></span>
                          <span className="text-sm text-green-600 dark:text-green-400 font-medium flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm">trending_up</span> 
                            {confidence > 75 ? 'High' : confidence > 50 ? 'Medium' : 'Low'}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-slate-500 dark:text-text-secondary uppercase tracking-wider mb-1">Predicted Odds</p>
                        <span className="text-2xl font-bold text-slate-900 dark:text-white">
                          {winnerHorse && Number.isFinite(winnerHorse.currentOdds) ? (winnerHorse.currentOdds * 0.85).toFixed(2) : 'N/A'}
                        </span>
                      </div>
                    </div>

                    {/* Progress Bars (Mocked for visual match) */}
                    <div className="space-y-4 mb-4">
                      <div className="grid grid-cols-[80px_1fr_40px] gap-3 items-center">
                        <span className="text-sm text-slate-500 dark:text-text-secondary font-medium">Suitability</span>
                        <div className="h-2 w-full bg-slate-200 dark:bg-card-border rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full" style={{ width: `${suitabilityPercent}%` }}></div>
                        </div>
                        <span className="text-xs text-right font-bold text-slate-700 dark:text-slate-300">{suitabilityPercent}%</span>
                      </div>

                    </div>

                    <div className="mt-auto bg-primary/10 border border-primary/20 rounded p-3 flex gap-3 items-start">
                      <span className="material-symbols-outlined text-primary mt-0.5">auto_awesome</span>
                      <p className="text-sm text-slate-700 dark:text-white leading-relaxed">
                        <strong className="text-primary">{predictionSourceLabel} Verdict:</strong> {prediction.reasoning}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Next Best Picks Grid (2nd, 3rd & Optional 4th) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {topPicks.slice(1).map((horse, idx) => {
                  if (!horse) return null;
                  const rank = idx + 2;
                  const isOptional = rank === 4;
                  
                  if (isOptional) {
                    return (
                      <div key={horse.id} className="col-span-1 md:col-span-2 bg-slate-900 border border-blue-600 rounded-xl p-4 flex items-center gap-4 md:gap-6 shadow-sm relative overflow-hidden">
                         {/* Left: Rank & Label */}
                         <div className="flex flex-col items-center justify-center shrink-0 min-w-[3rem]">
                           <span className="text-2xl md:text-3xl font-black text-blue-500 leading-none">#{rank}</span>
                           <span className="text-[10px] font-bold text-blue-500 uppercase tracking-wider mt-1">EXTRA</span>
                         </div>
                         
                         {/* Middle: Badge & Info */}
                         <div className="flex-1 flex flex-col justify-center min-w-0">
                           <span className="bg-blue-700 text-white text-[10px] font-bold px-2 py-0.5 rounded w-fit mb-1 tracking-wide">OPTIONAL PICK</span>
                           <div className="font-bold text-white text-lg leading-tight truncate">{horse.name}</div>
                           <div className="text-sm text-slate-400 truncate">{horse.jockey}</div>
                         </div>
                         
                         {/* Right: Odds */}
                         <div className="text-right shrink-0">
                           <div className="text-2xl font-bold text-white leading-none">{horse.currentOdds ?? '—'}</div>
                           <div className="text-[10px] text-slate-400 mt-1">Odds</div>
                         </div>
                      </div>
                    );
                  }

                  const rankColor = rank === 2 ? 'text-gray-400 dark:text-gray-300' : 'text-amber-600';
                  
                  return (
                    <div key={horse.id} className="bg-white dark:bg-card-dark border border-slate-200 dark:border-card-border rounded-lg p-3 flex items-center gap-3">
                      <div className={`text-2xl font-bold ${rankColor}`}>#{rank}</div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-slate-900 dark:text-white text-sm md:text-base md:truncate whitespace-normal leading-tight">{horse.name}</div>
                        <div className="text-xs text-slate-500 dark:text-text-secondary truncate">{horse.jockey}</div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-sm font-bold text-slate-900 dark:text-white">{horse.currentOdds ?? '—'}</div>
                        <div className="text-[10px] text-slate-500 dark:text-text-secondary">Odds</div>
                      </div>
                    </div>
                  );
                })}
              </div>
              </>
            ) : (
              <div className="bg-white dark:bg-card-dark/50 rounded-lg p-8 border border-slate-200 dark:border-card-border text-center">
                <span className="material-symbols-outlined text-4xl text-slate-400 dark:text-text-secondary mb-2">hourglass_top</span>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Analysis Pending</h3>
                <p className="text-slate-500 dark:text-text-secondary">Our AI models are currently processing data for this race.</p>
              </div>
            )}
          </div>



          {/* The Field / Runners List */}
          <div className="md:bg-white md:dark:bg-card-dark md:border md:border-slate-200 md:dark:border-card-border md:rounded-xl md:overflow-hidden">
            <div className="pb-3 md:p-4 md:border-b md:border-slate-200 md:dark:border-card-border flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">The Field</h3>
              <div className="flex gap-2 text-sm">
                <button className="px-3 py-1 rounded bg-slate-200 dark:bg-card-border text-slate-900 dark:text-white hover:bg-slate-300 dark:hover:bg-card-border/80 transition-colors">All Runners</button>
              </div>
            </div>
            
            <div className="flex flex-col gap-3 md:gap-0">
              {sortedHorses.map((horse, idx) => {
                const isWinner = prediction && normalizeName(horse.name) === normalizeName(prediction.winner);
                const isSecond = prediction?.placed?.[0] && normalizeName(horse.name) === normalizeName(prediction.placed[0]);
                const isThird = prediction?.placed?.[1] && normalizeName(horse.name) === normalizeName(prediction.placed[1]);
                
                // Use AI-provided win probability if available, otherwise fallback to basic calc
                const aiWinProb = prediction?.winProbabilities?.find(p => p.horse === horse.name)?.probability;
                const winProb = aiWinProb !== undefined ? aiWinProb : (isWinner ? confidence : Math.max(5, (100 - confidence) / (activeRunnerCount || 1)));
                
                const value = isWinner
                  ? 'High'
                  : Number.isFinite(horse.currentOdds) && Number.isFinite(horse.openingOdds)
                    ? (horse.currentOdds > horse.openingOdds ? 'Low' : 'Med')
                    : '—';
                
                let bgClass = '';
                if (isWinner) bgClass = 'bg-yellow-500/10 border-yellow-500/20';
                else if (isSecond) bgClass = 'bg-gray-300/10 border-gray-300/20';
                else if (isThird) bgClass = 'bg-amber-700/10 border-amber-700/20';
                
                return (
                  <div 
                    key={horse.id} 
                    className={`p-3 md:p-4 rounded-xl md:rounded-none ${bgClass || 'bg-white dark:bg-card-dark md:bg-transparent'} border ${bgClass ? '' : 'border-slate-200 dark:border-card-border md:border-0 md:border-b'} flex md:grid md:grid-cols-[40px_2fr_2fr_1fr] gap-3 md:gap-4 items-center hover:bg-slate-50 dark:hover:bg-card-border/30 transition-colors cursor-pointer group`}
                  >
                    <div className="text-center flex flex-row md:flex-col items-center gap-3 md:gap-0 shrink-0">
                      <span className={`block text-lg md:text-xl font-bold ${isWinner ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-text-secondary'}`}>{horse.number || idx + 1}</span>
                      <div 
                        className={`size-8 rounded-full md:mx-auto md:mt-1 border-2 border-slate-200 dark:border-card-border relative overflow-hidden flex items-center justify-center shadow-sm ${getSilkColor(horse.name)}`}
                        title="Jockey Silk (Placeholder)"
                      >
                        <span className="text-xs text-white font-bold">{horse.name.charAt(0)}</span>
                      </div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-slate-900 dark:text-white text-base md:text-lg group-hover:text-primary transition-colors truncate">{horse.name}</h4>
                        {isWinner && (
                          <span className="bg-primary text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm whitespace-nowrap">
                            {predictionSourceLabel} PICK
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-text-secondary truncate">J: {horse.jockey} <span className="hidden sm:inline">| T: {horse.trainer}</span></p>
                    </div>
                    
                    {/* Mini stats - Hidden on mobile for list view */}
                    <div className="hidden md:block space-y-1.5">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="w-10 text-slate-500 dark:text-text-secondary">Win %</span>
                        <div className="flex-1 h-1.5 bg-slate-200 dark:bg-card-border rounded-full">
                          <div 
                            className={`h-full rounded-full ${isWinner ? 'bg-primary' : 'bg-primary/30'}`} 
                            style={{ width: `${winProb}%` }}
                          ></div>
                        </div>
                        <span className={`w-8 text-right font-bold ${isWinner ? 'text-primary' : 'text-slate-500 dark:text-text-secondary'}`}>{Math.round(winProb)}%</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="w-10 text-slate-500 dark:text-text-secondary">Value</span>
                        <div className="flex-1 h-1.5 bg-slate-200 dark:bg-card-border rounded-full">
                          <div 
                            className={`h-full rounded-full ${value === 'High' ? 'bg-green-500' : value === 'Med' ? 'bg-yellow-500' : 'bg-red-500'}`} 
                            style={{ width: value === 'High' ? '80%' : value === 'Med' ? '50%' : '20%' }}
                          ></div>
                        </div>
                        <span className={`w-8 text-right font-bold ${value === 'High' ? 'text-green-500' : value === 'Med' ? 'text-yellow-500' : 'text-red-500'}`}>{value}</span>
                      </div>
                    </div>
                    
                    <div className="text-right md:text-right shrink-0">
                      <div className="text-[10px] md:text-sm text-slate-500 dark:text-text-secondary">Odds</div>
                      <div className="text-lg md:text-xl font-bold text-slate-900 dark:text-white">{horse.currentOdds ?? '—'}</div>
                    </div>
                  </div>
                );
              })}
            </div>
            
            <div className="mt-2 md:mt-0 p-3 md:bg-white md:dark:bg-card-dark md:border-t md:border-slate-200 md:dark:border-card-border text-center">
              <button className="w-full md:w-auto px-4 py-2 rounded-xl bg-white dark:bg-card-dark border border-slate-200 dark:border-card-border md:border-0 md:bg-transparent text-sm text-primary hover:text-slate-900 dark:hover:text-white font-medium transition-colors">
                Show all {activeRunnerCount} runners
              </button>
            </div>
          </div>
        </div>

        {/* SIDEBAR */}
        <div className="xl:col-span-4 flex flex-col gap-6">
          
          {/* Market Comparison */}
          {false && marketPrice !== null ? <div className="bg-white dark:bg-card-dark border border-slate-200 dark:border-card-border rounded-xl p-5">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Market Efficiency</h3>
            {prediction && winnerHorse && marketPrice !== null ? (
            <>
            <div className="relative h-48 w-full bg-slate-100 dark:bg-card-border/30 rounded-lg mb-4 p-4 flex items-end gap-2">
              <div className="w-full h-full flex items-end justify-between px-2">
                {/* AI Bar */}
                <div className="w-8 h-full flex flex-col justify-end items-center gap-1 group">
                  <div 
                    className="w-full bg-primary rounded-t relative group-hover:bg-primary-hover transition-all duration-500 min-h-[4px]"
                    style={{ height: `${Math.max((aiPrice / maxChartVal) * 100, 1)}%` }}
                  >
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-primary text-white text-[10px] font-bold px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                      {aiPrice.toFixed(2)}
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-500 dark:text-text-secondary">AI</span>
                </div>
                
                {/* Bookie Bars */}
                {bookies.map((bookie, idx) => (
                  <div key={bookie.name} className="w-8 h-full flex flex-col justify-end items-center gap-1 group">
                    <div 
                      className={`w-full rounded-t relative transition-all duration-500 min-h-[4px] ${getBookieColors(bookie.name).bar} ${getBookieColors(bookie.name).hover}`}
                      style={{ height: `${Math.max((bookie.odds / maxChartVal) * 100, 1)}%` }}
                    >
                       <div className={`absolute -top-6 left-1/2 -translate-x-1/2 text-white text-[10px] font-bold px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity ${getBookieColors(bookie.name).tip}`}>
                        {bookie.odds.toFixed(2)}
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-500 dark:text-text-secondary">{bookie.name}</span>
                  </div>
                ))}
              </div>
              {/* Axis Lines */}
              <div className="absolute left-0 bottom-6 w-full h-px bg-slate-200 dark:bg-card-border"></div>
              <div className="absolute left-0 top-0 w-px h-[85%] bg-slate-200 dark:bg-card-border"></div>
            </div>
            <p className="text-sm text-slate-500 dark:text-text-secondary">
              <span className={`${edge > 0 ? 'text-green-400' : 'text-red-400'} font-bold`}>
                {Math.abs(edge).toFixed(1)}% {edge > 0 ? 'Edge' : 'Overpriced'}
              </span>
              {' '}detected against average market price. 
              {edge > 0 
                ? ` Bookmakers are undervaluing ${winnerHorse.name}.`
                : ` Market is currently skeptical of ${winnerHorse.name}.`
              }
            </p>
            <div className="mt-3 flex items-start gap-2 rounded-lg border border-yellow-200 dark:border-yellow-700 bg-yellow-50 dark:bg-yellow-900/20 p-3">
              <span className="material-symbols-outlined text-yellow-600 dark:text-yellow-400">warning</span>
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                Disclaimer: Odds shown are not real-time and may be cached or inaccurate.
                Please verify prices on bookmakers’ official websites.
              </p>
            </div>
            </>
            ) : (
              <div className="text-center py-8 text-slate-500 dark:text-text-secondary">
                {prediction && winnerHorse ? 'Market odds unavailable — no odds provider is connected.' : 'Waiting for prediction...'}
              </div>
            )}
          </div> : null}

          {/* Next Races Mini List */}
          <div className="bg-white dark:bg-card-dark border border-slate-200 dark:border-card-border rounded-xl p-5">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Up Next</h3>
              <button className="text-xs text-primary hover:underline" onClick={onBack}>View All</button>
            </div>
            <div className="flex flex-col gap-3">
              {nextRaces.length > 0 ? (
                nextRaces.map(nextRace => (
                  <div 
                    key={nextRace.id} 
                    className="flex justify-between items-center p-2 rounded hover:bg-slate-50 dark:hover:bg-card-border/30 transition-colors group cursor-pointer"
                    onClick={() => onSelectRace?.(nextRace)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="size-8 rounded-full bg-slate-200 dark:bg-card-border flex items-center justify-center text-xs font-bold text-slate-500 dark:text-text-secondary group-hover:bg-primary group-hover:text-white transition-colors">
                        {nextRace.time}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900 dark:text-white">{nextRace.course}</p>
                        <p className="text-xs text-slate-500 dark:text-text-secondary">{nextRace.distance} {nextRace.class ? `- ${nextRace.class}` : ''}</p>
                      </div>
                    </div>
                    <span className="material-symbols-outlined text-slate-400 dark:text-text-secondary text-sm">chevron_right</span>
                  </div>
                ))
              ) : (
                <div className="text-center text-xs text-slate-500 dark:text-text-secondary py-4">
                  No more upcoming races today
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default PredictionView;
