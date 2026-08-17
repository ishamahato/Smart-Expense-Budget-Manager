import { ChevronLeft, ChevronRight } from 'lucide-react';
import cn from '../../utils/cn';

/** Compact page list: 1 … 4 5 [6] 7 8 … 20 */
function pageWindow(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages = new Set([1, total, current, current - 1, current + 1]);
  if (current <= 3) [2, 3, 4].forEach((p) => pages.add(p));
  if (current >= total - 2) [total - 3, total - 2, total - 1].forEach((p) => pages.add(p));

  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);

  const out = [];
  let prev = 0;
  for (const p of sorted) {
    if (p - prev > 1) out.push('…');
    out.push(p);
    prev = p;
  }
  return out;
}

export default function Pagination({ page, pages, total, limit, onChange, className }) {
  if (!pages || pages <= 1) return null;

  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-between gap-3 border-t border-line px-4 py-3 sm:flex-row',
        className
      )}
    >
      <p className="text-xs text-muted">
        Showing <span className="font-medium text-ink">{from}</span>–
        <span className="font-medium text-ink">{to}</span> of{' '}
        <span className="font-medium text-ink">{total}</span>
      </p>

      <nav className="flex items-center gap-1" aria-label="Pagination">
        <button
          type="button"
          onClick={() => onChange(page - 1)}
          disabled={page <= 1}
          className="grid h-8 w-8 place-items-center rounded-lg text-muted transition hover:bg-line/60 hover:text-ink disabled:pointer-events-none disabled:opacity-40"
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {pageWindow(page, pages).map((p, i) =>
          p === '…' ? (
            <span key={`gap-${i}`} className="px-1.5 text-xs text-faint" aria-hidden>
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => onChange(p)}
              aria-current={p === page ? 'page' : undefined}
              className={cn(
                'h-8 min-w-8 rounded-lg px-2 text-xs font-medium transition',
                p === page
                  ? 'bg-brand-600 text-white'
                  : 'text-muted hover:bg-line/60 hover:text-ink'
              )}
            >
              {p}
            </button>
          )
        )}

        <button
          type="button"
          onClick={() => onChange(page + 1)}
          disabled={page >= pages}
          className="grid h-8 w-8 place-items-center rounded-lg text-muted transition hover:bg-line/60 hover:text-ink disabled:pointer-events-none disabled:opacity-40"
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </nav>
    </div>
  );
}
