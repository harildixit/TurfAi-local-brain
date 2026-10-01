
import { Horse, Race, Prediction, HistoricalRecord, ActualResults } from "../types";

const requestJson = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const res = await fetch(path, init);
  const contentType = res.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await res.json() : null;
  if (!res.ok) {
    const message =
      data && typeof data === 'object' && 'error' in data ? String((data as any).error) : `HTTP ${res.status}`;
    throw new Error(message);
  }
  return data as T;
};

export const fetchRaceData = async (locationPrompt: string = "UK and Ireland", date?: string): Promise<Race[]> => {
  const location = encodeURIComponent(locationPrompt);
  const dateParam = date ? `&date=${encodeURIComponent(date)}` : '';
  return requestJson<Race[]>(`/api/schedule?location=${location}${dateParam}`);
};

export const fetchRaceCard = async (
  course: string,
  time: string,
  locationPrompt: string = "UK and Ireland",
  date?: string
): Promise<Pick<Race, 'name' | 'class' | 'distance' | 'going' | 'weather' | 'horses' | 'status'>> => {
  const courseParam = encodeURIComponent(course);
  const timeParam = encodeURIComponent(time);
  const location = encodeURIComponent(locationPrompt);
  const dateParam = date ? `&date=${encodeURIComponent(date)}` : '';
  const result = await requestJson<{ name?: string; class?: string; distance?: string; going?: string; weather?: string; horses?: Horse[]; status?: string }>(
    `/api/race-card?course=${courseParam}&time=${timeParam}&location=${location}${dateParam}`
  );

  return {
    name: result.name || '',
    class: result.class || '',
    distance: result.distance || '',
    going: result.going || '',
    weather: result.weather || '',
    status: result.status as Race['status'],
    horses: Array.isArray(result.horses) ? result.horses : [],
  };
};

export const generatePrediction = async (race: Race): Promise<Prediction> => {
  return requestJson<Prediction>('/api/predict', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ race }),
  });
};

export const fetchCachedPrediction = async (
  course: string,
  time: string,
  locationPrompt: string = "UK and Ireland",
  date?: string
): Promise<Prediction | null> => {
  const courseParam = encodeURIComponent(course);
  const timeParam = encodeURIComponent(time);
  const location = encodeURIComponent(locationPrompt);
  const dateParam = date ? `&date=${encodeURIComponent(date)}` : '';
  return requestJson<Prediction | null>(`/api/prediction?course=${courseParam}&time=${timeParam}&location=${location}${dateParam}`);
};

export const fetchCachedPredictions = async (locationPrompt: string = "UK and Ireland", date?: string): Promise<Prediction[]> => {
  const location = encodeURIComponent(locationPrompt);
  const dateParam = date ? `&date=${encodeURIComponent(date)}` : '';
  return requestJson<Prediction[]>(`/api/predictions?location=${location}${dateParam}`);
};

export const preloadFullDay = async (locationPrompt: string = "UK and Ireland"): Promise<{ running: boolean }> => {
  return requestJson<{ running: boolean }>('/api/preload-day', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ location: locationPrompt }),
  });
};

export const startAutoAnalysis = async (locationPrompt: string = "UK and Ireland"): Promise<{ running: boolean; intervalMs?: number }> => {
  return requestJson<{ running: boolean; intervalMs?: number }>('/api/scheduler/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ location: locationPrompt }),
  });
};

export const stopAutoAnalysis = async (): Promise<{ running: boolean }> => {
  return requestJson<{ running: boolean }>('/api/scheduler/stop', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
};

export const fetchDayStatus = async (locationPrompt: string = "UK and Ireland", date?: string) => {
  const location = encodeURIComponent(locationPrompt);
  const dateParam = date ? `&date=${encodeURIComponent(date)}` : '';
  return requestJson<{
    dayKey: string;
    location: string;
    races: number;
    meetings: number;
    cardsLoaded: number;
    predictionsCached: number;
    lastScheduleAt?: number;
    lastCardAt?: number;
    lastPredictionAt?: number;
    preload?: { running: boolean; startedAt?: number; finishedAt?: number; total?: number; done?: number; error?: string };
    scheduler?: { running: boolean; intervalMs?: number; lastRunAt?: number };
  }>(`/api/day-status?location=${location}${dateParam}`);
};

export const fetchActualResults = async (
  raceId: string,
  course: string,
  time: string,
  locationPrompt: string = "UK and Ireland",
  force: boolean = false,
  date?: string
): Promise<{ result: ActualResults | null; fetchCount: number } | null> => {
  try {
    const courseParam = encodeURIComponent(course);
    const timeParam = encodeURIComponent(time);
    const location = encodeURIComponent(locationPrompt);
    const dateParam = date ? `&date=${encodeURIComponent(date)}` : '';
    const data = await requestJson<any>(`/api/results?course=${courseParam}&time=${timeParam}&location=${location}&force=${force}${dateParam}`);
    
    if (data && data.winner) {
      return { 
        result: { winner: data.winner, placed: data.placed, fetchCount: data.fetchCount }, 
        fetchCount: data.fetchCount 
      };
    }
    
    return { 
      result: null, 
      fetchCount: data?.fetchCount || 0 
    };
  } catch (e) {
    return null;
  }
};

export const fetchHistory = async (
  locationPrompt: string = "UK and Ireland", 
  date?: string,
  startDate?: string,
  endDate?: string
): Promise<HistoricalRecord[]> => {
  const location = encodeURIComponent(locationPrompt);
  let params = `&location=${location}`;
  if (startDate && endDate) {
    params += `&startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`;
  } else if (date) {
    params += `&date=${encodeURIComponent(date)}`;
  }
  return requestJson<HistoricalRecord[]>(`/api/history?${params.slice(1)}`);
};
