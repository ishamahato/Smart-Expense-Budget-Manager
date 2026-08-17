import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import cn from '../../utils/cn';
import { Skeleton } from '../ui/Feedback';

/**
 * KPI tile. `trend` is the % change vs the comparison period; `invertTrend`
 * flips the colouring for metrics where an increase is good.
 */
export default function StatCard({
  label,
  value,
  sublabel,
  icon: Icon,
  tone = 'brand',
  trend = null,
  trendLabel,
  invertTrend = false,
  loading = false,
  className,
}) {
  const tones = {
    brand:
      'bg-gradient-to-br from-brand-500/15 to-indigo-500/10 text-brand-600 dark:from-brand-500/25 dark:to-indigo-500/15 dark:text-brand-300 ring-1 ring-brand-500/20',
    emerald:
      'bg-gradient-to-br from-emerald-500/15 to-teal-500/10 text-emerald-600 dark:from-emerald-500/25 dark:to-teal-500/15 dark:text-emerald-300 ring-1 ring-emerald-500/20',
    amber:
      'bg-gradient-to-br from-amber-500/15 to-orange-500/10 text-amber-600 dark:from-amber-500/25 dark:to-orange-500/15 dark:text-amber-300 ring-1 ring-amber-500/20',
    rose:
      'bg-gradient-to-br from-rose-500/15 to-pink-500/10 text-rose-600 dark:from-rose-500/25 dark:to-pink-500/15 dark:text-rose-300 ring-1 ring-rose-500/20',
    slate: 'bg-canvas text-muted ring-1 ring-line dark:bg-slate-800/60',
  };

  if (loading) {
    return (
      <div className={cn('card space-y-3.5 p-5 sm:p-6', className)} aria-hidden>
        <div className="flex items-center justify-between">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-9 w-9 rounded-xl" />
        </div>
        <Skeleton className="h-8 w-36" />
        <Skeleton className="h-3 w-28" />
      </div>
    );
  }

  const hasTrend = trend !== null && trend !== undefined && Number.isFinite(trend);
  const rising = hasTrend && trend > 0;
  const flat = hasTrend && trend === 0;
  // Spending up is bad by default; invertTrend swaps that for "money left".
  const good = invertTrend ? rising : !rising;
  const TrendIcon = flat ? Minus : rising ? ArrowUpRight : ArrowDownRight;

  return (
    <div
      className={cn(
        'card card-neu p-5 sm:p-6 hover:shadow-card-hover hover:border-slate-300 dark:hover:border-slate-600 hover:-translate-y-0.5 group',
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted">{label}</p>
        {Icon && (
          <span className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-xl shadow-neu-sm transition-transform duration-200 group-hover:scale-105', tones[tone])}>
            <Icon className="h-4.5 w-4.5 stroke-[2]" aria-hidden />
          </span>
        )}
      </div>

      <p className="mt-3 truncate text-2xl sm:text-3xl font-bold tracking-tight font-mono text-ink">
        {value}
      </p>

      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
        {hasTrend && (
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset',
              flat
                ? 'bg-slate-50 text-slate-600 ring-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:ring-slate-700'
                : good
                  ? 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-500/30'
                  : 'bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:ring-rose-500/30'
            )}
          >
            <TrendIcon className="h-3.5 w-3.5 stroke-[2.5]" />
            {Math.abs(trend).toFixed(1)}%
          </span>
        )}
        {(sublabel || trendLabel) && (
          <span className="truncate text-xs text-muted leading-tight">{sublabel || trendLabel}</span>
        )}
      </div>
    </div>
  );
}
