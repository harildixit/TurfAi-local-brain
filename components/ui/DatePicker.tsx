import { type FC, useEffect, useRef, useState } from 'react';
import { cx } from './cx';

interface DatePickerProps {
  value: string; // YYYY-MM-DD
  onChange: (date: string) => void;
  maxDate?: string; // YYYY-MM-DD
  minDate?: string; // YYYY-MM-DD
  className?: string;
}

const DAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DatePicker: FC<DatePickerProps> = ({ value, onChange, maxDate, minDate, className }) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  
  // Helper to parse YYYY-MM-DD to local Date
  const parseDate = (dateStr?: string) => {
    if (!dateStr) return new Date();
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d);
  };

  // Parse initial value or default to today
  const initialDate = parseDate(value);
  
  // View state (which month/year we are looking at)
  const [viewDate, setViewDate] = useState(initialDate);

  // Reset view when opening
  useEffect(() => {
    if (open && value) {
      setViewDate(parseDate(value));
    }
  }, [open, value]);

  // Close on click outside
  useEffect(() => {
    const onPointerDown = (e: MouseEvent) => {
      if (!rootRef.current) return;
      if (rootRef.current.contains(e.target as Node)) return;
      setOpen(false);
    };
    if (open) {
      window.addEventListener('pointerdown', onPointerDown, { capture: true });
      return () => window.removeEventListener('pointerdown', onPointerDown, { capture: true });
    }
  }, [open]);

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    // 0 = Sunday, 1 = Monday, ...
    const day = new Date(year, month, 1).getDay();
    // Convert to 0 = Monday, 6 = Sunday
    return day === 0 ? 6 : day - 1;
  };

  const generateCalendarDays = () => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const daysInPrevMonth = getDaysInMonth(year, month - 1);
    
    const days = [];
    
    // Previous month padding
    for (let i = 0; i < firstDay; i++) {
      days.push({
        day: daysInPrevMonth - firstDay + i + 1,
        month: month - 1,
        year: month === 0 ? year - 1 : year,
        isCurrentMonth: false
      });
    }
    
    // Current month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        day: i,
        month: month,
        year: year,
        isCurrentMonth: true
      });
    }
    
    // Next month padding (up to 42 cells grid 7x6)
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({
        day: i,
        month: month + 1,
        year: month === 11 ? year + 1 : year,
        isCurrentMonth: false
      });
    }
    
    return days;
  };

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  const handleDateClick = (d: { day: number; month: number; year: number }, e: React.MouseEvent) => {
    e.stopPropagation();
    const newDate = new Date(d.year, d.month, d.day);
    
    // Format YYYY-MM-DD
    const y = newDate.getFullYear();
    const m = String(newDate.getMonth() + 1).padStart(2, '0');
    const day = String(newDate.getDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${day}`;
    
    if (maxDate && dateStr > maxDate) return;
    if (minDate && dateStr < minDate) return;
    
    onChange(dateStr);
    setOpen(false);
  };

  const formatDateLabel = (dateStr: string) => {
    if (!dateStr) return 'Select date';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <div className={cx("relative", open && "z-50", className)} ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full bg-slate-50 dark:bg-background-dark border border-slate-200 dark:border-card-border rounded px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-1 focus:ring-primary focus:border-primary text-left flex items-center justify-between"
      >
        <span>{formatDateLabel(value)}</span>
        <span className="material-symbols-outlined text-[20px] text-slate-400 dark:text-text-secondary">calendar_today</span>
      </button>

      {open && (
        <div className="absolute z-50 top-full left-0 mt-1 w-[300px] bg-white dark:bg-card-dark border border-slate-200 dark:border-card-border rounded-xl shadow-lg p-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <button 
              onClick={handlePrevMonth}
              className="p-1 hover:bg-slate-100 dark:hover:bg-card-border/50 rounded-full text-slate-500 dark:text-text-secondary transition-colors"
            >
              <span className="material-symbols-outlined text-xl">chevron_left</span>
            </button>
            <span className="text-sm font-bold text-slate-900 dark:text-white">
              {MONTHS[viewDate.getMonth()]} {viewDate.getFullYear()}
            </span>
            <button 
              onClick={handleNextMonth}
              className="p-1 hover:bg-slate-100 dark:hover:bg-card-border/50 rounded-full text-slate-500 dark:text-text-secondary transition-colors"
            >
              <span className="material-symbols-outlined text-xl">chevron_right</span>
            </button>
          </div>

          {/* Weekdays */}
          <div className="grid grid-cols-7 mb-2">
            {DAYS.map(d => (
              <div key={d} className="text-center text-xs font-medium text-slate-500 dark:text-text-secondary py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1">
            {generateCalendarDays().map((d, i) => {
              const currentY = d.year;
              const currentM = String(d.month + 1).padStart(2, '0');
              const currentD = String(d.day).padStart(2, '0');
              const dateStr = `${currentY}-${currentM}-${currentD}`;
              
              const isSelected = dateStr === value;
              const isToday = new Date().toISOString().split('T')[0] === dateStr;
              const isDisabled = (maxDate && dateStr > maxDate) || (minDate && dateStr < minDate);

              return (
                <button
                  key={i}
                  onClick={(e) => !isDisabled && handleDateClick(d, e)}
                  disabled={isDisabled}
                  className={cx(
                    "h-8 w-8 rounded-full flex items-center justify-center text-sm transition-colors",
                    !d.isCurrentMonth && "text-slate-300 dark:text-slate-600",
                    d.isCurrentMonth && !isSelected && !isDisabled && "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-card-border",
                    isSelected && "bg-primary text-white hover:bg-primary/90 font-medium",
                    isToday && !isSelected && "border border-primary text-primary",
                    isDisabled && "opacity-30 cursor-not-allowed text-slate-400 dark:text-slate-600"
                  )}
                >
                  {d.day}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default DatePicker;
