import { createContext, useCallback, useRef, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';

export const ConfirmContext = createContext(null);

/**
 * Promise-based confirmation dialog:
 *   if (await confirm({ title, message })) { ...destructive action... }
 */
export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null);
  const [busy, setBusy] = useState(false);
  const resolver = useRef(null);

  const confirm = useCallback((options = {}) => {
    setState({
      title: options.title || 'Are you sure?',
      message: options.message || 'This action cannot be undone.',
      confirmLabel: options.confirmLabel || 'Confirm',
      cancelLabel: options.cancelLabel || 'Cancel',
      variant: options.variant || 'danger',
    });
    return new Promise((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const settle = useCallback((result) => {
    setState(null);
    setBusy(false);
    resolver.current?.(result);
    resolver.current = null;
  }, []);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}

      <Modal
        open={Boolean(state)}
        onClose={() => settle(false)}
        size="sm"
        title={
          <span className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400">
              <AlertTriangle className="h-5 w-5" />
            </span>
            {state?.title}
          </span>
        }
      >
        <p className="text-sm leading-relaxed text-muted">{state?.message}</p>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={() => settle(false)} disabled={busy}>
            {state?.cancelLabel}
          </Button>
          <Button
            variant={state?.variant === 'danger' ? 'danger' : 'primary'}
            loading={busy}
            onClick={() => {
              setBusy(true);
              settle(true);
            }}
          >
            {state?.confirmLabel}
          </Button>
        </div>
      </Modal>
    </ConfirmContext.Provider>
  );
}
