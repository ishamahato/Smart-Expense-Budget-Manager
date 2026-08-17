import { AlertCircle, Inbox, Loader2, RefreshCw } from 'lucide-react';
import cn from '../../utils/cn';
import Button from './Button';

export function Spinner({ className, label = 'Loading' }) {
  return (
    <span role="status" aria-label={label} className="inline-flex">
      <Loader2 className={cn('h-5 w-5 animate-spin text-brand-600 dark:text-brand-400', className)} />
    </span>
  );
}

export function LoadingBlock({ label = 'Loading…', className }) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 py-16', className)}>
      <div className="relative grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400 shadow-sm ring-1 ring-brand-500/20">
        <Spinner className="h-6 w-6" />
      </div>
      <p className="text-sm font-medium text-muted">{label}</p>
    </div>
  );
}

export function Skeleton({ className }) {
  return <div className={cn('skeleton h-4 w-full', className)} aria-hidden />;
}

/** Card-shaped placeholder used while dashboard/analytics data loads. */
export function SkeletonCard({ lines = 3, className }) {
  return (
    <div className={cn('card space-y-4 p-5 sm:p-6', className)} aria-hidden>
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-8 w-8 rounded-xl" />
      </div>
      <Skeleton className="h-8 w-2/3" />
      {Array.from({ length: lines - 2 }).map((_, i) => (
        <Skeleton key={i} className="h-3.5 w-full" />
      ))}
    </div>
  );
}

export function EmptyState({
  icon: Icon = Inbox,
  title = 'Nothing here yet',
  message,
  action,
  className,
  compact = false,
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center px-6 text-center animate-fade-in',
        compact ? 'py-8' : 'py-14',
        className
      )}
    >
      <div className="mb-3.5 grid h-14 w-14 place-items-center rounded-2xl bg-canvas text-muted shadow-sm ring-1 ring-line dark:bg-slate-800/80">
        <Icon className="h-7 w-7 stroke-[1.75]" aria-hidden />
      </div>
      <p className="text-sm font-semibold tracking-tight text-ink">{title}</p>
      {message && <p className="mt-1 max-w-sm text-xs sm:text-sm text-muted leading-relaxed">{message}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ error, onRetry, className, title = 'Could not load this' }) {
  const message =
    typeof error === 'string' ? error : error?.message || 'An unexpected error occurred.';

  return (
    <div className={cn('flex flex-col items-center justify-center px-6 py-12 text-center animate-fade-in', className)}>
      <div className="mb-3.5 grid h-14 w-14 place-items-center rounded-2xl bg-rose-50 text-rose-600 ring-1 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:ring-rose-500/20">
        <AlertCircle className="h-7 w-7" aria-hidden />
      </div>
      <p className="text-sm font-semibold text-ink">{title}</p>
      <p className="mt-1 max-w-sm text-xs sm:text-sm text-muted">{message}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" icon={RefreshCw} className="mt-4" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

export function Badge({ children, className, tone = 'neutral', dot = false }) {
  const tones = {
    neutral: 'bg-canvas text-muted ring-line',
    brand: 'bg-brand-50 text-brand-700 ring-brand-200 dark:bg-brand-500/15 dark:text-brand-300 dark:ring-brand-500/30',
    success: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-500/30',
    warning: 'bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-500/30',
    danger: 'bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:ring-rose-500/30',
  };

  const dotColors = {
    neutral: 'bg-slate-400',
    brand: 'bg-brand-500',
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    danger: 'bg-rose-500',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset transition-colors',
        tones[tone],
        className
      )}
    >
      {dot && <span className={cn('h-1.5 w-1.5 rounded-full', dotColors[tone])} />}
      {children}
    </span>
  );
}

export function ProgressBar({ value = 0, className, barClassName, label }) {
  const clamped = Math.min(Math.max(Number(value) || 0, 0), 100);
  return (
    <div
      className={cn('h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800/80 p-0.5 ring-1 ring-inset ring-line/50', className)}
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div
        className={cn('h-full rounded-full transition-all duration-500 ease-out', barClassName || 'bg-brand-600')}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
