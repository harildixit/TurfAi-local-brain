import type { FC, KeyboardEventHandler } from 'react';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { cx } from './cx';

export type ComboboxOption = {
  id: string;
  label: string;
  description?: string;
  keywords?: string;
};

interface ComboboxProps {
  label: string;
  placeholder?: string;
  options: ComboboxOption[];
  valueId: string | null;
  onChange: (nextId: string | null) => void;
}

const Combobox: FC<ComboboxProps> = ({ label, placeholder, options, valueId, onChange }) => {
  const listboxId = useId();
  const inputId = useId();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);

  const selected = useMemo(() => options.find(o => o.id === valueId) || null, [options, valueId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(o => {
      const haystack = `${o.label} ${o.description || ''} ${o.keywords || ''}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [options, query]);

  useEffect(() => {
    const onPointerDown = (e: MouseEvent) => {
      if (!rootRef.current) return;
      if (rootRef.current.contains(e.target as Node)) return;
      setOpen(false);
      setQuery('');
    };
    window.addEventListener('pointerdown', onPointerDown, { capture: true });
    return () => window.removeEventListener('pointerdown', onPointerDown, { capture: true } as any);
  }, []);

  useEffect(() => {
    if (!open) return;
    const selectedIndex = filtered.findIndex(o => o.id === valueId);
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0);
  }, [filtered, open, valueId]);

  useEffect(() => {
    if (!open) return;
    if (!listRef.current) return;
    const option = filtered[activeIndex];
    if (!option) return;
    const el = document.getElementById(`${listboxId}-${option.id}`);
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollIntoView({ block: 'nearest' });
    });
  }, [activeIndex, filtered, listboxId, open]);

  const onKeyDown: KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (!open && (e.key === 'ArrowDown' || e.key === 'Enter')) {
      setOpen(true);
      return;
    }
    if (!open) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
      setQuery('');
      inputRef.current?.blur();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(i => Math.min(i + 1, Math.max(filtered.length - 1, 0)));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(i => Math.max(i - 1, 0));
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      const option = filtered[activeIndex];
      if (!option) return;
      onChange(option.id);
      setOpen(false);
      setQuery('');
      return;
    }
  };

  const activeId = filtered[activeIndex]?.id ? `${listboxId}-${filtered[activeIndex]?.id}` : undefined;

  return (
    <div ref={rootRef} className="space-y-1.5">
      <label htmlFor={inputId} className="text-xs font-black text-slate-400 uppercase tracking-widest">
        {label}
      </label>
      <div className="relative">
        <input
          id={inputId}
          ref={inputRef}
          value={open ? query : (selected?.label || '')}
          placeholder={placeholder}
          onFocus={() => setOpen(true)}
          onBlur={(e) => {
            const next = e.relatedTarget as Node | null;
            if (next && rootRef.current?.contains(next)) return;
            setOpen(false);
            setQuery('');
          }}
          onChange={(e) => {
            setOpen(true);
            setQuery(e.target.value);
          }}
          onKeyDown={onKeyDown}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-activedescendant={activeId}
          className={cx(
            'w-full h-10 px-3 pr-10 rounded-xl border bg-slate-900/40 text-slate-100 placeholder:text-slate-500',
            'border-slate-800 hover:border-slate-700',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950'
          )}
        />
        <button
          type="button"
          className={cx(
            'absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-lg',
            'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 transition',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950'
          )}
          aria-label={open ? 'Close' : 'Open'}
          onClick={() => {
            setOpen(v => !v);
            if (!open) inputRef.current?.focus();
            if (open) setQuery('');
          }}
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className={cx('w-5 h-5 mx-auto transition', open ? 'rotate-180' : '')}>
            <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clipRule="evenodd" />
          </svg>
        </button>

        {open ? (
          <div className="absolute z-50 mt-2 w-full rounded-2xl border border-slate-800 bg-slate-950/90 backdrop-blur-sm shadow-2xl overflow-hidden">
            <ul
              id={listboxId}
              ref={listRef}
              role="listbox"
              className="max-h-64 overflow-auto overscroll-contain py-1"
            >
              {filtered.length === 0 ? (
                <li className="px-3 py-3 text-sm text-slate-400">No matches</li>
              ) : (
                filtered.map((o, idx) => {
                  const isActive = idx === activeIndex;
                  const isSelected = o.id === valueId;
                  return (
                    <li
                      id={`${listboxId}-${o.id}`}
                      key={o.id}
                      role="option"
                      aria-selected={isSelected}
                      className={cx(
                        'px-3 py-2 cursor-pointer select-none',
                        isActive ? 'bg-emerald-500/15 text-slate-100' : 'text-slate-200 hover:bg-slate-800/60',
                        'focus-visible:outline-none'
                      )}
                      onPointerEnter={() => setActiveIndex(idx)}
                      onPointerDown={(e) => {
                        e.preventDefault();
                        setActiveIndex(idx);
                      }}
                      onClick={() => {
                        onChange(o.id);
                        setOpen(false);
                        setQuery('');
                      }}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-bold truncate">{o.label}</div>
                          {o.description ? <div className="text-xs text-slate-400 truncate mt-0.5">{o.description}</div> : null}
                        </div>
                        {isSelected ? (
                          <div className="shrink-0 text-emerald-400">
                            <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                              <path fillRule="evenodd" d="M16.704 5.29a1 1 0 010 1.42l-7.25 7.25a1 1 0 01-1.42 0l-3.25-3.25a1 1 0 011.42-1.42l2.54 2.54 6.54-6.54a1 1 0 011.42 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                        ) : null}
                      </div>
                    </li>
                  );
                })
              )}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default Combobox;
