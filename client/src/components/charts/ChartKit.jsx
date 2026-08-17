import { useTheme } from '../../hooks';
import { formatMoney } from '../../utils/format';

/**
 * Shared chart chrome. Recharts needs concrete colour values rather than
 * Tailwind classes, so the palette is derived from the active theme here and
 * passed down to each chart.
 */
export function useChartTheme() {
  const { isDark } = useTheme();

  return {
    grid: isDark ? '#1e293b' : '#f1f5f9',
    axis: isDark ? '#64748b' : '#94a3b8',
    tooltipBg: isDark ? 'rgba(17, 24, 39, 0.92)' : 'rgba(255, 255, 255, 0.94)',
    tooltipBorder: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
    tooltipText: isDark ? '#f3f4f6' : '#0f172a',
    brand: '#6366f1',
    brandSecondary: '#818cf8',
    brandSoft: isDark ? 'rgba(99,102,241,0.22)' : 'rgba(99,102,241,0.12)',
    positive: '#10b981',
    negative: '#f43f5e',
    isDark,
  };
}

/** Consistent tooltip across every chart in the app. */
export function ChartTooltip({ active, payload, label, currency = 'INR', labelFormatter, valueLabel }) {
  const theme = useChartTheme();
  if (!active || !payload?.length) return null;

  return (
    <div
      className="rounded-xl border px-3.5 py-2.5 shadow-lift backdrop-blur-md animate-scale-in"
      style={{
        background: theme.tooltipBg,
        borderColor: theme.tooltipBorder,
        color: theme.tooltipText,
      }}
    >
      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted">
        {labelFormatter ? labelFormatter(label, payload) : label}
      </p>
      {payload.map((entry) => (
        <p key={entry.dataKey ?? entry.name} className="flex items-center gap-2 text-sm font-bold font-mono">
          <span
            className="inline-block h-2 w-2 shrink-0 rounded-full shadow-xs"
            style={{ background: entry.color || entry.payload?.fill || theme.brand }}
          />
          <span className="font-sans font-medium text-xs text-muted">
            {valueLabel ? `${valueLabel}: ` : entry.name && payload.length > 1 ? `${entry.name}: ` : ''}
          </span>
          <span>{formatMoney(entry.value, currency)}</span>
        </p>
      ))}
    </div>
  );
}

export function ChartEmpty({ message = 'No data for this period' }) {
  return (
    <div className="flex h-full min-h-[220px] items-center justify-center">
      <p className="text-xs font-medium text-muted">{message}</p>
    </div>
  );
}
