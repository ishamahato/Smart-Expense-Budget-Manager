import { useEffect, useMemo, useState } from 'react';
import { Save } from 'lucide-react';
import Button from '../ui/Button';
import { Input, Select, Textarea, Toggle } from '../ui/Field';
import { PAYMENT_METHODS } from '../../utils/constants';
import { currencyMeta, toDateInputValue } from '../../utils/format';
import { useAuth } from '../../hooks';

const blank = {
  amount: '',
  merchant: '',
  category: '',
  description: '',
  date: toDateInputValue(new Date()),
  paymentMethod: 'upi',
  isRecurring: false,
};

/**
 * Shared create/edit form. `expense` switches it to edit mode; `initial`
 * pre-fills a draft (used by the AI natural-language flow).
 */
export default function ExpenseForm({
  expense = null,
  initial = null,
  categories = [],
  onSubmit,
  onCancel,
  submitLabel,
  compact = false,
}) {
  const { currency } = useAuth();
  const { symbol } = currencyMeta(currency);

  const [form, setForm] = useState(blank);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const categoryOptions = useMemo(
    () => categories.map((c) => ({ value: c._id, label: c.name })),
    [categories]
  );

  useEffect(() => {
    const source = expense || initial;
    if (source) {
      setForm({
        amount: source.amount ?? '',
        merchant: source.merchant ?? '',
        category: source.category?._id || source.category || '',
        description: source.description ?? '',
        date: toDateInputValue(source.date || new Date()),
        paymentMethod: source.paymentMethod || 'upi',
        isRecurring: Boolean(source.isRecurring),
      });
    } else {
      setForm((prev) => ({ ...blank, category: prev.category }));
    }
    setErrors({});
  }, [expense, initial]);

  // Default to the first category once they load.
  useEffect(() => {
    if (!form.category && categories.length) {
      setForm((prev) => ({ ...prev, category: prev.category || categories[0]._id }));
    }
  }, [categories, form.category]);

  const set = (field) => (e) => {
    const value = e?.target ? e.target.value : e;
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined, form: undefined }));
  };

  function validate() {
    const next = {};
    const amount = Number(form.amount);
    if (!form.amount || Number.isNaN(amount) || amount <= 0) {
      next.amount = 'Enter an amount greater than zero';
    }
    if (!form.merchant.trim()) next.merchant = 'Who was this paid to?';
    if (!form.category) next.category = 'Pick a category';
    if (!form.date) next.date = 'Pick a date';
    else if (new Date(form.date) > new Date()) next.date = 'Date cannot be in the future';

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      await onSubmit({
        amount: Number(form.amount),
        merchant: form.merchant.trim(),
        category: form.category,
        description: form.description.trim(),
        // Midday avoids the date shifting a day either way across timezones.
        date: new Date(`${form.date}T12:00:00`).toISOString(),
        paymentMethod: form.paymentMethod,
        isRecurring: form.isRecurring,
      });
    } catch (err) {
      if (err.fieldErrors?.length) {
        const mapped = {};
        err.fieldErrors.forEach((fe) => {
          mapped[fe.field] = fe.message;
        });
        setErrors({ ...mapped, form: err.message });
      } else {
        setErrors({ form: err.message });
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {errors.form && (
        <div
          role="alert"
          className="rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300"
        >
          {errors.form}
        </div>
      )}

      <div className={compact ? 'space-y-4' : 'grid gap-4 sm:grid-cols-2'}>
        <Input
          label="Amount"
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0"
          placeholder="450"
          prefix={symbol}
          value={form.amount}
          onChange={set('amount')}
          error={errors.amount}
          required
        />
        <Input
          label="Merchant"
          placeholder="Swiggy"
          value={form.merchant}
          onChange={set('merchant')}
          error={errors.merchant}
          required
        />
      </div>

      <div className={compact ? 'space-y-4' : 'grid gap-4 sm:grid-cols-2'}>
        <Select
          label="Category"
          options={categoryOptions}
          placeholder={categories.length ? undefined : 'Loading…'}
          value={form.category}
          onChange={set('category')}
          error={errors.category}
          required
        />
        <Input
          label="Date"
          type="date"
          max={toDateInputValue(new Date())}
          value={form.date}
          onChange={set('date')}
          error={errors.date}
          required
        />
      </div>

      <Select
        label="Payment method"
        options={PAYMENT_METHODS}
        value={form.paymentMethod}
        onChange={set('paymentMethod')}
      />

      <Textarea
        label="Notes"
        placeholder="Optional — what was this for?"
        value={form.description}
        onChange={set('description')}
        error={errors.description}
        rows={2}
      />

      <div className="rounded-lg border border-line bg-canvas p-3.5">
        <Toggle
          checked={form.isRecurring}
          onChange={set('isRecurring')}
          label="Mark as a recurring payment"
          description="Tags this transaction. To have it post automatically, add it on the Recurring page."
        />
      </div>

      <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
        {onCancel && (
          <Button variant="ghost" onClick={onCancel} disabled={submitting}>
            Cancel
          </Button>
        )}
        <Button type="submit" icon={Save} loading={submitting}>
          {submitLabel || (expense ? 'Save changes' : 'Add expense')}
        </Button>
      </div>
    </form>
  );
}
