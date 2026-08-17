import { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';
import cn from '../../utils/cn';

const VARIANTS = {
  primary:
    'bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white shadow-sm shadow-brand-500/20 hover:shadow-brand-500/30 active:from-brand-700 active:to-indigo-700 border border-white/10',
  secondary:
    'bg-surface text-ink border border-line shadow-sm hover:bg-canvas hover:border-slate-300 dark:hover:border-slate-600 active:bg-line/60',
  ghost: 'text-muted hover:bg-line/60 hover:text-ink active:bg-line',
  danger:
    'bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white shadow-sm shadow-rose-500/20 active:from-rose-700 active:to-red-700 border border-white/10',
  subtle:
    'bg-brand-50 text-brand-700 hover:bg-brand-100 dark:bg-brand-500/15 dark:text-brand-300 dark:hover:bg-brand-500/25',
  neu:
    'bg-surface text-ink shadow-neu-sm hover:shadow-neu-flat active:shadow-neu-pressed border border-white/60 dark:border-white/5 transition-all duration-150',
};

const SIZES = {
  sm: 'h-8 px-3 text-xs gap-1.5 rounded-lg',
  md: 'h-10 px-4 text-sm gap-2 rounded-xl',
  lg: 'h-11 px-5 text-sm font-semibold gap-2.5 rounded-xl',
  icon: 'h-9 w-9 rounded-xl',
};

const Button = forwardRef(function Button(
  {
    variant = 'primary',
    size = 'md',
    loading = false,
    icon: Icon,
    iconRight: IconRight,
    className,
    children,
    disabled,
    type = 'button',
    ...props
  },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        'inline-flex select-none items-center justify-center whitespace-nowrap font-medium transition-all duration-150',
        'active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-55 disabled:active:scale-100',
        VARIANTS[variant],
        SIZES[size],
        className
      )}
      {...props}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
      ) : (
        Icon && <Icon className="h-4 w-4 shrink-0" aria-hidden />
      )}
      {children}
      {!loading && IconRight && <IconRight className="h-4 w-4 shrink-0" aria-hidden />}
    </button>
  );
});

export default Button;
