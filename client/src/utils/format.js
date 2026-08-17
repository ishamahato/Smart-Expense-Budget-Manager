const CURRENCY_META = {
  INR: { symbol: '₹', locale: 'en-IN' },
  USD: { symbol: '$', locale: 'en-US' },
  EUR: { symbol: '€', locale: 'de-DE' },
  GBP: { symbol: '£', locale: 'en-GB' },
  AED: { symbol: 'AED ', locale: 'en-AE' },
  SGD: { symbol: 'S$', locale: 'en-SG' },
  AUD: { symbol: 'A$', locale: 'en-AU' },
  CAD: { symbol: 'C$', locale: 'en-CA' },
  JPY: { symbol: '¥', locale: 'ja-JP' },
};

export function currencyMeta(currency = 'INR') {
  return CURRENCY_META[currency] || CURRENCY_META.INR;
}

/** ₹1,20,450 — no decimals by default, since budgets are whole-rupee. */
export function formatMoney(amount, currency = 'INR', { decimals = 0 } = {}) {
  const { symbol, locale } = currencyMeta(currency);
  const value = Number(amount) || 0;
  return `${symbol}${value.toLocaleString(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

/** Compact form for chart axes: ₹1.2L, ₹45k. */
export function formatCompact(amount, currency = 'INR') {
  const { symbol } = currencyMeta(currency);
  const value = Number(amount) || 0;
  const abs = Math.abs(value);

  if (currency === 'INR') {
    if (abs >= 10000000) return `${symbol}${(value / 10000000).toFixed(1)}Cr`;
    if (abs >= 100000) return `${symbol}${(value / 100000).toFixed(1)}L`;
    if (abs >= 1000) return `${symbol}${(value / 1000).toFixed(abs >= 10000 ? 0 : 1)}k`;
    return `${symbol}${Math.round(value)}`;
  }
  if (abs >= 1000000) return `${symbol}${(value / 1000000).toFixed(1)}M`;
  if (abs >= 1000) return `${symbol}${(value / 1000).toFixed(abs >= 10000 ? 0 : 1)}k`;
  return `${symbol}${Math.round(value)}`;
}

export function formatPercent(value, decimals = 0) {
  return `${(Number(value) || 0).toFixed(decimals)}%`;
}

const DATE_FMT = new Intl.DateTimeFormat('en-IN', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});
const SHORT_FMT = new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short' });

export function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : DATE_FMT.format(d);
}

export function formatDateShort(value) {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : SHORT_FMT.format(d);
}

/** "Today", "Yesterday", "3 days ago", then an absolute date. */
export function formatRelativeDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';

  const startOf = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const days = Math.round((startOf(new Date()) - startOf(d)) / 86400000);

  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days === -1) return 'Tomorrow';
  if (days > 1 && days < 7) return `${days} days ago`;
  if (days < -1 && days > -7) return `in ${Math.abs(days)} days`;
  return formatDate(d);
}

/** Value for an <input type="date">, in local time. */
export function toDateInputValue(value) {
  const d = value ? new Date(value) : new Date();
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function monthName(month) {
  return MONTH_NAMES[month - 1] || '';
}

export function initials(name = '') {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || '')
    .join('');
}

export function titleCase(str = '') {
  return str.replace(/\w\S*/g, (w) => w[0].toUpperCase() + w.slice(1).toLowerCase());
}
