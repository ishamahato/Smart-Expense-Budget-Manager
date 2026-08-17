import cn from '../../utils/cn';

export default function Card({
  className,
  children,
  padded = true,
  interactive = false,
  glass = false,
  neu = false,
  ...props
}) {
  return (
    <div
      className={cn(
        'card',
        neu && 'card-neu',
        glass && 'card-glass',
        interactive && 'card-interactive cursor-pointer',
        padded && 'p-5 sm:p-6',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, action, className, icon: Icon }) {
  return (
    <div className={cn('mb-4 flex items-start justify-between gap-3', className)}>
      <div className="min-w-0">
        <h3 className="flex items-center gap-2 text-sm font-semibold tracking-tight text-ink">
          {Icon && (
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
              <Icon className="h-3.5 w-3.5" aria-hidden />
            </span>
          )}
          {title}
        </h3>
        {subtitle && <p className="mt-0.5 text-xs text-muted leading-relaxed">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
