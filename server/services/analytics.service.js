'use strict';

const mongoose = require('mongoose');
const Expense = require('../models/Expense');
const {
  monthRange,
  startOfDay,
  endOfDay,
  shiftMonth,
  lastNMonths,
  monthLabel,
  daysInMonth,
} = require('../utils/dates');

const oid = (id) => new mongoose.Types.ObjectId(String(id));
const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

/**
 * Every pipeline below opens with `$match: { userId }`. That first stage is the
 * data-isolation boundary — it is never built from client input, only from the
 * authenticated `req.user._id`.
 */

/* ------------------------------------------------------------------ */
/* Monthly summary                                                     */
/* ------------------------------------------------------------------ */

/**
 * One round trip that returns the whole dashboard header via $facet:
 * month total, today's total, per-category split, per-day series,
 * top merchant, largest single expense and payment-method mix.
 */
async function getMonthlySummary(userId, year, month) {
  const { start, end } = monthRange(year, month);
  const today = new Date();
  const todayStart = startOfDay(today);
  const todayEnd = endOfDay(today);

  const [result] = await Expense.aggregate([
    { $match: { userId: oid(userId), date: { $gte: start, $lte: end } } },
    {
      $facet: {
        totals: [
          {
            $group: {
              _id: null,
              total: { $sum: '$amount' },
              count: { $sum: 1 },
              average: { $avg: '$amount' },
              max: { $max: '$amount' },
              min: { $min: '$amount' },
            },
          },
        ],
        today: [
          { $match: { date: { $gte: todayStart, $lte: todayEnd } } },
          { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
        ],
        byCategory: [
          {
            $group: {
              _id: '$category',
              total: { $sum: '$amount' },
              count: { $sum: 1 },
            },
          },
          {
            $lookup: {
              from: 'categories',
              localField: '_id',
              foreignField: '_id',
              as: 'category',
            },
          },
          { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } },
          {
            $project: {
              _id: 0,
              categoryId: '$_id',
              name: { $ifNull: ['$category.name', 'Uncategorised'] },
              color: { $ifNull: ['$category.color', '#94a3b8'] },
              icon: { $ifNull: ['$category.icon', 'Tag'] },
              total: 1,
              count: 1,
            },
          },
          { $sort: { total: -1 } },
        ],
        byDay: [
          {
            $group: {
              _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
              total: { $sum: '$amount' },
              count: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
          { $project: { _id: 0, date: '$_id', total: 1, count: 1 } },
        ],
        topMerchants: [
          {
            $group: {
              _id: { $toLower: '$merchant' },
              label: { $first: '$merchant' },
              total: { $sum: '$amount' },
              count: { $sum: 1 },
            },
          },
          { $sort: { count: -1, total: -1 } },
          { $limit: 5 },
          { $project: { _id: 0, merchant: '$label', total: 1, count: 1 } },
        ],
        largest: [
          { $sort: { amount: -1 } },
          { $limit: 1 },
          {
            $lookup: {
              from: 'categories',
              localField: 'category',
              foreignField: '_id',
              as: 'cat',
            },
          },
          { $unwind: { path: '$cat', preserveNullAndEmptyArrays: true } },
          {
            $project: {
              _id: 1,
              amount: 1,
              merchant: 1,
              date: 1,
              category: { $ifNull: ['$cat.name', 'Uncategorised'] },
            },
          },
        ],
        byPaymentMethod: [
          {
            $group: {
              _id: '$paymentMethod',
              total: { $sum: '$amount' },
              count: { $sum: 1 },
            },
          },
          { $sort: { total: -1 } },
          { $project: { _id: 0, method: '$_id', total: 1, count: 1 } },
        ],
      },
    },
  ]);

  const totals = result.totals[0] || {};
  const todayTotals = result.today[0] || {};
  const monthTotal = round2(totals.total);
  // Percentage is attached here (not at the point of use) so every consumer —
  // including `topCategory` below — sees the same enriched objects.
  const byCategory = (result.byCategory || []).map((c) => {
    const total = round2(c.total);
    return {
      ...c,
      total,
      percentage: monthTotal > 0 ? round2((total / monthTotal) * 100) : 0,
    };
  });

  // Fill in zero-spend days so the chart shows a continuous month.
  const dayMap = new Map((result.byDay || []).map((d) => [d.date, d]));
  const totalDays = daysInMonth(year, month);
  const dailySeries = [];
  for (let day = 1; day <= totalDays; day += 1) {
    const key = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const hit = dayMap.get(key);
    dailySeries.push({
      date: key,
      day,
      total: round2(hit ? hit.total : 0),
      count: hit ? hit.count : 0,
    });
  }

  return {
    period: { year, month, label: monthLabel(year, month) },
    totals: {
      total: monthTotal,
      count: totals.count || 0,
      average: round2(totals.average),
      highest: round2(totals.max),
      lowest: round2(totals.min),
    },
    today: { total: round2(todayTotals.total), count: todayTotals.count || 0 },
    byCategory,
    topCategory: byCategory[0] || null,
    dailySeries,
    topMerchants: (result.topMerchants || []).map((m) => ({ ...m, total: round2(m.total) })),
    largestExpense: result.largest[0]
      ? { ...result.largest[0], amount: round2(result.largest[0].amount) }
      : null,
    byPaymentMethod: (result.byPaymentMethod || []).map((p) => ({
      ...p,
      total: round2(p.total),
    })),
  };
}

/* ------------------------------------------------------------------ */
/* Category breakdown over an arbitrary range                          */
/* ------------------------------------------------------------------ */

async function getCategoryBreakdown(userId, { start, end, limit = 20 } = {}) {
  const match = { userId: oid(userId) };
  if (start || end) {
    match.date = {};
    if (start) match.date.$gte = start;
    if (end) match.date.$lte = end;
  }

  const rows = await Expense.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$category',
        total: { $sum: '$amount' },
        count: { $sum: 1 },
        average: { $avg: '$amount' },
        largest: { $max: '$amount' },
        lastSpentAt: { $max: '$date' },
      },
    },
    {
      $lookup: {
        from: 'categories',
        localField: '_id',
        foreignField: '_id',
        as: 'category',
      },
    },
    { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: 0,
        categoryId: '$_id',
        name: { $ifNull: ['$category.name', 'Uncategorised'] },
        color: { $ifNull: ['$category.color', '#94a3b8'] },
        icon: { $ifNull: ['$category.icon', 'Tag'] },
        total: { $round: ['$total', 2] },
        count: 1,
        average: { $round: ['$average', 2] },
        largest: { $round: ['$largest', 2] },
        lastSpentAt: 1,
      },
    },
    { $sort: { total: -1 } },
    { $limit: limit },
  ]);

  const grandTotal = rows.reduce((sum, r) => sum + r.total, 0);
  return rows.map((r) => ({
    ...r,
    percentage: grandTotal > 0 ? round2((r.total / grandTotal) * 100) : 0,
  }));
}

