'use strict';

const Expense = require('../models/Expense');
const asyncHandler = require('../utils/asyncHandler');
const analytics = require('../services/analytics.service');
const budgetService = require('../services/budget.service');
const recurringService = require('../services/recurring.service');
const { currentPeriod, monthRange, shiftMonth } = require('../utils/dates');

function period(query) {
  const now = currentPeriod();
  return { year: query?.year || now.year, month: query?.month || now.month };
}

/** GET /api/analytics/monthly?month=&year= */
const getMonthly = asyncHandler(async (req, res) => {
  const { year, month } = period(req.validatedQuery);
  const summary = await analytics.getMonthlySummary(req.user._id, year, month);
  res.json({ success: true, data: summary });
});

/** GET /api/analytics/categories?month=&year= (or startDate/endDate) */
const getCategories = asyncHandler(async (req, res) => {
  const q = req.validatedQuery;
  let start = q.startDate;
  let end = q.endDate;

  if (!start && !end) {
    const { year, month } = period(q);
    ({ start, end } = monthRange(year, month));
  }

  const items = await analytics.getCategoryBreakdown(req.user._id, { start, end });
  res.json({ success: true, data: { items, range: { start, end } } });
});

/** GET /api/analytics/trends?months=&month=&year= */
const getTrends = asyncHandler(async (req, res) => {
  const q = req.validatedQuery;
  const { year, month } = period(q);
  const trends = await analytics.getTrends(req.user._id, { months: q.months, year, month });
  res.json({ success: true, data: trends });
});

/** GET /api/analytics/merchants?limit= */
const getMerchants = asyncHandler(async (req, res) => {
  const q = req.validatedQuery;
  let start = q.startDate;
  let end = q.endDate;
  if (!start && !end && (q.month || q.year)) {
    const { year, month } = period(q);
    ({ start, end } = monthRange(year, month));
  }

  const items = await analytics.getTopMerchants(req.user._id, {
    start,
    end,
    limit: q.limit,
  });
  res.json({ success: true, data: { items } });
});

/** GET /api/analytics/daily?month=&year= */
const getDaily = asyncHandler(async (req, res) => {
  const q = req.validatedQuery;
  let start = q.startDate;
  let end = q.endDate;
  if (!start || !end) {
    const { year, month } = period(q);
    ({ start, end } = monthRange(year, month));
  }

  const items = await analytics.getDailySpending(req.user._id, { start, end });
  res.json({ success: true, data: { items, range: { start, end } } });
});

/** GET /api/analytics/comparison?month=&year= */
const getComparison = asyncHandler(async (req, res) => {
  const { year, month } = period(req.validatedQuery);
  const prev = shiftMonth(year, month, -1);
  const comparison = await analytics.compareMonths(req.user._id, { year, month }, prev);
  res.json({ success: true, data: comparison });
});

/**
 * GET /api/analytics/dashboard?month=&year=
 * Single call that backs the whole dashboard page — summary, trends, budget
 * progress, alerts, recent transactions and pending recurring items.
 */
const getDashboard = asyncHandler(async (req, res) => {
  const { year, month } = period(req.validatedQuery);
  const threshold = req.user.preferences?.alertThreshold ?? budgetService.WARN_AT;

  const [summary, trends, budgetOverview, recent, pendingRecurring] = await Promise.all([
    analytics.getMonthlySummary(req.user._id, year, month),
    analytics.getTrends(req.user._id, { months: 6, year, month }),
    budgetService.getBudgetOverview(req.user._id, year, month, {
      alertThreshold: threshold,
    }),
    Expense.find({ userId: req.user._id })
      .populate('category', 'name color icon')
      .sort({ date: -1, createdAt: -1 })
      .limit(8)
      .lean(),
    recurringService.getPendingConfirmations(req.user._id),
  ]);

  res.json({
    success: true,
    data: {
      period: summary.period,
      summary,
      trends,
      budget: budgetOverview,
      alerts: budgetService.buildAlerts(budgetOverview, threshold),
      recentExpenses: recent,
      pendingRecurring,
    },
  });
});

module.exports = {
  getMonthly,
  getCategories,
  getTrends,
  getMerchants,
  getDaily,
  getComparison,
  getDashboard,
};
