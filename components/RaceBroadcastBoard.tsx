import { type FC, useEffect, useMemo, useState } from 'react';
import type { HistoricalRecord, Horse, Prediction, Race } from '../types';
import { getActiveRunnerCount } from '../utils/racing';

type RaceBroadcastBoardProps = {
  races: Race[];
  predictions: Record<string, Prediction>;
  history: HistoricalRecord[];
  onSelectRace: (race: Race) => void;
};

const timeToMinutes = (time: string) => {
  const [hours, minutes] = time.split(':').map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return Number.NaN;
  return hours * 60 + minutes;
};

const minutesNow = (now: Date) => now.getHours() * 60 + now.getMinutes();

const getRaceSubtitle = (race: Race) => {
  const details = [race.name, race.distance, race.class ? `Class ${race.class}` : null].filter(Boolean);
  return details.slice(0, 2).join(' · ') || 'Racecard';
};

const firstSentence = (value?: string) => {
  if (!value) return 'Awaiting AI analysis';
  const sentence = value.split(/[.!?]/)[0].trim();
  return sentence.length > 52 ? `${sentence.slice(0, 49)}…` : sentence;
};

const Countdown: FC<{ race: Race; now: Date }> = ({ race, now }) => {
  const difference = timeToMinutes(race.time) - minutesNow(now);
  const seconds = Math.max(0, difference * 60 - now.getSeconds());
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  const display = difference < 0
    ? 'OFF'
    : hours > 0
      ? `${hours}:${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`
      : `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;

  return (
    <div className="min-w-[92px] rounded-lg bg-primary px-3 py-2 text-center text-white shadow-sm shadow-primary/20">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/75">{difference < 0 ? 'Status' : 'Off in'}</p>
      <p className="font-mono text-xl font-black leading-none tabular-nums">{display}</p>
    </div>
  );
};

const NumberBadge: FC<{ number: number; emphasis?: boolean }> = ({ number, emphasis = false }) => (
  <span className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-xs font-black tabular-nums ${emphasis ? 'bg-primary text-white' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200'}`}>
    {number}
  </span>
);

const SideRaceCard: FC<{
  race: Race;
  kind: 'previous' | 'upcoming';
  historyRecord?: HistoricalRecord;
  onSelectRace: (race: Race) => void;
}> = ({ race, kind, historyRecord, onSelectRace }) => {
  const resultWinner = race.result?.winner || historyRecord?.actualWinner;
  const isPrevious = kind === 'previous';
  const resultNames = [resultWinner, ...(race.result?.placed || historyRecord?.actualPlaced || [])].filter((name): name is string => Boolean(name));
  const resultRunners = resultNames
    .map(name => race.horses.find(horse => horse.name.toLowerCase() === name.toLowerCase()))
    .filter((horse): horse is Horse => Boolean(horse));
  const runners = (isPrevious && resultRunners.length > 0 ? resultRunners : race.horses).slice(0, 4);

  return (
    <button
      type="button"
      onClick={() => onSelectRace(race)}
      className="group w-full rounded-xl border border-slate-200 bg-white p-3 text-left shadow-sm transition-all hover:border-primary/50 hover:shadow-md dark:border-card-border dark:bg-card-dark"
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-primary">{isPrevious ? 'Previous race' : 'Upcoming race'}</p>
          <p className="truncate text-sm font-black text-slate-900 dark:text-white">{race.time} {race.course}</p>
        </div>
        <span className={`shrink-0 rounded px-1.5 py-1 text-[9px] font-black uppercase tracking-wider ${isPrevious ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-primary/10 text-primary'}`}>
          {isPrevious ? (resultWinner ? 'Result' : 'Ended') : 'Next'}
        </span>
      </div>

      <p className="mb-2 truncate text-[10px] font-medium text-slate-500 dark:text-slate-400">{getRaceSubtitle(race)}</p>

      <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
          {runners.length > 0 ? runners.map((horse, index) => (
          <div key={horse.id || horse.name} className="flex items-center gap-2 py-1.5">
            <NumberBadge number={horse.number || index + 1} emphasis={isPrevious && horse.name === resultWinner} />
            <span className={`min-w-0 flex-1 truncate text-xs font-bold ${horse.name === resultWinner ? 'text-primary' : 'text-slate-700 dark:text-slate-200'}`}>{horse.name}</span>
            {isPrevious && horse.name === resultWinner && <span className="material-symbols-outlined text-[15px] text-emerald-500">emoji_events</span>}
          </div>
        )) : (
          <p className="py-3 text-xs text-slate-500 dark:text-slate-400">Runners loading…</p>
        )}
      </div>

      {isPrevious && resultWinner && (
        <div className="mt-2 border-t border-slate-100 pt-2 text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:border-slate-800 dark:text-emerald-400">
          Winner · {resultWinner}
        </div>
      )}
    </button>
  );
};