/* ------------------------------------------------------------------ */
/* Trends                                                              */
/* ------------------------------------------------------------------ */

/**
 * Month-over-month totals for the last `months` periods, plus averages and a
 * current-vs-previous comparison including per-category deltas.
 */
async function getTrends(userId, { months = 6, year, month } = {}) {
  const periods = lastNMonths(months, year, month);
  const rangeStart = monthRange(periods[0].year, periods[0].month).start;
  const rangeEnd = monthRange(year, month).end;

  const grouped = await Expense.aggregate([
    { $match: { userId: oid(userId), date: { $gte: rangeStart, $lte: rangeEnd } } },
    {
      $group: {
        _id: { year: { $year: '$date' }, month: { $month: '$date' } },
        total: { $sum: '$amount' },
        count: { $sum: 1 },
        average: { $avg: '$amount' },
      },
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } },
  ]);

  const map = new Map(grouped.map((g) => [`${g._id.year}-${g._id.month}`, g]));
  const series = periods.map((p) => {
    const hit = map.get(`${p.year}-${p.month}`);
    return {
      year: p.year,
      month: p.month,
      label: monthLabel(p.year, p.month),
      total: round2(hit ? hit.total : 0),
      count: hit ? hit.count : 0,
      average: round2(hit ? hit.average : 0),
    };
  });

  const monthsWithSpend = series.filter((s) => s.total > 0);
  const averageMonthly = monthsWithSpend.length
    ? round2(monthsWithSpend.reduce((s, m) => s + m.total, 0) / monthsWithSpend.length)
    : 0;

  const prev = shiftMonth(year, month, -1);
  const comparison = await compareMonths(userId, { year, month }, prev);

  return {
    series,
    averageMonthly,
    highestMonth: series.reduce(
      (best, m) => (!best || m.total > best.total ? m : best),
      null
    ),
    comparison,
  };
}

