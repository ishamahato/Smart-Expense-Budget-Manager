import { Link } from 'react-router-dom';
import { MoreHorizontal, Pencil, Receipt, Repeat, Trash2 } from 'lucide-react';
import { useState } from 'react';
import CategoryIcon from '../ui/CategoryIcon';
import { EmptyState, Skeleton } from '../ui/Feedback';
import { formatMoney, formatRelativeDate, titleCase } from '../../utils/format';
import { PAYMENT_METHODS } from '../../utils/constants';
import cn from '../../utils/cn';

const methodLabel = (value) =>
  PAYMENT_METHODS.find((m) => m.value === value)?.label || titleCase(value || '');

function RowActions({ onEdit, onDelete }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative flex justify-end" onClick={(e) => e.stopPropagation()}>
      {/* Inline buttons on desktop */}
      <div className="hidden items-center gap-1 sm:flex">
        <button
          type="button"
          onClick={onEdit}
          className="grid h-8 w-8 place-items-center rounded-lg text-faint transition-all hover:bg-brand-50 hover:text-brand-600 dark:hover:bg-brand-500/15 dark:hover:text-brand-300"
          aria-label="Edit expense"
        >
          <Pencil className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="grid h-8 w-8 place-items-center rounded-lg text-faint transition-all hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/15 dark:hover:text-rose-400"
          aria-label="Delete expense"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        className="grid h-8 w-8 place-items-center rounded-lg text-faint transition hover:bg-line/60 hover:text-ink sm:hidden"
        aria-label="Expense actions"
        aria-expanded={open}
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>

      {open && (
        <div className="absolute right-0 top-9 z-20 w-36 overflow-hidden rounded-xl border border-line bg-surface p-1 shadow-lift sm:hidden animate-scale-in">
          <button
            type="button"
            onClick={onEdit}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted transition hover:bg-slate-100 hover:text-ink dark:hover:bg-slate-800"
          >
            <Pencil className="h-4 w-4" /> Edit
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="flex w-full items-center gap-2 rounded-lg border-t border-line/60 px-3 py-2 text-sm text-rose-600 transition hover:bg-rose-50 dark:hover:bg-rose-500/10"
          >
            <Trash2 className="h-4 w-4" /> Delete
          </button>
        </div>
      )}
    </div>
  );
}

export default function ExpenseTable({
  items = [],
  loading = false,
  currency = 'INR',
  onEdit,
  onDelete,
  emptyTitle = 'No expenses yet',
  emptyMessage = 'Add your first expense to start seeing insights.',
  emptyAction,
}) {
  if (loading) {
    return (
      <div className="divide-y divide-line/70" aria-hidden>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3.5 px-6 py-4">
            <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-44" />
              <Skeleton className="h-3 w-28" />
            </div>
            <Skeleton className="h-5 w-20" />
          </div>
        ))}
      </div>
    );
  }

  if (!items.length) {
    return (
      <EmptyState
        icon={Receipt}
        title={emptyTitle}
        message={emptyMessage}
        action={
          emptyAction ?? (
            <Link
              to="/expenses/new"
              className="inline-flex h-9 items-center rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:from-brand-500 hover:to-indigo-500"
            >
              Add an expense
            </Link>
          )
        }
      />
    );
  }

  return (
    <>
      {/* Table on md+, stacked cards below */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase font-semibold tracking-wider text-muted bg-canvas/60">
              <th scope="col" className="px-6 py-3">Merchant</th>
              <th scope="col" className="px-4 py-3">Category</th>
              <th scope="col" className="px-4 py-3">Date</th>
              <th scope="col" className="px-4 py-3">Method</th>
              <th scope="col" className="px-6 py-3 text-right">Amount</th>
              <th scope="col" className="px-4 py-3 text-right">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line/70">
            {items.map((item) => (
              <tr key={item._id} className="group transition-colors duration-150 hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                <td className="px-6 py-3.5">
                  <div className="flex items-center gap-3">
                    <CategoryIcon
                      name={item.category?.icon}
                      color={item.category?.color}
                      size="sm"
                    />
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 truncate font-semibold text-ink">
                        {item.merchant}
                        {item.isRecurring && (
                          <span className="inline-flex items-center gap-0.5 rounded-md bg-brand-50 px-1.5 py-0.5 text-[10px] font-bold text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
                            <Repeat className="h-2.5 w-2.5" /> RECURRING
                          </span>
                        )}
                      </p>
                      {item.description && (
                        <p className="truncate text-xs text-muted leading-tight mt-0.5">{item.description}</p>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3.5">
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted">
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ background: item.category?.color || '#94a3b8' }}
                    />
                    {item.category?.name || 'Uncategorised'}
                  </span>
                </td>
                <td className="whitespace-nowrap px-4 py-3.5 text-xs text-muted">
                  {formatRelativeDate(item.date)}
                </td>
                <td className="px-4 py-3.5 text-xs font-medium text-muted">
                  <span className="rounded-lg bg-canvas px-2 py-1 border border-line">
                    {methodLabel(item.paymentMethod)}
                  </span>
                </td>
                <td className="whitespace-nowrap px-6 py-3.5 text-right font-bold font-mono tabular-nums text-ink">
                  {formatMoney(item.amount, currency)}
                </td>
                <td className="px-4 py-3.5">
                  <RowActions onEdit={() => onEdit?.(item)} onDelete={() => onDelete?.(item)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="divide-y divide-line/70 md:hidden">
        {items.map((item) => (
          <li key={item._id} className="flex items-center gap-3 px-4 py-3.5 transition hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
            <CategoryIcon name={item.category?.icon} color={item.category?.color} />
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 truncate text-sm font-semibold text-ink">
                {item.merchant}
                {item.isRecurring && <Repeat className="h-3 w-3 shrink-0 text-brand-500" />}
              </p>
              <p className="truncate text-xs text-muted">
                {item.category?.name || 'Uncategorised'} · {formatRelativeDate(item.date)}
              </p>
            </div>
            <span className="shrink-0 text-sm font-bold font-mono tabular-nums text-ink">
              {formatMoney(item.amount, currency)}
            </span>
            <RowActions onEdit={() => onEdit?.(item)} onDelete={() => onDelete?.(item)} />
          </li>
        ))}
      </ul>
    </>
  );
}
