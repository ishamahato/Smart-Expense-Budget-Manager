import { useCallback, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CalendarDays,
  Clock,
  PiggyBank,
  RefreshCw,
  Sparkles,
  TrendingUp,
  Trophy,
  Wallet,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { analyticsService, recurringService } from '../services';
import { useAsync, useAuth, useDocumentTitle, useToast } from '../hooks';
import { formatMoney, formatRelativeDate } from '../utils/format';
import { BUDGET_STATUS } from '../utils/constants';
import PageHeader from '../components/ui/PageHeader';
import MonthPicker from '../components/ui/MonthPicker';
import Card, { CardHeader } from '../components/ui/Card';
import Button from '../components/ui/Button';
import StatCard from '../components/dashboard/StatCard';
import CategoryIcon from '../components/ui/CategoryIcon';
import { Badge, EmptyState, ErrorState, ProgressBar, SkeletonCard } from '../components/ui/Feedback';
import {
  CategoryPieChart,
  DailyBarChart,
  TrendAreaChart,
} from '../components/charts/SpendingCharts';
import cn from '../utils/cn';

const now = new Date();

export default function Dashboard() {
  useDocumentTitle('Dashboard');
  const { user, currency } = useAuth();
  const toast = useToast();

  const [period, setPeriod] = useState({
    year: now.getFullYear(),
    month: now.getMonth() + 1,
  });

  const { data, loading, error, refetch } = useAsync(
    () => analyticsService.dashboard(period),
    [period.year, period.month]
  );

  const summary = data?.summary;
  const budget = data?.budget;
  const trends = data?.trends;

  // Show the top 5 individually and roll the rest into "Other categories", so
  // the donut's centre total always equals the month total shown above it.
  const pieCategories = useMemo(() => {
    const all = summary?.byCategory || [];
    if (all.length <= 6) return all;

    const head = all.slice(0, 5);
    const tail = all.slice(5);
    return [
      ...head,
      {
        categoryId: 'other-grouped',
        name: `${tail.length} more`,
        color: '#94a3b8',
        total: Math.round(tail.reduce((sum, c) => sum + c.total, 0) * 100) / 100,
        count: tail.reduce((sum, c) => sum + c.count, 0),
      },
    ];
  }, [summary]);

  const postRecurring = useCallback(
    async (item) => {
      try {
        await recurringService.postNow(item._id);
        toast.success(`Recorded ${item.merchant}`);
        refetch();
      } catch (err) {
        toast.error(err.message);
      }
    },
    [toast, refetch]
  );

  if (error) {
    return <ErrorState error={error} onRetry={refetch} title="Could not load your dashboard" />;
  }

  const percentChange = trends?.comparison?.percentChange;
  const budgetStatus = BUDGET_STATUS[budget?.overall?.status] || BUDGET_STATUS['on-track'];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title={`${greeting()}, ${user?.name?.split(' ')[0] || 'there'}`}
        subtitle={
          loading
            ? 'Crunching your financial data…'
            : `Here is your financial pulse for ${summary?.period?.label || 'this month'}.`
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <MonthPicker year={period.year} month={period.month} onChange={setPeriod} />
            <Button variant="secondary" icon={RefreshCw} onClick={refetch} disabled={loading}>
              Refresh
            </Button>
          </div>
        }
      />

      {/* Budget alerts */}
      {!loading && data?.alerts?.length > 0 && (
        <div className="space-y-2.5">
          {data.alerts.slice(0, 2).map((alert) => (
            <div
              key={alert.id}
              className={cn(
                'flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-4.5 py-3 text-sm shadow-xs transition',
                alert.level === 'danger'
                  ? 'border-rose-200 bg-gradient-to-r from-rose-50 to-red-50/50 text-rose-800 dark:border-rose-500/30 dark:from-rose-500/10 dark:to-transparent dark:text-rose-300'
                  : 'border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50/50 text-amber-800 dark:border-amber-500/30 dark:from-amber-500/10 dark:to-transparent dark:text-amber-300'
              )}
            >
              <div className="flex items-center gap-2.5">
                <AlertTriangle className="h-4.5 w-4.5 shrink-0" />
                <span className="font-medium">{alert.message}</span>
              </div>
              <Link
                to="/budgets"
                className="inline-flex items-center gap-1 text-xs font-bold underline-offset-4 hover:underline"
              >
                Review budgets <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          ))}
        </div>
      )}

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          loading={loading}
          label="Spent this month"
          value={formatMoney(summary?.totals?.total, currency)}
          icon={Wallet}
          tone="brand"
          trend={percentChange}
          sublabel={
            trends?.comparison
              ? `vs ${formatMoney(trends.comparison.previous.total, currency)} in ${trends.comparison.previous.label}`
              : undefined
          }
        />
        <StatCard
          loading={loading}
          label="Spent today"
          value={formatMoney(summary?.today?.total, currency)}
          icon={Clock}
          tone="amber"
          sublabel={`${summary?.today?.count || 0} transaction${summary?.today?.count === 1 ? '' : 's'}`}
        />
        <StatCard
          loading={loading}
          label="Budget remaining"
          value={
            budget?.overall?.amount
              ? formatMoney(Math.max(budget.overall.remaining, 0), currency)
              : '—'
          }
          icon={PiggyBank}
          tone={budget?.overall?.status === 'exceeded' ? 'rose' : 'emerald'}
          sublabel={
            budget?.overall?.amount
              ? `${budget.overall.percentage}% of ${formatMoney(budget.overall.amount, currency)} used`
              : 'No budget set for this month'
          }
        />
        <StatCard
          loading={loading}
          label="Top category"
          value={summary?.topCategory?.name || '—'}
          icon={Trophy}
          tone="slate"
          sublabel={
            summary?.topCategory
              ? `${formatMoney(summary.topCategory.total, currency)} · ${summary.topCategory.percentage}% of spend`
              : 'No spending recorded yet'
          }
        />
      </div>

      {/* Charts */}
      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Spending trend"
            subtitle={`Last ${trends?.series?.length || 6} months · average ${formatMoney(trends?.averageMonthly, currency)}`}
            icon={TrendingUp}
            action={
              <Link
                to="/analytics"
                className="text-xs font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300 transition"
              >
                Full analytics &rarr;
              </Link>
            }
          />
          {loading ? (
            <div className="skeleton h-[260px] w-full rounded-xl" aria-hidden />
          ) : (
            <TrendAreaChart data={trends?.series || []} currency={currency} />
          )}
        </Card>

        <Card>
          <CardHeader title="Where it went" subtitle="Category split this month" />
          {loading ? (
            <div className="skeleton h-[260px] w-full rounded-xl" aria-hidden />
          ) : (
            <CategoryPieChart data={pieCategories} currency={currency} />
          )}
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Daily spending"
            subtitle={summary?.period?.label}
            icon={CalendarDays}
          />
          {loading ? (
            <div className="skeleton h-[240px] w-full rounded-xl" aria-hidden />
          ) : (
            <DailyBarChart data={summary?.dailySeries || []} currency={currency} />
          )}
        </Card>

        {/* Budget progress */}
        <Card>
          <CardHeader
            title="Budget progress"
            subtitle={
              budget?.overall?.amount
                ? `${formatMoney(budget.overall.spent, currency)} of ${formatMoney(budget.overall.amount, currency)}`
                : 'Not set up yet'
            }
            action={
              <Link
                to="/budgets"
                className="text-xs font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400"
              >
                Manage &rarr;
              </Link>
            }
          />

          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="skeleton h-3 w-2/3" />
                  <div className="skeleton h-2.5 w-full" />
                </div>
              ))}
            </div>
          ) : !budget?.categories?.length ? (
            <EmptyState
              compact
              icon={PiggyBank}
              title="No budgets yet"
              message="Set monthly limits to get early warnings before you overspend."
              action={
                <Link
                  to="/budgets"
                  className="inline-flex h-9 items-center rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:from-brand-500 hover:to-indigo-500"
                >
                  Create budgets
                </Link>
              }
            />
          ) : (
            <>
              <div className="mb-4 rounded-xl border border-line bg-canvas p-3.5 shadow-xs">
                <div className="mb-2 flex items-center justify-between text-xs">
                  <span className="font-semibold text-ink">Overall Budget</span>
                  <span className={cn('font-bold font-mono', budgetStatus.text)}>{budget.overall.percentage}%</span>
                </div>
                <ProgressBar
                  value={budget.overall.percentage}
                  barClassName={budgetStatus.bar}
                  label="Overall budget used"
                />
              </div>

              <ul className="space-y-3">
                {budget.categories.slice(0, 5).map((c) => {
                  const status = BUDGET_STATUS[c.status];
                  return (
                    <li key={c._id} className="group">
                      <div className="mb-1.5 flex items-center justify-between gap-2 text-xs">
                        <span className="flex min-w-0 items-center gap-2">
                          <span
                            className="h-2.5 w-2.5 shrink-0 rounded-full shadow-xs"
                            style={{ background: c.color }}
                          />
                          <span className="truncate font-medium text-ink">{c.name}</span>
                        </span>
                        <span className="shrink-0 font-mono tabular-nums text-muted">
                          {formatMoney(c.spent, currency)} / {formatMoney(c.amount, currency)}
                        </span>
                      </div>
                      <ProgressBar
                        value={c.percentage}
                        barClassName={status.bar}
                        label={`${c.name} budget used`}
                      />
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </Card>
      </div>

      {/* Recent + pending */}
      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2" padded={false}>
          <div className="flex items-center justify-between px-6 pb-3.5 pt-6">
            <div>
              <h3 className="text-sm font-bold tracking-tight text-ink">Recent transactions</h3>
              <p className="mt-0.5 text-xs text-muted">Your latest spending activity</p>
            </div>
            <Link
              to="/expenses"
              className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400"
            >
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {loading ? (
            <div className="space-y-3 p-6" aria-hidden>
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="skeleton h-12 w-full rounded-xl" />
              ))}
            </div>
          ) : !data?.recentExpenses?.length ? (
            <EmptyState
              compact
              title="No transactions yet"
              message="Add your first expense and it will show up here."
              action={
                <Link
                  to="/expenses/new"
                  className="inline-flex h-9 items-center rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:from-brand-500 hover:to-indigo-500"
                >
                  Add expense
                </Link>
              }
            />
          ) : (
            <ul className="divide-y divide-line/70 border-t border-line/70">
              {data.recentExpenses.map((e) => (
                <li key={e._id} className="flex items-center gap-3.5 px-6 py-3.5 transition hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                  <CategoryIcon name={e.category?.icon} color={e.category?.color} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink">{e.merchant}</p>
                    <p className="truncate text-xs text-muted">
                      {e.category?.name || 'Uncategorised'} · {formatRelativeDate(e.date)}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-bold font-mono tabular-nums text-ink">
                    {formatMoney(e.amount, currency)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <div className="space-y-5">
          {/* Recurring due for confirmation */}
          {!loading && data?.pendingRecurring?.length > 0 && (
            <Card>
              <CardHeader
                title="Waiting for confirmation"
                subtitle="Recurring payments that are due"
              />
              <ul className="space-y-2.5">
                {data.pendingRecurring.map((item) => (
                  <li
                    key={item._id}
                    className="flex items-center gap-3 rounded-xl border border-line p-3"
                  >
                    <CategoryIcon
                      name={item.category?.icon}
                      color={item.category?.color}
                      size="sm"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-ink">{item.merchant}</p>
                      <p className="text-xs text-muted">
                        {formatMoney(item.amount, currency)} · due{' '}
                        {formatRelativeDate(item.nextDueDate)}
                      </p>
                    </div>
                    <Button size="sm" variant="subtle" onClick={() => postRecurring(item)}>
                      Record
                    </Button>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {/* AI teaser */}
          <Card className="border-brand-200/80 bg-gradient-to-br from-brand-50/80 via-surface to-indigo-50/40 dark:border-brand-500/25 dark:from-brand-500/10 dark:via-surface dark:to-indigo-500/5 shadow-sm">
            <div className="flex items-start gap-3.5">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-600 text-white shadow-md shadow-brand-500/25">
                <Sparkles className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <h3 className="text-sm font-bold tracking-tight text-ink">Ask about your money</h3>
                <p className="mt-1 text-xs sm:text-sm text-muted leading-relaxed">
                  “Where did I overspend this month?” — answered from your own
                  transactions with Gemini AI.
                </p>
                <Link
                  to="/assistant"
                  className="mt-3.5 inline-flex h-9 items-center gap-1.5 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 px-4 text-xs font-bold uppercase tracking-wider text-white shadow-sm transition hover:from-brand-500 hover:to-indigo-500"
                >
                  Open assistant <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </Card>

          {/* Top merchants */}
          {loading ? (
            <SkeletonCard lines={5} />
          ) : summary?.topMerchants?.length ? (
            <Card>
              <CardHeader title="Most-used merchants" subtitle="This month" />
              <ul className="space-y-3">
                {summary.topMerchants.map((m, i) => (
                  <li key={m.merchant} className="flex items-center gap-3">
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-canvas text-xs font-bold text-muted border border-line">
                      {i + 1}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">{m.merchant}</span>
                    <span className="shrink-0 text-xs text-muted">×{m.count}</span>
                    <span className="shrink-0 text-sm font-bold font-mono tabular-nums text-ink">
                      {formatMoney(m.total, currency)}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}
