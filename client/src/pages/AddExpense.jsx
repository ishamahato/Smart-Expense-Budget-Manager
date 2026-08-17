import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Loader2, PencilLine, Sparkles, Wand2, Zap } from 'lucide-react';
import { categoryService, expenseService, aiService } from '../services';
import { useAsync, useAuth, useDocumentTitle, useToast } from '../hooks';
import { formatMoney, formatDate, toDateInputValue } from '../utils/format';
import PageHeader from '../components/ui/PageHeader';
import Card, { CardHeader } from '../components/ui/Card';
import Button from '../components/ui/Button';
import ExpenseForm from '../components/expenses/ExpenseForm';
import CategoryIcon from '../components/ui/CategoryIcon';
import { Badge } from '../components/ui/Feedback';
import cn from '../utils/cn';

const EXAMPLES = [
  'paid 450 to dominos yesterday',
  'spent 850 on Uber today',
  '1200 electricity bill via netbanking',
  '2500 at Amazon last friday by card',
];

export default function AddExpense() {
  useDocumentTitle('Add expense');
  const navigate = useNavigate();
  const toast = useToast();
  const { currency } = useAuth();

  const [mode, setMode] = useState('natural'); // 'natural' | 'form'
  const [text, setText] = useState('');
  const [parsing, setParsing] = useState(false);
  const [draft, setDraft] = useState(null);
  const [notice, setNotice] = useState(null);

  const { data: categories } = useAsync(() => categoryService.list(), []);

  async function handleParse(e) {
    e?.preventDefault();
    if (text.trim().length < 3) return;

    setParsing(true);
    setDraft(null);
    setNotice(null);
    try {
      const parsed = await aiService.parseExpense(text.trim());
      // Map the category NAME the model returned onto the user's own category id.
      const match = (categories || []).find(
        (c) => c.name.toLowerCase() === String(parsed.category).toLowerCase()
      );
      setDraft({ ...parsed, categoryId: match?._id || '', categoryName: match?.name || parsed.category });
      if (parsed.notice) setNotice(parsed.notice);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setParsing(false);
    }
  }

  async function saveDraft() {
    if (!draft?.categoryId || !draft.amount || !draft.merchant) {
      toast.warning('Fill in the missing fields before saving.');
      return;
    }
    try {
      await expenseService.create({
        amount: draft.amount,
        merchant: draft.merchant,
        category: draft.categoryId,
        description: draft.description || '',
        date: draft.date,
        paymentMethod: draft.paymentMethod,
        isRecurring: draft.isRecurring,
      });
      toast.success('Expense added');
      navigate('/expenses');
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function handleFormSubmit(payload) {
    await expenseService.create(payload);
    toast.success('Expense added');
    navigate('/expenses');
  }

  const category = (categories || []).find((c) => c._id === draft?.categoryId);

  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-fade-in">
      <PageHeader
        title="Add an expense"
        subtitle="Type naturally with AI extraction, or use the manual form."
        actions={
          <Button variant="ghost" icon={ArrowLeft} onClick={() => navigate(-1)}>
            Back
          </Button>
        }
      />

      {/* Mode switch */}
      <div className="inline-flex rounded-2xl border border-line bg-surface p-1.5 shadow-xs">
        {[
          { key: 'natural', label: 'AI Natural Language', icon: Sparkles },
          { key: 'form', label: 'Manual Form', icon: PencilLine },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setMode(key)}
            className={cn(
              'inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-150',
              mode === key
                ? 'bg-gradient-to-r from-brand-600 to-indigo-600 text-white shadow-sm'
                : 'text-muted hover:text-ink hover:bg-slate-100 dark:hover:bg-slate-800'
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {mode === 'natural' ? (
        <>
          <Card className="border-brand-200/80 dark:border-brand-500/20">
            <CardHeader
              title="Describe the transaction"
              subtitle="The assistant extracts merchant, amount, category and date for you to confirm."
              icon={Wand2}
            />

            <form onSubmit={handleParse} className="space-y-4">
              <div className="flex flex-col gap-2.5 sm:flex-row">
                <input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="e.g. paid 450 to dominos yesterday by upi"
                  className="input-base flex-1 rounded-xl"
                  aria-label="Describe the expense"
                />
                <Button
                  type="submit"
                  icon={parsing ? undefined : Sparkles}
                  loading={parsing}
                  disabled={text.trim().length < 3}
                  className="rounded-xl"
                >
                  Extract with AI
                </Button>
              </div>

              <div>
                <p className="text-xs font-semibold text-muted mb-2">Try an example:</p>
                <div className="flex flex-wrap gap-2">
                  {EXAMPLES.map((ex) => (
                    <button
                      key={ex}
                      type="button"
                      onClick={() => setText(ex)}
                      className="rounded-xl border border-line bg-canvas px-3 py-1.5 text-xs font-medium text-muted transition hover:border-brand-400 hover:text-brand-600 dark:hover:border-brand-500/40 dark:hover:text-brand-300"
                    >
                      {ex}
                    </button>
                  ))}
                </div>
              </div>
            </form>
          </Card>

          {parsing && (
            <Card className="flex items-center gap-3.5 animate-fade-in p-5">
              <Loader2 className="h-5 w-5 animate-spin text-brand-600" />
              <p className="text-sm font-medium text-muted">Analyzing transaction details with AI…</p>
            </Card>
          )}

          {draft && (
            <Card className="animate-scale-in border-brand-300 dark:border-brand-500/40 shadow-card">
              <CardHeader
                title="Verify Extracted Details"
                subtitle="Review and edit any field before saving to your ledger."
                action={
                  <Badge tone={draft.confidence > 0.7 ? 'success' : 'warning'} dot>
                    {Math.round((draft.confidence || 0) * 100)}% confidence
                  </Badge>
                }
              />

              {notice && (
                <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
                  {notice}
                </p>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-1.5">
                  <span className="text-xs font-semibold text-muted">Amount ({currency})</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={draft.amount ?? ''}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, amount: Number(e.target.value) || null }))
                    }
                    className={cn('input-base rounded-xl font-mono font-semibold', !draft.amount && 'border-amber-400')}
                    placeholder="0.00"
                  />
                </label>

                <label className="space-y-1.5">
                  <span className="text-xs font-semibold text-muted">Merchant</span>
                  <input
                    value={draft.merchant ?? ''}
                    onChange={(e) => setDraft((d) => ({ ...d, merchant: e.target.value }))}
                    className={cn('input-base rounded-xl', !draft.merchant && 'border-amber-400')}
                    placeholder="Merchant name"
                  />
                </label>

                <label className="space-y-1.5">
                  <span className="text-xs font-semibold text-muted">Category</span>
                  <select
                    value={draft.categoryId}
                    onChange={(e) => setDraft((d) => ({ ...d, categoryId: e.target.value }))}
                    className="input-base rounded-xl"
                  >
                    <option value="">Select a category</option>
                    {(categories || []).map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-1.5">
                  <span className="text-xs font-semibold text-muted">Date</span>
                  <input
                    type="date"
                    value={toDateInputValue(draft.date)}
                    max={toDateInputValue(new Date())}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        date: new Date(`${e.target.value}T12:00:00`).toISOString(),
                      }))
                    }
                    className="input-base rounded-xl"
                  />
                </label>
              </div>

              <div className="mt-5 flex items-center gap-3.5 rounded-2xl border border-line bg-canvas p-4 shadow-xs">
                <CategoryIcon name={category?.icon} color={category?.color} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-ink">
                    {draft.merchant || 'Unknown merchant'}
                  </p>
                  <p className="truncate text-xs text-muted">
                    {category?.name || draft.categoryName} · {formatDate(draft.date)} ·{' '}
                    {draft.paymentMethod?.toUpperCase()}
                  </p>
                </div>
                <span className="shrink-0 text-xl font-bold font-mono tabular-nums text-ink">
                  {draft.amount ? formatMoney(draft.amount, currency) : '—'}
                </span>
              </div>

              <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button variant="ghost" onClick={() => setDraft(null)}>
                  Discard
                </Button>
                <Button icon={Check} onClick={saveDraft}>
                  Save Expense
                </Button>
              </div>
            </Card>
          )}
        </>
      ) : (
        <Card>
          <CardHeader title="Expense details" subtitle="All fields marked with * are required." />
          <ExpenseForm
            categories={categories || []}
            onSubmit={handleFormSubmit}
            onCancel={() => navigate('/expenses')}
          />
        </Card>
      )}
    </div>
  );
}
