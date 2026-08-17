import { ChevronLeft, ChevronRight } from 'lucide-react';
import { MONTH_NAMES } from '../../utils/format';
import cn from '../../utils/cn';

const now = new Date();
const THIS_YEAR = now.getFullYear();
const THIS_MONTH = now.getMonth() + 1;

/** Month/year stepper used by every period-scoped page. */
export default function MonthPicker({ year, month, onChange, className, maxDate = true }) {
  const isCurrent = year === THIS_YEAR && month === THIS_MONTH;

  const step = (delta) => {
    const d = new Date(year, month - 1 + delta, 1);
    const next = { year: d.getFullYear(), month: d.getMonth() + 1 };
    // Do not allow stepping into the future when maxDate is on.
    if (maxDate && (next.year > THIS_YEAR || (next.year === THIS_YEAR && next.month > THIS_MONTH))) {
      return;
    }
    onChange(next);
  };

  const years = Array.from({ length: 6 }, (_, i) => THIS_YEAR - i);

  return (
    <div className={cn('flex items-center gap-1 rounded-xl border border-line/80 bg-surface p-1 shadow-neu-sm', className)}>
      <button
        type="button"
        onClick={() => step(-1)}
        className="grid h-7 w-7 place-items-center rounded-lg text-muted transition hover:bg-canvas hover:text-ink active:scale-95 active:shadow-neu-pressed"
        aria-label="Previous month"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      <select
        value={month}
        onChange={(e) => onChange({ year, month: Number(e.target.value) })}
        className="h-7 cursor-pointer rounded-lg bg-transparent px-1.5 text-xs font-semibold text-ink focus:outline-none focus:ring-2 focus:ring-brand-500/30"
        aria-label="Month"
      >
        {MONTH_NAMES.map((name, i) => (
          <option key={name} value={i + 1} disabled={maxDate && year === THIS_YEAR && i + 1 > THIS_MONTH}>
            {name}
          </option>
        ))}
      </select>

      <select
        value={year}
        onChange={(e) => onChange({ year: Number(e.target.value), month })}
        className="h-7 cursor-pointer rounded-lg bg-transparent px-1 text-xs font-semibold text-ink focus:outline-none focus:ring-2 focus:ring-brand-500/30"
        aria-label="Year"
      >
        {years.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>

      <button
        type="button"
        onClick={() => step(1)}
        disabled={maxDate && isCurrent}
        className="grid h-7 w-7 place-items-center rounded-lg text-muted transition hover:bg-canvas hover:text-ink disabled:pointer-events-none disabled:opacity-35 active:scale-95 active:shadow-neu-pressed"
        aria-label="Next month"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}
