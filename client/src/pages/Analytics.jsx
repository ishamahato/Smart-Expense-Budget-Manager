import { useMemo, useState } from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  CalendarRange,
  Layers,
  Receipt,
  Store,
  TrendingUp,
} from 'lucide-react';
import { analyticsService } from '../services';
import { useAsync, useAuth, useDocumentTitle } from '../hooks';
import { formatMoney, formatDate } from '../utils/format';
import PageHeader from '../components/ui/PageHeader';
import MonthPicker from '../components/ui/MonthPicker';
import Card, { CardHeader } from '../components/ui/Card';
import StatCard from '../components/dashboard/StatCard';
import CategoryIcon from '../components/ui/CategoryIcon';
import { EmptyState, ErrorState, ProgressBar, SkeletonCard } from '../components/ui/Feedback';
import {
  BudgetBurnChart,
  CategoryBarChart,
  CategoryPieChart,
  ComparisonBarChart,
  DailyBarChart,
  TrendAreaChart,
} from '../components/charts/SpendingCharts';
import cn from '../utils/cn';

const now = new Date();
const RANGES = [3, 6, 12];

export default function Analytics() {
  useDocumentTitle('Analytics');
  const { currency } = useAuth();

  const [period, setPeriod] = useState({ year: now.getFullYear(), month: now.getMonth() + 1 });
  const [months, setMonths] = useState(6);

  const { data: summary, loading: loadingSummary, error: summaryError, refetch } = useAsync(
    () => analyticsService.monthly(period),
    [period.year, period.month]
  );

  const { data: trends, loading: loadingTrends } = useAsync(
    () => analyticsService.trends({ ...period, months }),
    [period.year, period.month, months]
  );

  const { data: merchants, loading: loadingMerchants } = useAsync(
    () => analyticsService.merchants({ ...period, limit: 8 }),
    [period.year, period.month]
  );

  const comparison = trends?.comparison;

  // Only categories with activity in either month are worth charting.
  const comparisonRows = useMemo(
    () =>
      (comparison?.byCategory || [])
        .filter((c) => c.current > 0 || c.previous > 0)
        .slice(0, 8),
    [comparison]
  );

  if (summaryError) return <ErrorState error={summaryError} onRetry={refetch} />;

  const loading = loadingSummary || loadingTrends;
  const hasData = (summary?.totals?.count || 0) > 0;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Analytics"
        subtitle="Every figure below is computed with MongoDB aggregation over your own transactions."
        actions={<MonthPicker year={period.year} month={period.month} onChange={setPeriod} />}
      />

      {/* KPI row */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          loading={loadingSummary}
          label="Total this month"
          value={formatMoney(summary?.totals?.total, currency)}
          icon={BarChart3}
          trend={comparison?.percentChange}
          sublabel={comparison ? `vs ${comparison.previous.label}` : undefined}
        />
        <StatCard
          loading={loadingSummary}
          label="Transactions"
          value={summary?.totals?.count ?? 0}
          icon={Receipt}
          tone="slate"
          sublabel={`Average ${formatMoney(summary?.totals?.average, currency)} each`}
        />
        <StatCard
          loading={loadingTrends}
          label={`${months}-month average`}
          value={formatMoney(trends?.averageMonthly, currency)}
          icon={TrendingUp}
          tone="emerald"
          sublabel={
            trends?.highestMonth
              ? `Peak ${trends.highestMonth.label} · ${formatMoney(trends.highestMonth.total, currency)}`
              : undefined
          }
        />
        <StatCard
          loading={loadingSummary}
          label="Largest expense"
          value={formatMoney(summary?.largestExpense?.amount, currency)}
          icon={Layers}
          tone="amber"
          sublabel={
            summary?.largestExpense
              ? `${summary.largestExpense.merchant} · ${formatDate(summary.largestExpense.date)}`
              : 'Nothing recorded yet'
          }
        />
      </div>

      {!loading && !hasData ? (
        <Card>
          <EmptyState
            icon={BarChart3}
            title="No data for this month"
            message="Pick a different month, or add expenses to see the analysis build up."
          />
        </Card>
      ) : (
        <>
          {/* Trend */}
          <Card>
            <CardHeader
              title="Monthly spending trend"
              subtitle="Totals per month, from a $group over the date field"
              icon={TrendingUp}
              action={
                <div className="inline-flex rounded-lg border border-line p-0.5">
                  {RANGES.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setMonths(r)}
                      className={cn(
                        'rounded-md px-2.5 py-1 text-xs font-medium transition',
                        months === r
                          ? 'bg-brand-600 text-white'
                          : 'text-muted hover:text-ink'
                      )}
                    >
                      {r}M
                    </button>
                  ))}
                </div>
              }
            />
            {loadingTrends ? (
              <div className="skeleton h-[260px] w-full rounded-lg" aria-hidden />
            ) : (
              <TrendAreaChart data={trends?.series || []} currency={currency} height={280} />
            )}
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            {/* Category split */}
            <Card>
              <CardHeader
                title="Category split"
                subtitle={`${summary?.byCategory?.length || 0} categories with activity`}
              />
              {loadingSummary ? (
                <div className="skeleton h-[260px] w-full rounded-lg" aria-hidden />
              ) : (
                <CategoryPieChart data={summary?.byCategory || []} currency={currency} height={280} />
              )}
            </Card>

            {/* Category ranking */}
            <Card>
              <CardHeader title="Category ranking" subtitle="Highest spend first" />
              {loadingSummary ? (
                <div className="skeleton h-[300px] w-full rounded-lg" aria-hidden />
              ) : (
                <CategoryBarChart
                  data={(summary?.byCategory || []).slice(0, 8)}
                  currency={currency}
                />
              )}
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {/* Daily */}
            <Card>
              <CardHeader
                title="Daily spending"
                subtitle={summary?.period?.label}
                icon={CalendarRange}
              />
              {loadingSummary ? (
                <div className="skeleton h-[240px] w-full rounded-lg" aria-hidden />
              ) : (
                <DailyBarChart data={summary?.dailySeries || []} currency={currency} height={260} />
              )}
            </Card>

            {/* Burn-down */}
            <Card>
              <CardHeader
                title="Cumulative spend"
                subtitle="How the month adds up, day by day"
              />
              {loadingSummary ? (
                <div className="skeleton h-[240px] w-full rounded-lg" aria-hidden />
              ) : (
                <BudgetBurnChart
                  data={summary?.dailySeries || []}
                  currency={currency}
                  height={260}
                />
              )}
            </Card>
          </div>

          {/* Month comparison */}
          <Card>
            <CardHeader
              title="This month vs last month"
              subtitle={
                comparison
                  ? `${comparison.current.label} · ${formatMoney(comparison.current.total, currency)}   |   ${comparison.previous.label} · ${formatMoney(comparison.previous.total, currency)}`
                  : undefined
              }
            />

            {comparison && (
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <span
                  className={cn(
                    'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-sm font-medium',
                    comparison.difference > 0
                      ? 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400'
                      : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                  )}
                >
                  {comparison.difference > 0 ? (
                    <ArrowUpRight className="h-4 w-4" />
                  ) : (
                    <ArrowDownRight className="h-4 w-4" />
                  )}
                  {formatMoney(Math.abs(comparison.difference), currency)}
                  {comparison.percentChange !== null && ` (${Math.abs(comparison.percentChange)}%)`}
                </span>
                <span className="text-sm text-muted">
                  {comparison.difference > 0 ? 'more' : 'less'} than {comparison.previous.label}
                </span>
              </div>
            )}

            {loadingTrends ? (
              <div className="skeleton h-[300px] w-full rounded-lg" aria-hidden />
            ) : (
              <ComparisonBarChart
                data={comparisonRows}
                currency={currency}
                labels={{
                  current: comparison?.current?.label,
                  previous: comparison?.previous?.label,
                }}
              />
            )}
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            {/* Merchants */}
            <Card>
              <CardHeader title="Top merchants" subtitle="Where the money goes" icon={Store} />
              {loadingMerchants ? (
                <SkeletonCard lines={6} className="border-0 p-0 shadow-none" />
              ) : !merchants?.items?.length ? (
                <EmptyState compact title="No merchants yet" />
              ) : (
                <ul className="space-y-3">
                  {merchants.items.map((m, i) => {
                    const max = merchants.items[0].total || 1;
                    return (
                      <li key={m.merchant}>
                        <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                          <span className="flex min-w-0 items-center gap-2">
                            <span className="grid h-5 w-5 shrink-0 place-items-center rounded bg-canvas text-[10px] font-bold text-muted">
                              {i + 1}
                            </span>
                            <span className="truncate text-ink">{m.merchant}</span>
                            <span className="shrink-0 text-xs text-faint">×{m.count}</span>
                          </span>
                          <span className="shrink-0 font-medium tabular-nums text-ink">
                            {formatMoney(m.total, currency)}
                          </span>
                        </div>
                        <ProgressBar value={(m.total / max) * 100} className="h-1.5" />
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>

            {/* Category detail table */}
            <Card padded={false}>
              <div className="px-5 pb-3 pt-5">
                <h3 className="text-sm font-semibold text-ink">Category detail</h3>
                <p className="mt-0.5 text-xs text-muted">Share of this month's total spend</p>
              </div>

              {loadingSummary ? (
                <div className="space-y-3 px-5 pb-5" aria-hidden>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="skeleton h-9 w-full rounded-lg" />
                  ))}
                </div>
              ) : !summary?.byCategory?.length ? (
                <EmptyState compact title="No categorised spending" />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-y border-line text-left text-xs uppercase tracking-wide text-faint">
                        <th scope="col" className="px-5 py-2 font-medium">Category</th>
                        <th scope="col" className="px-3 py-2 text-right font-medium">Txns</th>
                        <th scope="col" className="px-3 py-2 text-right font-medium">Share</th>
                        <th scope="col" className="px-5 py-2 text-right font-medium">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {summary.byCategory.map((c) => (
                        <tr key={c.categoryId} className="transition hover:bg-canvas">
                          <td className="px-5 py-2.5">
                            <span className="flex items-center gap-2.5">
                              <CategoryIcon name={c.icon} color={c.color} size="sm" />
                              <span className="truncate font-medium text-ink">{c.name}</span>
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-right tabular-nums text-muted">
                            {c.count}
                          </td>
                          <td className="px-3 py-2.5 text-right tabular-nums text-muted">
                            {c.percentage}%
                          </td>
                          <td className="px-5 py-2.5 text-right font-semibold tabular-nums text-ink">
                            {formatMoney(c.total, currency)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>

          {/* Payment methods */}
          {summary?.byPaymentMethod?.length > 0 && (
            <Card>
              <CardHeader title="Payment methods" subtitle="How you paid this month" />
              <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
                {summary.byPaymentMethod.map((p) => (
                  <div key={p.method} className="rounded-lg border border-line bg-canvas p-3">
                    <p className="text-xs uppercase tracking-wide text-faint">{p.method}</p>
                    <p className="mt-1 text-base font-semibold tabular-nums text-ink">
                      {formatMoney(p.total, currency)}
                    </p>
                    <p className="text-xs text-muted">{p.count} txns</p>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
