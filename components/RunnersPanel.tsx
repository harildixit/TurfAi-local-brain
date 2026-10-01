import type { FC } from 'react';
import type { Horse, Prediction, Race } from '../types';
import OddsChart from './OddsChart';
import Badge from './ui/Badge';
import Card from './ui/Card';
import { cx } from './ui/cx';

type RunnersPanelProps = {
  race: Race;
  prediction?: Prediction | null;
  highlights?: string[];
};

const toScore = (horse: Horse) => {
  const digits = (horse.recentForm || []).slice(0, 6).map(v => Number(v)).filter(n => Number.isFinite(n) && n > 0);
  if (digits.length === 0) return null;
  const points = digits.reduce((sum, n) => sum + Math.max(0, 8 - n), 0);
  return Math.round((points / (digits.length * 7)) * 100);
};

const RunnersPanel: FC<RunnersPanelProps> = ({ race, highlights: highlightNames }) => {
  const horses = race.horses || [];
  const activeRunnerCount = horses.filter((horse) => horse.status !== 'non-runner').length;
  const highlights = new Set((highlightNames || []).map(n => n.trim().toLowerCase()).filter(Boolean));

  return (
    <Card as="section" className="overflow-hidden bg-white dark:bg-card-dark border-slate-200 dark:border-slate-800">
      <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
        <div>
          <div className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Race Card</div>
          <div className="text-lg font-black text-slate-900 dark:text-white mt-1">Runners</div>
        </div>
        <Badge tone={horses.length ? 'info' : 'neutral'}>{horses.length ? `${activeRunnerCount} runners` : 'Not loaded'}</Badge>
      </div>

      {horses.length === 0 ? (
        <div className="px-5 py-14 text-center text-slate-500 font-bold">Load runners to view the card.</div>
      ) : (
        <div>
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950/40 text-slate-500 text-[11px] uppercase font-black tracking-widest border-b border-slate-200 dark:border-slate-800">
                  <th className="px-5 py-4">Horse</th>
                  <th className="px-5 py-4">Jockey / Trainer</th>
                  <th className="px-5 py-4 text-center">Trend</th>
                  <th className="px-5 py-4 text-right">Odds</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800/70">
                {horses.map((horse) => {
                  const score = toScore(horse);
                  const isHighlight = highlights.has(horse.name.trim().toLowerCase());
                  const isNonRunner = horse.status === 'non-runner';
                  return (
                    <tr key={horse.id} className={cx('transition', isNonRunner ? 'opacity-50 bg-slate-100 dark:bg-slate-950/50' : isHighlight ? 'bg-emerald-500/10' : 'hover:bg-slate-50 dark:hover:bg-slate-800/30')}>
                      <td className="px-5 py-5">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="font-black text-slate-900 dark:text-white">{horse.name}</div>
                            <div className="flex items-center gap-2 mt-2">
                              <div className="flex gap-1">
                                {(horse.recentForm || []).slice(0, 6).map((f, i) => (
                                  <span
                                    key={i}
                                    className={cx(
                                      'w-5 h-5 text-[11px] flex items-center justify-center rounded-md font-black',
                                      f === '1' ? 'bg-emerald-500 text-emerald-950' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                                    )}
                                  >
                                    {f}
                                  </span>
                                ))}
                              </div>
                              {score !== null ? <Badge tone="info">Form {score}</Badge> : null}
                              {isNonRunner ? <Badge tone="warning">Non-runner</Badge> : null}
                              {isHighlight ? <Badge tone="success">Pick</Badge> : null}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-5">
                        <div className="text-sm font-black text-slate-700 dark:text-slate-200">{horse.jockey || '—'}</div>
                        <div className="text-xs text-slate-500 font-bold mt-1">{horse.trainer || '—'}</div>
                      </td>
                      <td className="px-5 py-5">
                        <div className="flex justify-center">
                          <OddsChart opening={horse.openingOdds} current={horse.currentOdds} />
                        </div>
                      </td>
                      <td className="px-5 py-5 text-right">
                        <div className="text-xl font-black text-slate-900 dark:text-white tabular-nums">
                          {Number.isFinite(horse.currentOdds) ? `${horse.currentOdds}/1` : '—'}
                        </div>
                        <div className="text-xs text-slate-500 font-bold mt-1">
                          Was {Number.isFinite(horse.openingOdds) ? `${horse.openingOdds}/1` : '—'}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="md:hidden divide-y divide-slate-800/70">
            {horses.map((horse) => {
              const isHighlight = highlights.has(horse.name.trim().toLowerCase());
              const isNonRunner = horse.status === 'non-runner';
              return (
                <div key={horse.id} className={cx('px-5 py-4', isNonRunner ? 'opacity-50 bg-slate-950/50' : isHighlight ? 'bg-emerald-500/10' : '')}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-black text-white truncate">{horse.name}</div>
                      <div className="text-xs text-slate-500 font-bold mt-1 truncate">{horse.jockey || '—'} • {horse.trainer || '—'}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-lg font-black text-white tabular-nums">
                        {Number.isFinite(horse.currentOdds) ? `${horse.currentOdds}/1` : '—'}
                      </div>
                      {isNonRunner ? <Badge tone="warning" className="mt-1">Non-runner</Badge> : isHighlight ? <Badge tone="success" className="mt-1">Pick</Badge> : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </Card>
  );
};

export default RunnersPanel;
