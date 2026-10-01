import type { FC } from 'react';
import type { Horse, Prediction, Race } from '../types';
import Badge from './ui/Badge';
import Card from './ui/Card';
import { cx } from './ui/cx';

const formScore = (horse: Horse) => {
  const digits = (horse.recentForm || []).slice(0, 6).map(v => Number(v)).filter(n => Number.isFinite(n) && n > 0);
  if (digits.length === 0) return null;
  const points = digits.reduce((sum, n) => sum + Math.max(0, 8 - n), 0);
  return Math.round((points / (digits.length * 7)) * 100);
};

const oddsMove = (horse: Horse) => {
  if (!Number.isFinite(horse.openingOdds) || !Number.isFinite(horse.currentOdds)) return null;
  const delta = horse.openingOdds - horse.currentOdds;
  if (!Number.isFinite(delta)) return null;
  return Math.round(delta * 10) / 10;
};

const pickHorse = (race: Race, name: string) => {
  const target = name.trim().toLowerCase();
  return race.horses.find(h => h.name.trim().toLowerCase() === target) || null;
};

const RankBlock: FC<{
  rank: 1 | 2 | 3;
  label: string;
  horse: Horse | null;
}> = ({ rank, label, horse }) => {
  const rankTone = rank === 1 ? 'success' : 'neutral';
  const rankBg = rank === 1 ? 'bg-emerald-500/15 border-emerald-500/20' : 'bg-slate-900/30 border-slate-800';
  const score = horse ? formScore(horse) : null;
  const move = horse ? oddsMove(horse) : null;
  const moveTone = move === null ? 'neutral' : move > 0 ? 'success' : move < 0 ? 'danger' : 'neutral';

  return (
    <div className={cx('rounded-2xl border p-4', rankBg)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Badge tone={rankTone}>{rank}{rank === 1 ? 'st' : rank === 2 ? 'nd' : 'rd'}</Badge>
            <div className={cx('text-base font-black truncate', rank === 1 ? 'text-white' : 'text-slate-200')}>{label}</div>
          </div>
          <div className="text-xs text-slate-500 font-bold mt-2">
            {horse ? `${horse.jockey || '—'} • ${horse.trainer || '—'}` : 'Runner details unavailable'}
          </div>
        </div>
        {horse ? (
          <div className="shrink-0 text-right">
            <div className="text-xl font-black text-white tabular-nums">{Number.isFinite(horse.currentOdds) ? `${horse.currentOdds}/1` : '—'}</div>
            <div className="text-xs text-slate-500 font-bold">Was {Number.isFinite(horse.openingOdds) ? `${horse.openingOdds}/1` : '—'}</div>
          </div>
        ) : null}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-slate-800 bg-slate-950/30 p-3">
          <div className="text-[11px] text-slate-500 font-black uppercase tracking-widest">Form</div>
          <div className="text-sm font-black text-slate-100 mt-1">{score === null ? '—' : `${score}/100`}</div>
          <div className="mt-2 h-2 rounded-full bg-slate-800 overflow-hidden">
            <div className="h-full bg-emerald-500" style={{ width: `${score ?? 0}%` }} />
          </div>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-950/30 p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="text-[11px] text-slate-500 font-black uppercase tracking-widest">Odds Move</div>
            <Badge tone={moveTone}>{move === null ? '—' : move > 0 ? 'Steamer' : move < 0 ? 'Drifter' : 'Flat'}</Badge>
          </div>
          <div className="text-sm font-black text-slate-100 mt-1">{move === null ? '—' : `${move > 0 ? '-' : move < 0 ? '+' : ''}${Math.abs(move)}/1`}</div>
          <div className="text-xs text-slate-500 font-bold mt-1">Opening → Current</div>
        </div>
      </div>
    </div>
  );
};

type AiResultsPanelProps = {
  race: Race;
  prediction: Prediction | null;
};

const AiResultsPanel: FC<AiResultsPanelProps> = ({ race, prediction }) => {
  if (!prediction) {
    return (
      <Card as="section" className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xs font-black text-slate-400 uppercase tracking-widest">AI Results</div>
            <div className="text-lg font-black text-white mt-1">No cached analysis yet</div>
            <div className="text-xs text-slate-500 font-bold mt-2">Enable Auto Analysis or generate manually.</div>
          </div>
          <Badge tone="neutral">AI</Badge>
        </div>
      </Card>
    );
  }

  const winnerHorse = pickHorse(race, prediction.winner);
  const placed = (prediction.placed || [])
    .filter(Boolean)
    .filter((name) => name.trim().toLowerCase() !== prediction.winner.trim().toLowerCase())
    .slice(0, 2);
  const secondHorse = placed[0] ? pickHorse(race, placed[0]) : null;
  const thirdHorse = placed[1] ? pickHorse(race, placed[1]) : null;

  return (
    <Card as="section" className="p-5">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <div className="text-xs font-black text-slate-400 uppercase tracking-widest">
            {prediction.source === 'local-brain'
              ? 'Local Brain Results'
              : prediction.source === 'hybrid'
                ? 'Local + Gemini Results'
                : 'AI Results'}
          </div>
          <div className="text-lg font-black text-white mt-1">Placings & Metrics</div>
          <div className="flex flex-wrap items-center gap-2 mt-3">
            <Badge tone={prediction.source === 'local-brain' ? 'warning' : 'info'}>
              Source: {prediction.source === 'local-brain' ? 'Local Brain' : prediction.source === 'hybrid' ? 'Local + Gemini' : 'AI'}
            </Badge>
            <Badge tone="success">Confidence {prediction.confidence}%</Badge>
            {typeof prediction.updatedAt === 'number' ? (
              <Badge tone="info">Updated {new Date(prediction.updatedAt).toLocaleTimeString()}</Badge>
            ) : null}
            {prediction.fromCache ? <Badge tone="neutral">Cached</Badge> : <Badge tone="warning">Fresh</Badge>}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-950/30 p-4 min-w-[260px]">
          <div className="text-[11px] text-slate-500 font-black uppercase tracking-widest">Key Signal</div>
          <div className="text-sm text-slate-200 font-bold mt-2 line-clamp-3">{prediction.sentimentSummary || '—'}</div>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        <RankBlock rank={1} label={prediction.winner} horse={winnerHorse} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <RankBlock rank={2} label={placed[0] || '—'} horse={secondHorse} />
          <RankBlock rank={3} label={placed[1] || '—'} horse={thirdHorse} />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
        <details className="rounded-2xl border border-slate-800 bg-slate-950/30 overflow-hidden">
          <summary className="cursor-pointer list-none px-4 py-3 hover:bg-slate-800/40 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950">
            <div className="text-sm font-black text-white">Reasoning</div>
            <div className="text-xs text-slate-500 font-bold mt-1">Drill down into factors and context</div>
          </summary>
          <div className="px-4 pb-4 text-sm text-slate-200 leading-relaxed">
            {prediction.reasoning || '—'}
          </div>
        </details>
        <details className="rounded-2xl border border-slate-800 bg-slate-950/30 overflow-hidden">
          <summary className="cursor-pointer list-none px-4 py-3 hover:bg-slate-800/40 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950">
            <div className="text-sm font-black text-white">Market & Sentiment</div>
            <div className="text-xs text-slate-500 font-bold mt-1">Short summary plus details</div>
          </summary>
          <div className="px-4 pb-4 text-sm text-slate-200 leading-relaxed">
            {prediction.sentimentSummary || '—'}
          </div>
        </details>
      </div>
    </Card>
  );
};

export default AiResultsPanel;
