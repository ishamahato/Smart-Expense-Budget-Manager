import { useCallback, useState } from 'react';
import {
  CalendarClock,
  CheckCircle2,
  Pause,
  Play,
  Plus,
  Repeat,
  SkipForward,
  Trash2,
  Wallet,
} from 'lucide-react';
import { categoryService, recurringService } from '../services';
import { useAsync, useAuth, useConfirm, useDocumentTitle, useToast } from '../hooks';
import { currencyMeta, formatMoney, formatRelativeDate, toDateInputValue } from '../utils/format';
import { FREQUENCIES, PAYMENT_METHODS } from '../utils/constants';
import PageHeader from '../components/ui/PageHeader';
import Card, { CardHeader } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import { Input, Select, Textarea, Toggle } from '../components/ui/Field';
import { Badge, EmptyState, ErrorState, SkeletonCard } from '../components/ui/Feedback';
import CategoryIcon from '../components/ui/CategoryIcon';
import StatCard from '../components/dashboard/StatCard';
import cn from '../utils/cn';

export default function RecurringExpenses() {
  useDocumentTitle('Recurring');
  const { currency } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const { data: categories } = useAsync(() => categoryService.list(), []);
  const { data, loading, error, refetch } = useAsync(() => recurringService.list(), []);

  const act = useCallback(
    async (fn, successMessage) => {
      try {
        await fn();
        toast.success(successMessage);
        refetch();
      } catch (err) {
        toast.error(err.message);
      }
    },
    [toast, refetch]
  );

  const handleDelete = useCallback(
    async (item) => {
      const ok = await confirm({
        title: `Delete "${item.merchant}"?`,
        message:
          'The schedule stops immediately. Expenses already recorded from it are kept.',
        confirmLabel: 'Delete schedule',
      });
      if (ok) act(() => recurringService.remove(item._id), 'Recurring expense deleted');
    },
    [confirm, act]
  );

  if (error) return <ErrorState error={error} onRetry={refetch} />;

  const items = data?.items || [];
  const summary = data?.summary;
  const dueItems = items.filter((i) => i.isDue && i.isActive);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Recurring expenses"
        subtitle="Rent, utilities and subscriptions that repeat on a schedule."
        actions={
          <Button
            icon={Plus}
            onClick={() => {
              setEditing(null);
              setEditorOpen(true);
            }}
          >
            New recurring expense
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          loading={loading}
          label="Monthly commitment"
          value={formatMoney(summary?.monthlyCommitment, currency)}
          icon={Wallet}
          sublabel="Weekly and yearly items converted to a monthly equivalent"
        />
        <StatCard
          loading={loading}
          label="Active schedules"
          value={summary?.activeCount ?? 0}
          icon={Repeat}
          tone="emerald"
          sublabel={`${summary?.inactiveCount ?? 0} paused`}
        />
        <StatCard
          loading={loading}
          label="Due now"
          value={summary?.dueNow ?? 0}
          icon={CalendarClock}
          tone={summary?.dueNow ? 'amber' : 'slate'}
          sublabel={summary?.dueNow ? 'Waiting to be recorded' : 'Nothing due today'}
        />
      </div>

      {dueItems.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-500/30 dark:bg-amber-500/5">
          <CardHeader
            title="Due now"
            subtitle="Record these to add them to this month's spending"
            icon={CalendarClock}
          />
          <ul className="space-y-2">
            {dueItems.map((item) => (
              <li
                key={item._id}
                className="flex flex-wrap items-center gap-3 rounded-lg border border-line bg-surface p-3"
              >
                <CategoryIcon name={item.category?.icon} color={item.category?.color} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">{item.merchant}</p>
                  <p className="text-xs text-faint">
                    {formatMoney(item.amount, currency)} · due{' '}
                    {formatRelativeDate(item.nextDueDate)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={SkipForward}
                    onClick={() => act(() => recurringService.skip(item._id), 'Skipped to the next date')}
                  >
                    Skip
                  </Button>
                  <Button
                    size="sm"
                    icon={CheckCircle2}
                    onClick={() => act(() => recurringService.postNow(item._id), `Recorded ${item.merchant}`)}
                  >
                    Record
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} lines={4} />
          ))}
        </div>
      ) : !items.length ? (
        <Card>
          <EmptyState
            icon={Repeat}
            title="No recurring expenses yet"
            message="Add rent, your internet bill or a subscription and it will be recorded automatically on each due date."
            action={
              <Button
                icon={Plus}
                onClick={() => {
                  setEditing(null);
                  setEditorOpen(true);
                }}
              >
                Add your first one
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <Card key={item._id} className={cn('group', !item.isActive && 'opacity-65')}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2.5">
                  <CategoryIcon name={item.category?.icon} color={item.category?.color} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink">{item.merchant}</p>
                    <p className="truncate text-xs text-faint">
                      {item.category?.name || 'Uncategorised'}
                    </p>
                  </div>
                </div>
                <Badge tone={item.isActive ? (item.isDue ? 'warning' : 'success') : 'neutral'}>
                  {item.isActive ? (item.isDue ? 'Due' : 'Active') : 'Paused'}
                </Badge>
              </div>

              <p className="mt-4 text-2xl font-semibold tracking-tight text-ink">
                {formatMoney(item.amount, currency)}
                <span className="ml-1.5 text-sm font-normal text-faint">
                  / {item.frequency.replace('ly', '')}
                </span>
              </p>

              <dl className="mt-3 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <dt className="text-faint">Next due</dt>
                  <dd className="font-medium text-ink">
                    {formatRelativeDate(item.nextDueDate)}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-faint">Monthly equivalent</dt>
                  <dd className="tabular-nums text-muted">
                    {formatMoney(item.monthlyEquivalent, currency)}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-faint">Recording</dt>
                  <dd className="text-muted">{item.autoPost ? 'Automatic' : 'Manual confirm'}</dd>
                </div>
                {item.postedCount > 0 && (
                  <div className="flex justify-between">
                    <dt className="text-faint">Recorded so far</dt>
                    <dd className="text-muted">{item.postedCount}×</dd>
                  </div>
                )}
              </dl>

              <div className="mt-4 flex items-center gap-1 border-t border-line pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setEditing(item);
                    setEditorOpen(true);
                  }}
                  className="rounded-md px-2.5 py-1.5 text-xs font-medium text-muted transition hover:bg-line/60 hover:text-ink"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() =>
                    act(
                      () => recurringService.update(item._id, { isActive: !item.isActive }),
                      item.isActive ? 'Schedule paused' : 'Schedule resumed'
                    )
                  }
                  className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-muted transition hover:bg-line/60 hover:text-ink"
                >
                  {item.isActive ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                  {item.isActive ? 'Pause' : 'Resume'}
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(item)}
                  className="ml-auto grid h-7 w-7 place-items-center rounded-md text-faint transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10"
                  aria-label={`Delete ${item.merchant}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <RecurringEditor
        open={editorOpen}
        onClose={() => {
          setEditorOpen(false);
          setEditing(null);
        }}
        editing={editing}
        categories={categories || []}
        currency={currency}
        onSaved={() => {
          setEditorOpen(false);
          setEditing(null);
          refetch();
        }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */

const blank = {
  merchant: '',
  amount: '',
  category: '',
  frequency: 'monthly',
  nextDueDate: toDateInputValue(new Date()),
  paymentMethod: 'upi',
  description: '',
  autoPost: true,
};

function RecurringEditor({ open, onClose, editing, categories, currency, onSaved }) {
  const toast = useToast();
  const { symbol } = currencyMeta(currency);

  const [form, setForm] = useState(blank);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  // Re-seed the form whenever the dialog targets a different record.
  const key = editing?._id || 'new';
  const [lastKey, setLastKey] = useState(null);
  if (open && key !== lastKey) {
    setLastKey(key);
    setForm(
      editing
        ? {
            merchant: editing.merchant,
            amount: editing.amount,
            category: editing.category?._id || editing.category || '',
            frequency: editing.frequency,
            nextDueDate: toDateInputValue(editing.nextDueDate),
            paymentMethod: editing.paymentMethod,
            description: editing.description || '',
            autoPost: editing.autoPost,
          }
        : { ...blank, category: categories[0]?._id || '' }
    );
    setErrors({});
  }
  if (!open && lastKey !== null) setLastKey(null);

  const set = (field) => (e) => {
    const value = e?.target ? e.target.value : e;
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined, form: undefined }));
  };

  async function handleSubmit(e) {
    e.preventDefault();
    const next = {};
    if (!form.merchant.trim()) next.merchant = 'Who is this paid to?';
    if (!form.amount || Number(form.amount) <= 0) next.amount = 'Enter an amount above zero';
    if (!form.category) next.category = 'Pick a category';
    if (!form.nextDueDate) next.nextDueDate = 'Pick the next due date';
    setErrors(next);
    if (Object.keys(next).length) return;

    const payload = {
      merchant: form.merchant.trim(),
      amount: Number(form.amount),
      category: form.category,
      frequency: form.frequency,
      nextDueDate: new Date(`${form.nextDueDate}T10:00:00`).toISOString(),
      paymentMethod: form.paymentMethod,
      description: form.description.trim(),
      autoPost: form.autoPost,
    };

    setSaving(true);
    try {
      if (editing) await recurringService.update(editing._id, payload);
      else await recurringService.create(payload);
      toast.success(editing ? 'Recurring expense updated' : 'Recurring expense created');
      onSaved();
    } catch (err) {
      setErrors({ form: err.message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Edit recurring expense' : 'New recurring expense'}
      description="Set it once and it will be recorded on every due date."
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {errors.form && (
          <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
            {errors.form}
          </p>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Merchant"
            placeholder="Monthly Rent"
            value={form.merchant}
            onChange={set('merchant')}
            error={errors.merchant}
            required
          />
          <Input
            label="Amount"
            type="number"
            min="0"
            step="0.01"
            prefix={symbol}
            placeholder="22000"
            value={form.amount}
            onChange={set('amount')}
            error={errors.amount}
            required
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Category"
            options={categories.map((c) => ({ value: c._id, label: c.name }))}
            value={form.category}
            onChange={set('category')}
            error={errors.category}
            required
          />
          <Select
            label="Frequency"
            options={FREQUENCIES}
            value={form.frequency}
            onChange={set('frequency')}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Next due date"
            type="date"
            value={form.nextDueDate}
            onChange={set('nextDueDate')}
            error={errors.nextDueDate}
            required
          />
          <Select
            label="Payment method"
            options={PAYMENT_METHODS}
            value={form.paymentMethod}
            onChange={set('paymentMethod')}
          />
        </div>

        <Textarea
          label="Notes"
          rows={2}
          placeholder="Optional"
          value={form.description}
          onChange={set('description')}
        />

        <div className="rounded-lg border border-line bg-canvas p-3.5">
          <Toggle
            checked={form.autoPost}
            onChange={set('autoPost')}
            label="Record automatically on the due date"
            description="Turn this off to review each occurrence before it is added to your expenses."
          />
        </div>

        <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" loading={saving}>
            {editing ? 'Save changes' : 'Create schedule'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
