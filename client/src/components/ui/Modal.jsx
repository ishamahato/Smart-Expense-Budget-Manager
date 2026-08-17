import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import cn from '../../utils/cn';

const SIZES = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

/**
 * Accessible dialog: locks body scroll, closes on Escape / backdrop click,
 * moves focus in on open and returns it to the trigger on close.
 */
export default function Modal({
  open,
  onClose,
  title,
  description,
  size = 'md',
  children,
  footer,
  closeOnBackdrop = true,
}) {
  const panelRef = useRef(null);
  const previouslyFocused = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    previouslyFocused.current = document.activeElement;
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.();
      if (e.key !== 'Tab' || !panelRef.current) return;

      // Simple focus trap across the panel's tabbable elements.
      const focusables = panelRef.current.querySelectorAll(
        'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
      );
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    // Defer so the panel is mounted before we reach into it.
    const focusTimer = setTimeout(() => {
      const target = panelRef.current?.querySelector(
        'input:not([type="hidden"]), textarea, select, button'
      );
      target?.focus();
    }, 30);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      clearTimeout(focusTimer);
      document.body.style.overflow = overflow;
      previouslyFocused.current?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto p-0 sm:items-center sm:p-4">
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm animate-fade-in"
        onClick={closeOnBackdrop ? onClose : undefined}
        aria-hidden
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : undefined}
        className={cn(
          'relative z-10 flex max-h-[92vh] w-full flex-col rounded-t-2xl border border-line bg-surface shadow-lift animate-scale-in sm:rounded-2xl',
          SIZES[size]
        )}
      >
        {(title || onClose) && (
          <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
            <div className="min-w-0">
              {title && (
                <h2 className="text-base font-semibold text-ink">{title}</h2>
              )}
              {description && <p className="mt-1 text-sm text-muted">{description}</p>}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="-mr-1 -mt-1 rounded-lg p-1.5 text-faint transition hover:bg-line/60 hover:text-ink"
              aria-label="Close dialog"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>

        {footer && (
          <div className="border-t border-line px-5 py-4">{footer}</div>
        )}
      </div>
    </div>,
    document.body
  );
}
