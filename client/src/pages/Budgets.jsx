import { useCallback, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  PiggyBank,
  Plus,
  Sparkles,
  Trash2,
  Wand2,
} from 'lucide-react';
import { budgetService, categoryService, aiService } from '../services';
import { useAsync, useAuth, useConfirm, useDocumentTitle, useToast } from '../hooks';
import { currencyMeta, formatMoney } from '../utils/format';
import { BUDGET_STATUS } from '../utils/constants';
import PageHeader from '../components/ui/PageHeader';
import MonthPicker from '../components/ui/MonthPicker';
import Card, { CardHeader } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import { Input, Select, Textarea } from '../components/ui/Field';
import { EmptyState, ErrorState, ProgressBar, SkeletonCard } from '../components/ui/Feedback';
import CategoryIcon from '../components/ui/CategoryIcon';
import cn from '../utils/cn';

const now = new Date();

export default function Budgets() {
  useDocumentTitle('Budgets');
  const { currency } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const { symbol } = currencyMeta(currency);

  const [period, setPeriod] = useState({ year: now.getFullYear(), month: now.getMonth() + 1 });
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [aiOpen, setAiOpen] = useState(false);

  const { data: categories } = useAsync(() => categoryService.list(), []);
  const { data, loading, error, refetch } = useAsync(
    () => budgetService.overview(period),
    [period.year, period.month]
  );

  const overallStatus = BUDGET_STATUS[data?.overall?.status] || BUDGET_STATUS['on-track'];

  const unbudgetedCategories = useMemo(() => {
    if (!categories || !data) return [];
    const used = new Set(data.categories.map((c) => String(c.categoryId)));
    return categories.filter((c) => !used.has(String(c._id)));
  }, [categories, data]);

  const handleDelete = useCallback(
    async (budget) => {
      const ok = await confirm({
        title: `Remove the ${budget.name} budget?`,
        message: 'Your expenses stay untouched — only the monthly limit is removed.',
        confirmLabel: 'Remove budget',
      });
      if (!ok) return;
      try {
        await budgetService.remove(budget._id);
        toast.success('Budget removed');
        refetch();
      } catch (err) {
        toast.error(err.message);
      }
    },
    [confirm, toast, refetch]
  );

  if (error) return <ErrorState error={error} onRetry={refetch} />;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Budgets"
        subtitle={
          data
            ? `${data.period.label} · ${formatMoney(data.overall.spent, currency)} of ${formatMoney(data.overall.amount, currency)} used`
            : 'Set monthly limits and get warned before you overspend.'
        }
        actions={
          <>
            <MonthPicker year={period.year} month={period.month} onChange={setPeriod} />
            <Button variant="secondary" icon={Wand2} onClick={() => setAiOpen(true)}>
              Suggest
            </Button>
            <Button
              icon={Plus}
              onClick={() => {
                setEditing(null);
                setEditorOpen(true);
              }}
            >
              Set budget
            </Button>
          </>
        }
      />

      {loading ? (
        <div className="grid gap-4 lg:grid-cols-3">
          <SkeletonCard lines={4} className="lg:col-span-3" />
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} lines={4} />
          ))}
        </div>
      ) : (
        <>
          {/* Overall */}
          <Card>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-faint">
                  Overall monthly budget
                </p>
                <p className="mt-1.5 text-3xl font-semibold tracking-tight text-ink">
                  {formatMoney(data.overall.spent, currency)}
                  <span className="ml-2 text-base font-normal text-faint">
                    of {formatMoney(data.overall.amount, currency)}
                  </span>
                </p>
                {!data.overall.isExplicit && data.overall.amount > 0 && (
                  <p className="mt-1 text-xs text-faint">
                    Derived from the sum of your category budgets.
                  </p>
                )}
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-xs text-faint">
                    {data.overall.remaining >= 0 ? 'Remaining' : 'Over by'}
                  </p>
                  <p
                    className={cn(
                      'text-xl font-semibold tabular-nums',
                      data.overall.remaining >= 0
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-rose-600 dark:text-rose-400'
                    )}
                  >
                    {formatMoney(Math.abs(data.overall.remaining), currency)}
                  </p>
                </div>
                <span
                  className={cn(
                    'rounded-full px-2.5 py-1 text-xs font-medium',
                    overallStatus.chip
                  )}
                >
                  {data.overall.percentage}% used
                </span>
              </div>
            </div>

            <ProgressBar
              value={data.overall.percentage}
              barClassName={overallStatus.bar}
              className="mt-4 h-2.5"
              label="Overall budget used"
            />

            {data.unbudgetedSpend > 0 && (
              <p className="mt-3 text-xs text-muted">
                <AlertTriangle className="mr-1 inline h-3.5 w-3.5 text-amber-500" />
                {formatMoney(data.unbudgetedSpend, currency)} was spent in categories with no
                budget this month.
              </p>
            )}
          </Card>

          {/* Alerts */}
          {data.alerts.length > 0 && (
            <div className="grid gap-2 sm:grid-cols-2">
              {data.alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={cn(
                    'flex items-start gap-2.5 rounded-xl border px-3.5 py-3 text-sm',
                    alert.level === 'danger'
                      ? 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300'
                      : 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300'
                  )}
                >
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{alert.message}</span>
                </div>
              ))}
            </div>
          )}

          {/* Category budgets */}
          {!data.categories.length ? (
            <Card>
              <EmptyState
                icon={PiggyBank}
                title="No category budgets for this month"
                message="Set a limit per category to see progress bars and get alerts at 80% and 100%."
                action={
                  <div className="flex flex-wrap justify-center gap-2">
                    <Button
                      icon={Plus}
                      onClick={() => {
                        setEditing(null);
                        setEditorOpen(true);
                      }}
                    >
                      Set your first budget
                    </Button>
                    <Button variant="secondary" icon={Sparkles} onClick={() => setAiOpen(true)}>
                      Suggest one for me
                    </Button>
                  </div>
                }
              />
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {data.categories.map((c) => {
                const status = BUDGET_STATUS[c.status];
                return (
                  <Card key={c._id} className="group">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <CategoryIcon name={c.icon} color={c.color} />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-ink">{c.name}</p>
                          <p className="text-xs text-faint">
                            {c.transactions} transaction{c.transactions === 1 ? '' : 's'}
                          </p>
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditing(c);
                            setEditorOpen(true);
                          }}
                          className="rounded-md px-2 py-1 text-xs font-medium text-muted opacity-0 transition hover:bg-line/60 hover:text-ink focus:opacity-100 group-hover:opacity-100"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(c)}
                          className="grid h-7 w-7 place-items-center rounded-md text-faint opacity-0 transition hover:bg-rose-50 hover:text-rose-600 focus:opacity-100 group-hover:opacity-100 dark:hover:bg-rose-500/10"
                          aria-label={`Remove ${c.name} budget`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 flex items-end justify-between gap-2">
                      <p className="text-xl font-semibold tabular-nums text-ink">
                        {formatMoney(c.spent, currency)}
                      </p>
                      <p className="text-xs text-muted">of {formatMoney(c.amount, currency)}</p>
                    </div>

                    <ProgressBar
                      value={c.percentage}
                      barClassName={status.bar}
                      className="mt-2"
                      label={`${c.name} budget used`}
                    />

                    <div className="mt-2 flex items-center justify-between text-xs">
                      <span className={status.text}>
                        {c.percentage}% · {status.label}
                      </span>
                      <span className={c.remaining >= 0 ? 'text-muted' : 'text-rose-600 dark:text-rose-400'}>
                        {c.remaining >= 0
                          ? `${formatMoney(c.remaining, currency)} left`
                          : `${formatMoney(-c.remaining, currency)} over`}
                      </span>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}

      <BudgetEditor
        open={editorOpen}
        onClose={() => {
          setEditorOpen(false);
          setEditing(null);
        }}
        editing={editing}
        period={period}
        categories={categories || []}
        unbudgeted={unbudgetedCategories}
        symbol={symbol}
        onSaved={() => {
          setEditorOpen(false);
          setEditing(null);
          refetch();
        }}
      />

      <AiBudgetModal
        open={aiOpen}
        onClose={() => setAiOpen(false)}
        period={period}
        categories={categories || []}
        currency={currency}
        symbol={symbol}
        onApplied={() => {
          setAiOpen(false);
          refetch();
        }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */

function BudgetEditor({ open, onClose, editing, period, categories, unbudgeted, symbol, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState({ category: '', amount: '', notes: '' });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  // Reset whenever the dialog opens for a different target.
  const key = editing?._id || 'new';
  const [lastKey, setLastKey] = useState(key);
  if (open && key !== lastKey) {
    setLastKey(key);
    setForm({
      category: editing?.categoryId || '',
      amount: editing?.amount ?? '',
      notes: editing?.notes || '',
    });
    setErrors({});
  }

  const options = editing
    ? categories.filter((c) => String(c._id) === String(editing.categoryId))
    : unbudgeted;

  async function handleSubmit(e) {
    e.preventDefault();
    const next = {};
    if (!form.category) next.category = 'Pick a category';
    if (!form.amount || Number(form.amount) <= 0) next.amount = 'Enter an amount above zero';
    setErrors(next);
    if (Object.keys(next).length) return;

    setSaving(true);
    try {
      await budgetService.save({
        category: form.category,
        amount: Number(form.amount),
        month: period.month,
        year: period.year,
        notes: form.notes,
      });
      toast.success(editing ? 'Budget updated' : 'Budget set');
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
      title={editing ? `Edit ${editing.name} budget` : 'Set a category budget'}
      description={`For ${new Date(period.year, period.month - 1).toLocaleString('en-IN', { month: 'long', year: 'numeric' })}`}
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {errors.form && (
          <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
            {errors.form}
          </p>
        )}

        {!editing && !options.length ? (
          <p className="rounded-lg border border-line bg-canvas px-3 py-2.5 text-sm text-muted">
            Every category already has a budget this month. Edit one from the grid instead.
          </p>
        ) : (
          <>
            <Select
              label="Category"
              placeholder="Choose a category"
              options={options.map((c) => ({ value: c._id, label: c.name }))}
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              error={errors.category}
              disabled={Boolean(editing)}
              required
            />

            <Input
              label="Monthly limit"
              type="number"
              min="1"
              step="1"
              prefix={symbol}
              placeholder="5000"
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              error={errors.amount}
              required
            />

            <Textarea
              label="Notes"
              rows={2}
              placeholder="Optional — what is this budget for?"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            />

            <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
              <Button variant="ghost" onClick={onClose} disabled={saving}>
                Cancel
              </Button>
              <Button type="submit" loading={saving}>
                {editing ? 'Save changes' : 'Set budget'}
              </Button>
            </div>
          </>
        )}
      </form>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */

function AiBudgetModal({ open, onClose, period, categories, currency, symbol, onApplied }) {
  const toast = useToast();
  const [target, setTarget] = useState(15000);
  const [suggestion, setSuggestion] = useState(null);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);

  async function generate() {
    setLoading(true);
    setSuggestion(null);
    try {
      setSuggestion(await aiService.suggestBudget(Number(target)));
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function apply() {
    const byName = new Map(categories.map((c) => [c.name.toLowerCase(), c._id]));
    const budgets = suggestion.allocations
      .map((a) => ({ category: byName.get(a.category.toLowerCase()), amount: a.amount }))
      .filter((b) => b.category);

    if (!budgets.length) {
      toast.error('None of the suggested categories matched your account.');
      return;
    }

    setApplying(true);
    try {
      await budgetService.bulkSave({
        month: period.month,
        year: period.year,
        overall: suggestion.totalBudget,
        budgets,
      });
      toast.success(`Applied ${budgets.length} budgets for the month`);
      setSuggestion(null);
      onApplied();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setApplying(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Suggest a budget"
      description="Allocates a target amount across categories based on how you actually spend."
      size="lg"
    >
      <div className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <Input
            label="Total monthly budget"
            type="number"
            min="100"
            step="100"
            prefix={symbol}
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            containerClassName="flex-1"
          />
          <Button icon={Sparkles} loading={loading} onClick={generate} className="sm:mb-0">
            Generate
          </Button>
        </div>

        {suggestion && (
          <div className="animate-fade-in space-y-3">
            {suggestion.notice && (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
                {suggestion.notice}
              </p>
            )}
            {suggestion.rationale && (
              <p className="rounded-lg border border-line bg-canvas px-3 py-2.5 text-sm text-muted">
                {suggestion.rationale}
              </p>
            )}

            <ul className="divide-y divide-line rounded-lg border border-line">
              {suggestion.allocations.map((a) => {
                const cat = categories.find(
                  (c) => c.name.toLowerCase() === a.category.toLowerCase()
                );
                return (
                  <li key={a.category} className="flex items-center gap-3 px-3.5 py-2.5">
                    <CategoryIcon name={cat?.icon} color={cat?.color} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink">{a.category}</p>
                      {a.reason && <p className="truncate text-xs text-faint">{a.reason}</p>}
                    </div>
                    <span className="shrink-0 text-sm font-semibold tabular-nums text-ink">
                      {formatMoney(a.amount, currency)}
                    </span>
                  </li>
                );
              })}
            </ul>

            <div className="flex items-center justify-between rounded-lg bg-canvas px-3.5 py-2.5">
              <span className="text-sm font-medium text-ink">Total</span>
              <span className="text-sm font-semibold tabular-nums text-ink">
                {formatMoney(suggestion.totalBudget, currency)}
              </span>
            </div>

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="ghost" onClick={() => setSuggestion(null)}>
                Discard
              </Button>
              <Button icon={CheckCircle2} loading={applying} onClick={apply}>
                Apply to this month
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
