import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ChartEmpty, ChartTooltip, useChartTheme } from './ChartKit';
import { formatCompact, formatMoney } from '../../utils/format';
import { CHART_COLORS } from '../../utils/constants';

const AXIS_PROPS = (theme) => ({
  stroke: theme.axis,
  tick: { fontSize: 11, fill: theme.axis },
  tickLine: false,
  axisLine: false,
});

/** Month-over-month totals. */
export function TrendAreaChart({ data = [], currency = 'INR', height = 260 }) {
  const theme = useChartTheme();
  if (!data.length) return <ChartEmpty />;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={theme.brand} stopOpacity={0.35} />
            <stop offset="100%" stopColor={theme.brand} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={theme.grid} vertical={false} />
        <XAxis dataKey="label" {...AXIS_PROPS(theme)} />
        <YAxis
          {...AXIS_PROPS(theme)}
          width={54}
          tickFormatter={(v) => formatCompact(v, currency)}
        />
        <Tooltip content={<ChartTooltip currency={currency} valueLabel="Spent" />} />
        <Area
          type="monotone"
          dataKey="total"
          name="Spent"
          stroke={theme.brand}
          strokeWidth={2.5}
          fill="url(#trendFill)"
          dot={{ r: 3, fill: theme.brand, strokeWidth: 0 }}
          activeDot={{ r: 5 }}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/** Daily spend inside a single month. */
export function DailyBarChart({ data = [], currency = 'INR', height = 240 }) {
  const theme = useChartTheme();
  if (!data.length) return <ChartEmpty />;

  const hasSpend = data.some((d) => d.total > 0);
  if (!hasSpend) return <ChartEmpty message="No spending recorded this month yet" />;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={theme.grid} vertical={false} />
        <XAxis
          dataKey="day"
          {...AXIS_PROPS(theme)}
          interval={data.length > 20 ? 3 : 1}
        />
        <YAxis
          {...AXIS_PROPS(theme)}
          width={54}
          tickFormatter={(v) => formatCompact(v, currency)}
        />
        <Tooltip
          cursor={{ fill: theme.brandSoft }}
          content={
            <ChartTooltip
              currency={currency}
              valueLabel="Spent"
              labelFormatter={(label) => `Day ${label}`}
            />
          }
        />
        <Bar
          dataKey="total"
          name="Spent"
          fill={theme.brand}
          radius={[4, 4, 0, 0]}
          maxBarSize={26}
          isAnimationActive={false}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Category split. `donut` leaves room for a total in the middle. */
export function CategoryPieChart({ data = [], currency = 'INR', height = 260, showLegend = true }) {
  const theme = useChartTheme();
  if (!data.length) return <ChartEmpty message="No categorised spending yet" />;

  const total = data.reduce((sum, d) => sum + d.total, 0);

  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={data}
            dataKey="total"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius="58%"
            outerRadius="82%"
            paddingAngle={2}
            stroke="none"
            isAnimationActive={false}
          >
            {data.map((entry, i) => (
              <Cell key={entry.categoryId || entry.name} fill={entry.color || CHART_COLORS[i % CHART_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip content={<ChartTooltip currency={currency} />} />
          {showLegend && (
            <Legend
              verticalAlign="bottom"
              height={36}
              iconType="circle"
              iconSize={8}
              formatter={(value) => (
                <span style={{ color: theme.axis, fontSize: 12 }}>{value}</span>
              )}
            />
          )}
        </PieChart>
      </ResponsiveContainer>

      <div
        className="pointer-events-none absolute inset-x-0 flex flex-col items-center"
        style={{ top: showLegend ? '38%' : '44%', transform: 'translateY(-50%)' }}
      >
        <span className="text-xs text-faint">Total</span>
        <span className="text-lg font-semibold text-ink">{formatMoney(total, currency)}</span>
      </div>
    </div>
  );
}

/** Horizontal category ranking — easier to read than a pie for many rows. */
export function CategoryBarChart({ data = [], currency = 'INR', height = 300 }) {
  const theme = useChartTheme();
  if (!data.length) return <ChartEmpty />;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 4, right: 16, left: 8, bottom: 4 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke={theme.grid} horizontal={false} />
        <XAxis
          type="number"
          {...AXIS_PROPS(theme)}
          tickFormatter={(v) => formatCompact(v, currency)}
        />
        <YAxis
          type="category"
          dataKey="name"
          {...AXIS_PROPS(theme)}
          width={92}
        />
        <Tooltip cursor={{ fill: theme.brandSoft }} content={<ChartTooltip currency={currency} valueLabel="Spent" />} />
        <Bar
          dataKey="total"
          name="Spent"
          radius={[0, 4, 4, 0]}
          maxBarSize={22}
          isAnimationActive={false}
        >
          {data.map((entry, i) => (
            <Cell key={entry.categoryId || entry.name} fill={entry.color || CHART_COLORS[i % CHART_COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Current vs previous month, per category. */
export function ComparisonBarChart({ data = [], currency = 'INR', height = 300, labels }) {
  const theme = useChartTheme();
  if (!data.length) return <ChartEmpty message="Not enough history to compare" />;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={theme.grid} vertical={false} />
        <XAxis dataKey="name" {...AXIS_PROPS(theme)} interval={0} angle={-25} textAnchor="end" height={58} />
        <YAxis {...AXIS_PROPS(theme)} width={54} tickFormatter={(v) => formatCompact(v, currency)} />
        <Tooltip cursor={{ fill: theme.brandSoft }} content={<ChartTooltip currency={currency} />} />
        <Legend
          iconType="circle"
          iconSize={8}
          formatter={(value) => <span style={{ color: theme.axis, fontSize: 12 }}>{value}</span>}
        />
        <Bar
          dataKey="previous"
          name={labels?.previous || 'Previous'}
          fill={theme.isDark ? '#475569' : '#cbd5e1'}
          radius={[4, 4, 0, 0]}
          maxBarSize={24}
          isAnimationActive={false}
        />
        <Bar
          dataKey="current"
          name={labels?.current || 'Current'}
          fill={theme.brand}
          radius={[4, 4, 0, 0]}
          maxBarSize={24}
          isAnimationActive={false}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Cumulative spend through the month against the budget cap. */
export function BudgetBurnChart({ data = [], budget = 0, currency = 'INR', height = 260 }) {
  const theme = useChartTheme();
  if (!data.length) return <ChartEmpty />;

  let running = 0;
  const series = data.map((d) => {
    running += d.total;
    return { ...d, cumulative: Math.round(running * 100) / 100, budget };
  });

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={theme.grid} vertical={false} />
        <XAxis dataKey="day" {...AXIS_PROPS(theme)} interval={data.length > 20 ? 3 : 1} />
        <YAxis {...AXIS_PROPS(theme)} width={54} tickFormatter={(v) => formatCompact(v, currency)} />
        <Tooltip
          content={
            <ChartTooltip currency={currency} labelFormatter={(label) => `Day ${label}`} />
          }
        />
        <Legend
          iconType="plainline"
          iconSize={14}
          formatter={(value) => <span style={{ color: theme.axis, fontSize: 12 }}>{value}</span>}
        />
        {budget > 0 && (
          <Line
            type="monotone"
            dataKey="budget"
            name="Budget"
            stroke={theme.negative}
            strokeWidth={1.5}
            strokeDasharray="6 4"
            dot={false}
            isAnimationActive={false}
          />
        )}
        <Line
          type="monotone"
          dataKey="cumulative"
          name="Spent to date"
          stroke={theme.brand}
          strokeWidth={2.5}
          dot={false}
          activeDot={{ r: 5 }}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
