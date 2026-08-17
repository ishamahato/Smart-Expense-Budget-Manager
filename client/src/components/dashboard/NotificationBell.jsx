import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Bell, CheckCircle2 } from 'lucide-react';
import { budgetService } from '../../services';
import { useAuth } from '../../hooks';
import { formatMoney } from '../../utils/format';
import cn from '../../utils/cn';

/**
 * Budget alerts in the navbar. Alerts are derived server-side from live
 * spending, so a refetch is all that is needed to stay current.
 */
export default function NotificationBell() {
  const { currency } = useAuth();
  const [open, setOpen] = useState(false);
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    let cancelled = false;
    budgetService
      .alerts()
      .then((data) => {
        if (!cancelled) setAlerts(data.alerts || []);
      })
      .catch(() => {
        /* the bell simply stays empty if this fails */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const close = () => setOpen(false);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [open]);

  const critical = alerts.filter((a) => a.level === 'danger').length;

  return (
    <div className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative grid h-9 w-9 place-items-center rounded-lg text-muted transition hover:bg-line/50 hover:text-ink"
        aria-label={`Budget alerts${alerts.length ? ` (${alerts.length})` : ''}`}
        aria-expanded={open}
      >
        <Bell className="h-4.5 w-4.5" />
        {alerts.length > 0 && (
          <span
            className={cn(
              'absolute right-1.5 top-1.5 grid h-4 min-w-4 place-items-center rounded-full px-1 text-[10px] font-bold text-white ring-2 ring-surface',
              critical > 0 ? 'bg-rose-500' : 'bg-amber-500'
            )}
          >
            {alerts.length > 9 ? '9+' : alerts.length}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Budget alerts"
          className="absolute right-0 z-40 mt-2 w-80 overflow-hidden rounded-xl border border-line bg-elevated shadow-lift animate-scale-in"
        >
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <p className="text-sm font-semibold text-ink">Budget alerts</p>
            {alerts.length > 0 && (
              <span className="text-xs text-faint">{alerts.length} active</span>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {alerts.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
                <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                <p className="text-sm font-medium text-ink">All budgets on track</p>
                <p className="text-xs text-muted">
                  We'll warn you at 80% and again if you go over.
                </p>
              </div>
            ) : (
              alerts.map((alert) => (
                <div
                  key={alert.id}
                  className="flex gap-3 border-b border-line px-4 py-3 last:border-0"
                >
                  <AlertTriangle
                    className={cn(
                      'mt-0.5 h-4 w-4 shrink-0',
                      alert.level === 'danger' ? 'text-rose-500' : 'text-amber-500'
                    )}
                  />
                  <div className="min-w-0">
                    <p className="text-sm text-ink">{alert.message}</p>
                    <p className="mt-0.5 text-xs text-faint">
                      {formatMoney(alert.spent, currency)} of{' '}
                      {formatMoney(alert.amount, currency)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          <Link
            to="/budgets"
            onClick={() => setOpen(false)}
            className="block border-t border-line px-4 py-2.5 text-center text-xs font-medium text-brand-600 transition hover:bg-line/40 dark:text-brand-400"
          >
            Manage budgets
          </Link>
        </div>
      )}
    </div>
  );
}
