import { createContext, useCallback, useMemo, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';
import cn from '../utils/cn';

export const ToastContext = createContext(null);

const VARIANTS = {
  success: {
    icon: CheckCircle2,
    accent: 'text-emerald-500',
    ring: 'ring-emerald-500/20',
  },
  error: { icon: XCircle, accent: 'text-rose-500', ring: 'ring-rose-500/20' },
  warning: { icon: AlertTriangle, accent: 'text-amber-500', ring: 'ring-amber-500/20' },
  info: { icon: Info, accent: 'text-brand-500', ring: 'ring-brand-500/20' },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef(new Map());
  const nextId = useRef(0);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const push = useCallback(
    (message, { variant = 'info', title, duration = 4500 } = {}) => {
      const id = ++nextId.current;
      setToasts((prev) => [...prev.slice(-3), { id, message, variant, title }]);

      if (duration > 0) {
        timers.current.set(
          id,
          setTimeout(() => dismiss(id), duration)
        );
      }
      return id;
    },
    [dismiss]
  );

  const toast = useMemo(
    () => ({
      show: push,
      success: (msg, opts) => push(msg, { ...opts, variant: 'success' }),
      error: (msg, opts) => push(msg, { ...opts, variant: 'error', duration: 6000 }),
      warning: (msg, opts) => push(msg, { ...opts, variant: 'warning' }),
      info: (msg, opts) => push(msg, { ...opts, variant: 'info' }),
      dismiss,
    }),
    [push, dismiss]
  );

  return (
    <ToastContext.Provider value={toast}>
      {children}

      <div
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[100] flex flex-col items-center gap-2 p-4 sm:inset-auto sm:right-0 sm:top-0 sm:items-end"
        role="region"
        aria-label="Notifications"
      >
        {toasts.map((t) => {
          const variant = VARIANTS[t.variant] || VARIANTS.info;
          const Icon = variant.icon;
          return (
            <div
              key={t.id}
              role="status"
              aria-live="polite"
              className={cn(
                'pointer-events-auto flex w-full max-w-sm animate-slide-in items-start gap-3 rounded-xl border border-line bg-elevated p-3.5 shadow-lift ring-1',
                variant.ring
              )}
            >
              <Icon className={cn('mt-0.5 h-5 w-5 shrink-0', variant.accent)} aria-hidden />
              <div className="min-w-0 flex-1">
                {t.title && <p className="text-sm font-semibold text-ink">{t.title}</p>}
                <p className="break-words text-sm text-muted">{t.message}</p>
              </div>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                className="rounded-md p-1 text-faint transition hover:bg-line/60 hover:text-ink"
                aria-label="Dismiss notification"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
