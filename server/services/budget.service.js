'use strict';

const mongoose = require('mongoose');
const Budget = require('../models/Budget');
const Expense = require('../models/Expense');
const { monthRange, monthLabel } = require('../utils/dates');

const oid = (id) => new mongoose.Types.ObjectId(String(id));
const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

const WARN_AT = 80; // % of budget that triggers a warning
const OVER_AT = 100;

function statusFor(percentage, threshold = WARN_AT) {
  if (percentage >= OVER_AT) return 'exceeded';
  if (percentage >= threshold) return 'warning';
  return 'on-track';
}

/**
 * Joins the month's budgets against actual spend in a single aggregation:
 * budgets are the left side, expenses are grouped per category in a $lookup
 * sub-pipeline scoped to the same user and month.
 */
async function getBudgetOverview(userId, year, month, { alertThreshold = WARN_AT } = {}) {
  const { start, end } = monthRange(year, month);

  const [budgets, spendRows] = await Promise.all([
    Budget.find({ userId, year, month })
      .populate('category', 'name color icon')
      .sort({ amount: -1 })
      .lean(),
    Expense.aggregate([
      { $match: { userId: oid(userId), date: { $gte: start, $lte: end } } },
      {
        $group: {
          _id: '$category',
          spent: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
    ]),
  ]);

  const spentByCategory = new Map(
    spendRows.map((r) => [String(r._id), { spent: round2(r.spent), count: r.count }])
  );
  const totalSpent = round2(spendRows.reduce((sum, r) => sum + r.spent, 0));

  const overallBudget = budgets.find((b) => !b.category) || null;
  const categoryBudgets = budgets.filter((b) => b.category);

  const categories = categoryBudgets.map((b) => {
    const hit = spentByCategory.get(String(b.category._id)) || { spent: 0, count: 0 };
    const percentage = b.amount > 0 ? round2((hit.spent / b.amount) * 100) : 0;
    return {
      _id: b._id,
      categoryId: b.category._id,
      name: b.category.name,
      color: b.category.color,
      icon: b.category.icon,
      amount: round2(b.amount),
      spent: hit.spent,
      transactions: hit.count,
      remaining: round2(b.amount - hit.spent),
      percentage,
      status: statusFor(percentage, alertThreshold),
      notes: b.notes || '',
    };
  });

  // Spend in categories that have no budget row this month.
  const budgetedIds = new Set(categoryBudgets.map((b) => String(b.category._id)));
  const unbudgetedSpend = round2(
    spendRows
      .filter((r) => !budgetedIds.has(String(r._id)))
      .reduce((sum, r) => sum + r.spent, 0)
  );

  const overallAmount = overallBudget
    ? round2(overallBudget.amount)
    : round2(categories.reduce((sum, c) => sum + c.amount, 0));
  const overallPercentage = overallAmount > 0 ? round2((totalSpent / overallAmount) * 100) : 0;

  return {
    period: { year, month, label: monthLabel(year, month) },
    overall: {
      _id: overallBudget ? overallBudget._id : null,
      isExplicit: Boolean(overallBudget),
      amount: overallAmount,
      spent: totalSpent,
      remaining: round2(overallAmount - totalSpent),
      percentage: overallPercentage,
      status: statusFor(overallPercentage, alertThreshold),
    },
    categories,
    unbudgetedSpend,
    totals: {
      budgeted: round2(categories.reduce((sum, c) => sum + c.amount, 0)),
      spent: totalSpent,
      categoryCount: categories.length,
    },
  };
}

/**
 * Derives alerts from the overview. Alerts are computed on read rather than
 * persisted so they can never drift out of sync with the underlying expenses.
 */
function buildAlerts(overview, threshold = WARN_AT) {
  const alerts = [];

  const push = (scope, name, data) => {
    const level = data.percentage >= OVER_AT ? 'danger' : 'warning';
    const over = round2(data.spent - data.amount);
    alerts.push({
      id: `${scope}-${name}`.toLowerCase().replace(/\s+/g, '-'),
      scope,
      level,
      category: scope === 'category' ? name : null,
      amount: data.amount,
      spent: data.spent,
      percentage: data.percentage,
      overBy: over > 0 ? over : 0,
      message:
        level === 'danger'
          ? scope === 'overall'
            ? `You have exceeded your monthly budget by ${over.toLocaleString('en-IN')}.`
            : `${name} is over budget by ${over.toLocaleString('en-IN')}.`
          : scope === 'overall'
            ? `You have used ${data.percentage}% of your monthly budget.`
            : `${name} is at ${data.percentage}% of its budget.`,
    });
  };

  if (overview.overall.amount > 0 && overview.overall.percentage >= threshold) {
    push('overall', 'Monthly budget', overview.overall);
  }
  for (const c of overview.categories) {
    if (c.percentage >= threshold) push('category', c.name, c);
  }

  // Most severe first so the UI can show the top ones without re-sorting.
  return alerts.sort((a, b) => b.percentage - a.percentage);
}

module.exports = {
  getBudgetOverview,
  buildAlerts,
  statusFor,
  WARN_AT,
  OVER_AT,
};
