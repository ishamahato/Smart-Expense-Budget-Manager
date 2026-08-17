'use strict';

/**
 * Date helpers. Every boundary is computed in the server's local timezone so a
 * "month" in the UI matches a "month" in the aggregation pipelines.
 */

function startOfDay(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date = new Date()) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function startOfMonth(year, month /* 1-12 */) {
  return new Date(year, month - 1, 1, 0, 0, 0, 0);
}

function endOfMonth(year, month /* 1-12 */) {
  // Day 0 of the next month is the last day of this month.
  return new Date(year, month, 0, 23, 59, 59, 999);
}

/** Returns { year, month } shifted by `delta` months from the given period. */
function shiftMonth(year, month, delta) {
  const d = new Date(year, month - 1 + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

function monthRange(year, month) {
  return { start: startOfMonth(year, month), end: endOfMonth(year, month) };
}

/** Inclusive list of the last `count` periods ending at (year, month). */
function lastNMonths(count, year, month) {
  const out = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    out.push(shiftMonth(year, month, -i));
  }
  return out;
}

const MONTH_LABELS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

function monthLabel(year, month) {
  return `${MONTH_LABELS[month - 1]} ${String(year).slice(2)}`;
}

function daysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

/** Advance a due date by one period, clamping day-of-month overflow. */
function advanceDueDate(date, frequency) {
  const d = new Date(date);
  switch (frequency) {
    case 'weekly':
      d.setDate(d.getDate() + 7);
      return d;
    case 'yearly':
      d.setFullYear(d.getFullYear() + 1);
      return d;
    case 'monthly':
    default: {
      const anchorDay = d.getDate();
      d.setDate(1);
      d.setMonth(d.getMonth() + 1);
      d.setDate(Math.min(anchorDay, daysInMonth(d.getFullYear(), d.getMonth() + 1)));
      return d;
    }
  }
}

/** Current period as { year, month } in local time. */
function currentPeriod() {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

module.exports = {
  startOfDay,
  endOfDay,
  startOfMonth,
  endOfMonth,
  shiftMonth,
  monthRange,
  lastNMonths,
  monthLabel,
  daysInMonth,
  advanceDueDate,
  currentPeriod,
  MONTH_LABELS,
};
