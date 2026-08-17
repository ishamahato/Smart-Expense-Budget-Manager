import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Filter, Plus, Search, SlidersHorizontal, X } from 'lucide-react';
import { categoryService, expenseService } from '../services';
import {
  useAsync,
  useAuth,
  useConfirm,
  useDebounce,
  useDocumentTitle,
  useToast,
} from '../hooks';
import { formatMoney } from '../utils/format';
import { PAYMENT_METHODS, SORT_OPTIONS } from '../utils/constants';
import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Pagination from '../components/ui/Pagination';
import { Input, Select } from '../components/ui/Field';
import { ErrorState } from '../components/ui/Feedback';
import ExpenseTable from '../components/expenses/ExpenseTable';
import ExpenseForm from '../components/expenses/ExpenseForm';
import cn from '../utils/cn';

const DEFAULT_FILTERS = {
  search: '',
  category: '',
  paymentMethod: '',
  startDate: '',
  endDate: '',
  minAmount: '',
  maxAmount: '',
  sort: 'date:desc',
};

export default function Expenses() {
  useDocumentTitle('Expenses');
  const { currency } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();

  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [page, setPage] = useState(1);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [editing, setEditing] = useState(null);

  const debouncedSearch = useDebounce(filters.search, 350);

  const { data: categories } = useAsync(() => categoryService.list(), []);

  // Only the values the API understands; empty strings are dropped so the
  // query string stays clean and cacheable.
  const query = useMemo(() => {
    const [sortBy, order] = filters.sort.split(':');
    const params = { page, limit: 20, sortBy, order };
    if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
    if (filters.category) params.category = filters.category;
    if (filters.paymentMethod) params.paymentMethod = filters.paymentMethod;
    if (filters.startDate) params.startDate = filters.startDate;
    if (filters.endDate) params.endDate = filters.endDate;
    if (filters.minAmount) params.minAmount = filters.minAmount;
    if (filters.maxAmount) params.maxAmount = filters.maxAmount;
    return params;
  }, [filters, debouncedSearch, page]);

  const { data, loading, error, refetch } = useAsync(
    () => expenseService.list(query),
    [JSON.stringify(query)]
  );

  // Any filter change resets to the first page.
  useEffect(() => {
    setPage(1);
  }, [
    debouncedSearch,
    filters.category,
    filters.paymentMethod,
    filters.startDate,
    filters.endDate,
    filters.minAmount,
    filters.maxAmount,
    filters.sort,
  ]);

  const set = (field) => (e) =>
    setFilters((prev) => ({ ...prev, [field]: e.target.value }));

  const activeFilterCount = useMemo(
    () =>
      ['category', 'paymentMethod', 'startDate', 'endDate', 'minAmount', 'maxAmount'].filter(
        (k) => filters[k]
      ).length,
    [filters]
  );

  const handleDelete = useCallback(
    async (expense) => {
      const ok = await confirm({
        title: 'Delete this expense?',
        message: `${expense.merchant} — ${formatMoney(expense.amount, currency)}. This cannot be undone.`,
        confirmLabel: 'Delete',
      });
      if (!ok) return;

      try {
        await expenseService.remove(expense._id);
        toast.success('Expense deleted');
        refetch();
      } catch (err) {
        toast.error(err.message);
      }
    },
    [confirm, currency, toast, refetch]
  );

  const handleUpdate = useCallback(
    async (payload) => {
      await expenseService.update(editing._id, payload);
      toast.success('Expense updated');
      setEditing(null);
      refetch();
    },
    [editing, toast, refetch]
  );

  const pagination = data?.pagination;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Expenses"
        subtitle={
          pagination
            ? `${pagination.total} transaction${pagination.total === 1 ? '' : 's'} · ${formatMoney(data.filteredTotal, currency)} total`
            : 'Search, filter and manage everything you have recorded.'
        }
        actions={
          <Link
            to="/expenses/new"
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-brand-600 px-4 text-sm font-medium text-white transition hover:bg-brand-700"
          >
            <Plus className="h-4 w-4" />
            Add expense
          </Link>
        }
      />

      {/* Filter bar */}
      <Card className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
            <input
              type="search"
              value={filters.search}
              onChange={set('search')}
              placeholder="Search merchant, note or tag…"
              className="input-base pl-9"
              aria-label="Search expenses"
            />
          </div>

          <Select
            options={SORT_OPTIONS}
            value={filters.sort}
            onChange={set('sort')}
            containerClassName="sm:w-48"
            aria-label="Sort expenses"
          />

          <Button
            variant={showAdvanced || activeFilterCount ? 'subtle' : 'secondary'}
            icon={SlidersHorizontal}
            onClick={() => setShowAdvanced((v) => !v)}
          >
            Filters
            {activeFilterCount > 0 && (
              <span className="ml-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-brand-600 px-1 text-[10px] font-bold text-white">
                {activeFilterCount}
              </span>
            )}
          </Button>
        </div>

        {showAdvanced && (
          <div className="grid gap-3 border-t border-line pt-4 sm:grid-cols-2 lg:grid-cols-3">
            <Select
              label="Category"
              placeholder="All categories"
              options={(categories || []).map((c) => ({ value: c._id, label: c.name }))}
              value={filters.category}
              onChange={set('category')}
            />
            <Select
              label="Payment method"
              placeholder="Any method"
              options={PAYMENT_METHODS}
              value={filters.paymentMethod}
              onChange={set('paymentMethod')}
            />
            <div className="grid grid-cols-2 gap-2">
              <Input
                label="Min amount"
                type="number"
                min="0"
                placeholder="0"
                value={filters.minAmount}
                onChange={set('minAmount')}
              />
              <Input
                label="Max amount"
                type="number"
                min="0"
                placeholder="Any"
                value={filters.maxAmount}
                onChange={set('maxAmount')}
              />
            </div>
            <Input
              label="From date"
              type="date"
              value={filters.startDate}
              onChange={set('startDate')}
            />
            <Input
              label="To date"
              type="date"
              value={filters.endDate}
              onChange={set('endDate')}
            />
            <div className="flex items-end">
              <Button
                variant="ghost"
                icon={X}
                onClick={() => setFilters(DEFAULT_FILTERS)}
                disabled={!activeFilterCount && !filters.search}
                className="w-full sm:w-auto"
              >
                Clear all
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Results */}
      <Card padded={false} className="overflow-hidden">
        {error ? (
          <ErrorState error={error} onRetry={refetch} />
        ) : (
          <>
            <ExpenseTable
              items={data?.items || []}
              loading={loading}
              currency={currency}
              onEdit={setEditing}
              onDelete={handleDelete}
              emptyTitle={
                activeFilterCount || filters.search ? 'No matching expenses' : 'No expenses yet'
              }
              emptyMessage={
                activeFilterCount || filters.search
                  ? 'Try widening your filters or clearing the search.'
                  : 'Add your first expense to start seeing insights.'
              }
              emptyAction={
                activeFilterCount || filters.search ? (
                  <Button variant="secondary" icon={Filter} onClick={() => setFilters(DEFAULT_FILTERS)}>
                    Clear filters
                  </Button>
                ) : undefined
              }
            />

            {pagination && (
              <Pagination
                page={pagination.page}
                pages={pagination.pages}
                total={pagination.total}
                limit={pagination.limit}
                onChange={(p) => {
                  setPage(p);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              />
            )}
          </>
        )}
      </Card>

      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title="Edit expense"
        description="Changes apply immediately to your analytics."
        size="lg"
      >
        <ExpenseForm
          expense={editing}
          categories={categories || []}
          onSubmit={handleUpdate}
          onCancel={() => setEditing(null)}
        />
      </Modal>
    </div>
  );
}
