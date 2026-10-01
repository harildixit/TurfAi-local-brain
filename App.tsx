import type { FC } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ActualResults, HistoricalRecord, Prediction, Race } from './types';
import {
  fetchActualResults,
  fetchCachedPrediction,
  fetchCachedPredictions,
  fetchDayStatus,
  fetchHistory,
  fetchRaceCard,
  fetchRaceData,
} from './services/geminiService';
import Layout from './components/layout/Layout';
import HomeView from './components/views/HomeView';
import ResultsView from './components/views/ResultsView';
import FixturesView from './components/views/FixturesView';
import PredictionView from './components/views/PredictionView';
import TermsOfServiceView from './components/views/TermsOfServiceView';
import PrivacyPolicyView from './components/views/PrivacyPolicyView';

const getLondonDayKey = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;
  return year && month && day ? `${year}-${month}-${day}` : date.toISOString().slice(0, 10);
};

const App: FC = () => {
  const locationPrompt = 'UK and Ireland';
  const [activeView, setActiveView] = useState('home');
  const [selectedDate, setSelectedDate] = useState(() => getLondonDayKey());

  const [races, setRaces] = useState<Race[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dayStatus, setDayStatus] = useState<Awaited<ReturnType<typeof fetchDayStatus>> | null>(null);
  const [activeRace, setActiveRace] = useState<Race | null>(null);
  const [predictions, setPredictions] = useState<Record<string, Prediction>>({});
  const [actualResults, setActualResults] = useState<Record<string, ActualResults>>({});
  const [history, setHistory] = useState<HistoricalRecord[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchRaceData(locationPrompt, selectedDate);
      setRaces(data);
      
      const results: Record<string, ActualResults> = {};
      data.forEach(r => {
        if (r.result) {
          results[r.id] = r.result;
        }
      });
      setActualResults(results);
      setPredictions({});

      // Don't auto-set active race to first one, let user choose
      
      const cached = await fetchCachedPredictions(locationPrompt, selectedDate);
      if (Array.isArray(cached) && cached.length) {
        setPredictions(() => {
          const merged: Record<string, Prediction> = {};
          for (const p of cached) {
            if (p?.raceId) merged[p.raceId] = p;
          }
          return merged;
        });
      }
    } catch (err) {
      console.error(err);
      const message =
        err instanceof Error && err.message === 'Missing GEMINI_API_KEY'
          ? 'Set `GEMINI_API_KEY` and refresh to load race cards.'
          : 'Failed to load race cards.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [locationPrompt, selectedDate]);

  const refreshSchedule = useCallback(async () => {
    try {
      const data = await fetchRaceData(locationPrompt, selectedDate);
      setRaces(data);

      const results: Record<string, ActualResults> = {};
      data.forEach(r => {
        if (r.result) {
          results[r.id] = r.result;
        }
      });
      setActualResults(results);

      const cached = await fetchCachedPredictions(locationPrompt, selectedDate);
      if (Array.isArray(cached) && cached.length) {
        setPredictions((prev) => {
          const merged = { ...prev };
          for (const p of cached) {
            if (p?.raceId) merged[p.raceId] = p;
          }
          return merged;
        });
      }
    } catch (err) {
      console.error(err);
    }
  }, [locationPrompt, selectedDate]);

  const refreshDayStatus = useCallback(async () => {
    try {
      const status = await fetchDayStatus(locationPrompt, selectedDate);
      setDayStatus(status);
    } catch (err) {
      console.error(err);
    }
  }, [locationPrompt, selectedDate]);

  const refreshHistory = useCallback(async () => {
    try {
      // Fetch history from Jan 6, 2026 to today to ensure we have data for the 7-day stats
      const today = new Date();
      const y = today.getFullYear();
      const m = String(today.getMonth() + 1).padStart(2, '0');
      const d = String(today.getDate()).padStart(2, '0');
      const todayStr = `${y}-${m}-${d}`;
      
      const hist = await fetchHistory('UK and Ireland', undefined, '2026-01-06', todayStr);
      setHistory(hist);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const loadRunners = useCallback(async (race: Race) => {
    if (race.horses.length > 0 && race.status !== 'abandoned') return;
    if (race.status === 'abandoned') return;
    
    try {
      const updated = await fetchRaceCard(race.course, race.time, locationPrompt, selectedDate);
      setRaces((prev) =>
        prev.map((r) =>
          r.id === race.id
            ? { ...r, ...updated, horses: updated.horses || [] }
            : r
        )
      );
      // Update active race if it's the one we just loaded
      setActiveRace((prev) => (prev?.id === race.id ? { ...prev, ...updated, horses: updated.horses || [] } : prev));
    } catch (err) {
      console.error(err);
    }
  }, [locationPrompt, selectedDate]);

  const loadCachedPrediction = useCallback(async (race: Race) => {
    if (predictions[race.id]) return;
    if (race.status === 'abandoned') return;
    
    try {
      const cached = await fetchCachedPrediction(race.course, race.time, locationPrompt, selectedDate);
      if (cached) {
        setPredictions((prev) => ({ ...prev, [race.id]: cached }));
      }
    } catch (err) {
      console.error(err);
    }
  }, [locationPrompt, predictions, selectedDate]);

  const handleFetchResult = useCallback(async (race: Race) => {
    try {
      const response = await fetchActualResults(race.id, race.course, race.time, locationPrompt, false, selectedDate);
      if (response) {
        setRaces(prev => prev.map(r => r.id === race.id ? { ...r, fetchCount: response.fetchCount } : r));
        setActiveRace(prev => prev?.id === race.id ? { ...prev, fetchCount: response.fetchCount } : prev);
        
        if (response.result) {
          setActualResults(prev => ({ ...prev, [race.id]: response.result! }));
          void refreshHistory();
        }
      }
    } catch (err) {
      console.error(err);
    }
  }, [locationPrompt, refreshHistory, selectedDate]);

  // Initial Load
  useEffect(() => {
    void loadData();
    void refreshDayStatus();
    void refreshHistory();

    const interval = setInterval(() => {
      void refreshSchedule();
      void refreshDayStatus();
      void refreshHistory();
    }, 60 * 1000 * 10); // 10 mins

    return () => clearInterval(interval);
  }, [loadData, refreshSchedule, refreshDayStatus, refreshHistory]);

  // Auto-load runners for active race
  useEffect(() => {
    if (activeRace) {
      void loadRunners(activeRace);
      void loadCachedPrediction(activeRace);
    }
  }, [activeRace?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const activePrediction = useMemo(() => {
    if (!activeRace) return null;
    return predictions[activeRace.id] || null;
  }, [activeRace, predictions]);

  // Render Content based on View
  const renderContent = () => {
    switch (activeView) {
      case 'home':
        return (
          <HomeView 
            races={races} 
            predictions={predictions}
            history={history}
            onNavigate={setActiveView} 
            onSelectRace={(race) => {
              setActiveRace(race);
              setActiveView('prediction');
            }}
          />
        );
      
      case 'fixtures':
        return (
          <FixturesView 
            races={races}
            predictions={predictions}
            selectedDate={selectedDate}
            onDateChange={(date) => {
              setSelectedDate(date);
              setActiveRace(null);
              setActiveView('fixtures');
            }}
            dayStatus={dayStatus}
            loading={loading}
            error={error}
            onRefresh={loadData}
            onViewPrediction={(race) => {
              setActiveRace(race);
              setActiveView('prediction');
            }}
          />
        );

      case 'prediction':
        if (!activeRace) return <div className="p-8 text-center text-slate-400">No race selected</div>;
        return (
          <PredictionView 
            race={activeRace}
            allRaces={races}
            raceDate={selectedDate}
            prediction={activePrediction}
            actualResults={actualResults[activeRace.id]}
            onBack={() => setActiveView('fixtures')}
            onSelectRace={(race) => setActiveRace(race)}
            onNavigate={(view) => setActiveView(view)}
            onFetchResult={() => handleFetchResult(activeRace)}
          />
        );

      case 'results':
        return (
          <ResultsView 
            history={history} 
            onBack={() => setActiveView('home')} 
          />
        );

      case 'terms':
        return <TermsOfServiceView />;

      case 'privacy':
        return <PrivacyPolicyView />;
      
      default:
        return <div>View not found</div>;
    }
  };

  return (
    <Layout activeView={activeView} onNavigate={setActiveView}>
      {renderContent()}
    </Layout>
  );
};

export default App;
