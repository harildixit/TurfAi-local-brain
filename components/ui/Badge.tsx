import type { FC, HTMLAttributes } from 'react';
import { cx } from './cx';

type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
}

const toneClass: Record<BadgeTone, string> = {
  neutral: 'bg-slate-800 text-slate-200 border-slate-700',
  success: 'bg-emerald-900/30 text-emerald-300 border-emerald-500/20',
  warning: 'bg-amber-900/30 text-amber-300 border-amber-500/20',
  danger: 'bg-red-900/30 text-red-300 border-red-500/20',
  info: 'bg-sky-900/30 text-sky-300 border-sky-500/20',
};

const Badge: FC<BadgeProps> = ({ tone = 'neutral', className, ...rest }) => {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-[11px] font-black uppercase tracking-widest',
        toneClass[tone],
        className
      )}
      {...rest}
    />
  );
};

export default Badge;

