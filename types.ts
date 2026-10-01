
export interface Horse {
  id: string;
  name: string;
  number: number;
  jockey: string;
  trainer: string;
  recentForm: string[]; // e.g., ["1", "3", "2"]
  // Decimal odds. Keep unavailable prices null rather than using 0.
  currentOdds: number | null;
  openingOdds: number | null;
  weight: string;
  age: number;
  status?: 'runner' | 'non-runner';
}

export interface Race {
  id: string;
  time: string;
  course: string;
  name?: string; // e.g. "The BetMGM Handicap Stakes"
  distance: string;
  going: string; // e.g., "Good", "Soft"
  weather: string;
  class?: string;
  horses: Horse[];
  status?: 'scheduled' | 'finished' | 'abandoned' | 'void';
  fetchCount?: number;
  result?: ActualResults | null;
}

export interface Factor {
  label: string;
  value: string;
  description: string;
  score?: number; // 0-100
  trend?: 'positive' | 'neutral' | 'negative';
}

export interface Prediction {
  raceId: string;
  source?: 'ai' | 'local-brain' | 'hybrid';
  winner: string;
  placed: string[];
  confidence: number;
  reasoning: string;
  sentimentSummary: string;
  factors?: {
    trainer: Factor;
    speed: Factor;
    jockey?: Factor;
    draw: Factor;
  };
  winProbabilities?: { horse: string; probability: number }[]; // List of horse name to win probability percentage (0-100)
  updatedAt?: number;
  fromCache?: boolean;
}

export interface ActualResults {
  winner: string;
  placed: string[];
  fetchCount?: number;
}

export interface HistoricalRecord {
  raceId: string;
  course: string;
  time: string;
  actualWinner: string;
  actualPlaced: string[];
  predictedWinner: string;
  predictedPlaced?: string[];
  matched: boolean;
  winningBets?: string[];
  updatedAt?: number;
  date?: string; // e.g. "2023-10-27"
  distance?: string;
  going?: string;
  weather?: string;
}
