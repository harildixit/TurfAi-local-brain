import type { FC, InputHTMLAttributes } from 'react';
import { cx } from './cx';

export interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
}

const TextInput: FC<TextInputProps> = ({ label, hint, error, className, id, ...rest }) => {
  const inputId = id || `input-${Math.random().toString(36).slice(2)}`;
  const hintId = hint ? `${inputId}-hint` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className="space-y-1.5">
      {label ? (
        <label htmlFor={inputId} className="text-xs font-black text-slate-400 uppercase tracking-widest">
          {label}
        </label>
      ) : null}
      <input
        id={inputId}
        className={cx(
          'w-full h-10 px-3 rounded-xl border bg-slate-900/40 text-slate-100 placeholder:text-slate-500',
          'border-slate-800 hover:border-slate-700',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950',
          error ? 'border-red-500/50 focus-visible:ring-red-400' : '',
          className
        )}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        {...rest}
      />
      {hint ? <div id={hintId} className="text-xs text-slate-500">{hint}</div> : null}
      {error ? <div id={errorId} className="text-xs text-red-300 font-bold">{error}</div> : null}
    </div>
  );
};

export default TextInput;