const RaceBroadcastBoard: FC<RaceBroadcastBoardProps> = ({ races, predictions, history, onSelectRace }) => {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const { nextRace, previousRaces, upcomingRaces } = useMemo(() => {
    const currentMinutes = minutesNow(now);
    const ordered = [...(races || [])].sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));
    const scheduled = ordered.filter(race => !['finished', 'abandoned', 'void'].includes(race.status || ''));
    const next = scheduled.find(race => timeToMinutes(race.time) >= currentMinutes) || scheduled[0] || ordered[0];
    const previous = ordered
      .filter(race => race.id !== next?.id && (race.status === 'finished' || timeToMinutes(race.time) < currentMinutes))
      .sort((a, b) => timeToMinutes(b.time) - timeToMinutes(a.time))
      .slice(0, 2);
    const upcoming = ordered
      .filter(race => race.id !== next?.id && timeToMinutes(race.time) > currentMinutes && race.status !== 'finished')
      .slice(0, 2);

    return { nextRace: next, previousRaces: previous, upcomingRaces: upcoming };
  }, [now, races]);

  const historyByRace = useMemo(() => new Map((history || []).map(record => [record.raceId, record])), [history]);

  if (!nextRace) return null;

  const prediction = predictions[nextRace.id];
  const predictionLabel = prediction?.source === 'local-brain'
    ? 'LocalBrain insights'
    : prediction?.source === 'hybrid'
      ? 'Local + Gemini insights'
      : 'AI racing insights';
  const pickLabel = prediction?.source === 'local-brain'
    ? 'Local pick'
    : prediction?.source === 'hybrid'
      ? 'Hybrid pick'
      : 'AI pick';
  const predictionNames = [prediction?.winner, ...(prediction?.placed || [])].filter((name): name is string => Boolean(name));
  const predictedHorses = predictionNames
    .map(name => nextRace.horses.find(horse => horse.name.toLowerCase() === name.toLowerCase()))
    .filter((horse): horse is Horse => Boolean(horse));
  const topHorses = [...predictedHorses, ...nextRace.horses.filter(horse => !predictedHorses.some(item => item.id === horse.id))].slice(0, 4);
  const winnerProbability = prediction?.winProbabilities?.find(item => item.horse.toLowerCase() === prediction.winner?.toLowerCase())?.probability;
  const confidenceLabel = prediction?.confidence ? `${prediction.confidence}% confidence` : 'Analysis pending';

  return (
    <section aria-label="Race broadcast board" className="mb-10">
      <div className="mb-3 flex items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" /><span className="relative inline-flex h-2 w-2 rounded-full bg-primary" /></span>
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-primary">Race board</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(185px,0.86fr)_minmax(0,2.35fr)_minmax(185px,0.86fr)] xl:gap-4">
        <div className="order-2 flex flex-col gap-3 lg:order-1">
          {previousRaces.length > 0 ? previousRaces.map(race => (
            <SideRaceCard key={race.id} race={race} kind="previous" historyRecord={historyByRace.get(race.id)} onSelectRace={onSelectRace} />
          )) : <div className="rounded-xl border border-dashed border-slate-300 p-4 text-xs text-slate-500 dark:border-card-border dark:text-slate-400">Results will appear here after the first off.</div>}
        </div>

        <button
          type="button"
          onClick={() => onSelectRace(nextRace)}
          className="group order-1 overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-sm transition-all hover:border-primary/50 hover:shadow-lg dark:border-card-border dark:bg-card-dark lg:order-2"
        >
          <div className="border-b border-slate-200 bg-slate-50 px-4 py-4 dark:border-card-border dark:bg-background-dark/70 sm:px-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Next race</p>
                <div className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <span className="text-3xl font-black tracking-tight text-slate-900 dark:text-white sm:text-4xl">{nextRace.time}</span>
                  <span className="truncate text-xl font-black uppercase tracking-tight text-slate-700 dark:text-slate-200 sm:text-2xl">{nextRace.course}</span>
                </div>
                <p className="mt-1 truncate text-xs font-semibold text-slate-500 dark:text-slate-400">{getRaceSubtitle(nextRace)}</p>
              </div>
              <Countdown race={nextRace} now={now} />
            </div>
          </div>

          <div className="p-4 sm:p-5">
            <div className="mb-4 flex items-end justify-between gap-3">
              <div>
                <p className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">TURF<span className="text-primary">AI</span> <span className="text-base font-bold text-slate-500 dark:text-slate-400">TOP 4</span></p>
                <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">{predictionLabel}</p>
              </div>
              <div className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-primary">{confidenceLabel}</div>
            </div>

            <div className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 dark:divide-card-border dark:border-card-border">
              {topHorses.length > 0 ? topHorses.map((horse, index) => {
                const isWinner = horse.name.toLowerCase() === prediction?.winner?.toLowerCase();
                const probability = prediction?.winProbabilities?.find(item => item.horse.toLowerCase() === horse.name.toLowerCase())?.probability;
                return (
                  <div key={horse.id || horse.name} className="flex items-center gap-2.5 px-3 py-2.5 sm:gap-3 sm:px-4">
                    <NumberBadge number={index + 1} emphasis={isWinner} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-black uppercase tracking-tight text-slate-900 dark:text-white sm:text-base">{horse.name}</p>
                      <p className="truncate text-[10px] font-medium text-slate-500 dark:text-slate-400">{isWinner ? firstSentence(prediction?.reasoning) : `${horse.recentForm?.slice(0, 4).join('-') || 'Form unavailable'} · ${horse.jockey || 'Jockey TBC'}`}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className={`text-xs font-black uppercase tracking-wider ${isWinner ? 'text-primary' : 'text-slate-400'}`}>{isWinner ? pickLabel : `#${index + 1}`}</p>
                      {probability !== undefined && <p className="font-mono text-sm font-black text-slate-700 dark:text-slate-200">{Math.round(probability)}%</p>}
                    </div>
                  </div>
                );
              }) : (
                <p className="px-4 py-6 text-center text-sm text-slate-500 dark:text-slate-400">Runners loading…</p>
              )}
            </div>

            <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-200 pt-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:border-card-border">
              <span>{getActiveRunnerCount(nextRace.horses)} runners · {nextRace.going || 'Going TBC'}</span>
              <span className="text-primary transition-colors group-hover:text-primary-hover">View full analysis <span aria-hidden="true">→</span></span>
            </div>
          </div>
        </button>

        <div className="order-3 flex flex-col gap-3 lg:order-3">
          {upcomingRaces.length > 0 ? upcomingRaces.map(race => (
            <SideRaceCard key={race.id} race={race} kind="upcoming" onSelectRace={onSelectRace} />
          )) : <div className="rounded-xl border border-dashed border-slate-300 p-4 text-xs text-slate-500 dark:border-card-border dark:text-slate-400">More races will appear here when the card refreshes.</div>}
        </div>
      </div>
    </section>
  );
};

export default RaceBroadcastBoard;