/** Current vs previous month, overall and per category. */
async function compareMonths(userId, current, previous) {
  const cur = monthRange(current.year, current.month);
  const pre = monthRange(previous.year, previous.month);

  const [data] = await Expense.aggregate([
    {
      $match: {
        userId: oid(userId),
        $or: [
          { date: { $gte: cur.start, $lte: cur.end } },
          { date: { $gte: pre.start, $lte: pre.end } },
        ],
      },
    },
    {
      $addFields: {
        bucket: {
          $cond: [{ $gte: ['$date', cur.start] }, 'current', 'previous'],
        },
      },
    },
    {
      $facet: {
        totals: [
          { $group: { _id: '$bucket', total: { $sum: '$amount' }, count: { $sum: 1 } } },
        ],
        byCategory: [
          {
            $group: {
              _id: { category: '$category', bucket: '$bucket' },
              total: { $sum: '$amount' },
            },
          },
          {
            $group: {
              _id: '$_id.category',
              current: {
                $sum: { $cond: [{ $eq: ['$_id.bucket', 'current'] }, '$total', 0] },
              },
              previous: {
                $sum: { $cond: [{ $eq: ['$_id.bucket', 'previous'] }, '$total', 0] },
              },
            },
          },
          {
            $lookup: {
              from: 'categories',
              localField: '_id',
              foreignField: '_id',
              as: 'category',
            },
          },
          { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } },
          {
            $project: {
              _id: 0,
              categoryId: '$_id',
              name: { $ifNull: ['$category.name', 'Uncategorised'] },
              color: { $ifNull: ['$category.color', '#94a3b8'] },
              current: { $round: ['$current', 2] },
              previous: { $round: ['$previous', 2] },
              change: { $round: [{ $subtract: ['$current', '$previous'] }, 2] },
            },
          },
          { $sort: { change: -1 } },
        ],
      },
    },
  ]);

  const totals = { current: 0, previous: 0, currentCount: 0, previousCount: 0 };
  for (const row of data?.totals || []) {
    if (row._id === 'current') {
      totals.current = round2(row.total);
      totals.currentCount = row.count;
    } else {
      totals.previous = round2(row.total);
      totals.previousCount = row.count;
    }
  }

  const diff = round2(totals.current - totals.previous);
  const percentChange =
    totals.previous > 0 ? round2((diff / totals.previous) * 100) : null;

  return {
    current: { ...current, label: monthLabel(current.year, current.month), total: totals.current, count: totals.currentCount },
    previous: { ...previous, label: monthLabel(previous.year, previous.month), total: totals.previous, count: totals.previousCount },
    difference: diff,
    percentChange,
    direction: diff > 0 ? 'up' : diff < 0 ? 'down' : 'flat',
    byCategory: data?.byCategory || [],
  };
}

/* ------------------------------------------------------------------ */
/* Daily series over an arbitrary window                               */
/* ------------------------------------------------------------------ */

async function getDailySpending(userId, { start, end }) {
  return Expense.aggregate([
    { $match: { userId: oid(userId), date: { $gte: start, $lte: end } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
        total: { $sum: '$amount' },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
    { $project: { _id: 0, date: '$_id', total: { $round: ['$total', 2] }, count: 1 } },
  ]);
}

/* ------------------------------------------------------------------ */
/* Merchants                                                           */
/* ------------------------------------------------------------------ */

async function getTopMerchants(userId, { start, end, limit = 10 } = {}) {
  const match = { userId: oid(userId) };
  if (start || end) {
    match.date = {};
    if (start) match.date.$gte = start;
    if (end) match.date.$lte = end;
  }

  return Expense.aggregate([
    { $match: match },
    {
      $group: {
        _id: { $toLower: '$merchant' },
        merchant: { $first: '$merchant' },
        total: { $sum: '$amount' },
        count: { $sum: 1 },
        average: { $avg: '$amount' },
        lastSpentAt: { $max: '$date' },
      },
    },
    { $sort: { total: -1 } },
    { $limit: limit },
    {
      $project: {
        _id: 0,
        merchant: 1,
        total: { $round: ['$total', 2] },
        count: 1,
        average: { $round: ['$average', 2] },
        lastSpentAt: 1,
      },
    },
  ]);
}

/* ------------------------------------------------------------------ */
/* Lifetime stats                                                      */
/* ------------------------------------------------------------------ */

async function getLifetimeStats(userId) {
  const [row] = await Expense.aggregate([
    { $match: { userId: oid(userId) } },
    {
      $group: {
        _id: null,
        total: { $sum: '$amount' },
        count: { $sum: 1 },
        average: { $avg: '$amount' },
        firstExpenseAt: { $min: '$date' },
        lastExpenseAt: { $max: '$date' },
      },
    },
    {
      $project: {
        _id: 0,
        total: { $round: ['$total', 2] },
        count: 1,
        average: { $round: ['$average', 2] },
        firstExpenseAt: 1,
        lastExpenseAt: 1,
      },
    },
  ]);

  return row || { total: 0, count: 0, average: 0, firstExpenseAt: null, lastExpenseAt: null };
}

module.exports = {
  getMonthlySummary,
  getCategoryBreakdown,
  getTrends,
  compareMonths,
  getDailySpending,
  getTopMerchants,
  getLifetimeStats,
};
