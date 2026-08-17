'use strict';

const Budget = require('../models/Budget');
const Category = require('../models/Category');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { currentPeriod } = require('../utils/dates');
const budgetService = require('../services/budget.service');

function resolvePeriod(query, user) {
  const now = currentPeriod();
  return {
    year: query?.year || now.year,
    month: query?.month || now.month,
    threshold: user.preferences?.alertThreshold ?? budgetService.WARN_AT,
  };
}

/** GET /api/budgets?month=&year= — budgets joined with actual spend. */
const getBudgets = asyncHandler(async (req, res) => {
  const { year, month, threshold } = resolvePeriod(req.validatedQuery, req.user);

  const overview = await budgetService.getBudgetOverview(req.user._id, year, month, {
    alertThreshold: threshold,
  });

  res.json({
    success: true,
    data: { ...overview, alerts: budgetService.buildAlerts(overview, threshold) },
  });
});

/** GET /api/budgets/alerts?month=&year= */
const getAlerts = asyncHandler(async (req, res) => {
  const { year, month, threshold } = resolvePeriod(req.validatedQuery, req.user);

  const overview = await budgetService.getBudgetOverview(req.user._id, year, month, {
    alertThreshold: threshold,
  });

  res.json({
    success: true,
    data: { alerts: budgetService.buildAlerts(overview, threshold), threshold },
  });
});

/** POST /api/budgets — upserts, so re-submitting a period edits it. */
const createBudget = asyncHandler(async (req, res) => {
  const { category, amount, month, year, notes } = req.body;

  if (category) {
    const owned = await Category.findOne({ _id: category, userId: req.user._id });
    if (!owned) throw ApiError.badRequest('Category not found in your account');
  }

  const budget = await Budget.findOneAndUpdate(
    { userId: req.user._id, year, month, category: category || null },
    { $set: { amount, notes: notes || '' } },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  ).populate('category', 'name color icon');

  res.status(201).json({ success: true, message: 'Budget saved', data: { budget } });
});

/** PUT /api/budgets/:id */
const updateBudget = asyncHandler(async (req, res) => {
  const budget = await Budget.findOneAndUpdate(
    { _id: req.params.id, userId: req.user._id },
    { $set: req.body },
    { new: true, runValidators: true }
  ).populate('category', 'name color icon');

  if (!budget) throw ApiError.notFound('Budget not found');
  res.json({ success: true, message: 'Budget updated', data: { budget } });
});

/** DELETE /api/budgets/:id */
const deleteBudget = asyncHandler(async (req, res) => {
  const budget = await Budget.findOneAndDelete({
    _id: req.params.id,
    userId: req.user._id,
  });

  if (!budget) throw ApiError.notFound('Budget not found');
  res.json({ success: true, message: 'Budget deleted', data: { id: budget._id } });
});

/**
 * POST /api/budgets/bulk
 * Saves a whole month in one call — used by "apply this AI suggestion" and by
 * the multi-row budget editor.
 */
const bulkUpsertBudgets = asyncHandler(async (req, res) => {
  const { month, year, overall, budgets } = req.body;

  const categoryIds = budgets.map((b) => b.category);
  const owned = await Category.countDocuments({
    _id: { $in: categoryIds },
    userId: req.user._id,
  });
  if (owned !== new Set(categoryIds.map(String)).size) {
    throw ApiError.badRequest('One or more categories were not found in your account');
  }

  const ops = budgets.map((b) => ({
    updateOne: {
      filter: { userId: req.user._id, year, month, category: b.category },
      update: { $set: { amount: b.amount }, $setOnInsert: { notes: '' } },
      upsert: true,
    },
  }));

  if (overall !== undefined && overall !== null) {
    ops.push({
      updateOne: {
        filter: { userId: req.user._id, year, month, category: null },
        update: { $set: { amount: overall }, $setOnInsert: { notes: '' } },
        upsert: true,
      },
    });
  }

  if (ops.length) await Budget.bulkWrite(ops, { ordered: false });

  const overview = await budgetService.getBudgetOverview(req.user._id, year, month, {
    alertThreshold: req.user.preferences?.alertThreshold ?? budgetService.WARN_AT,
  });

  res.status(201).json({
    success: true,
    message: `Saved ${ops.length} budget${ops.length === 1 ? '' : 's'}`,
    data: overview,
  });
});

module.exports = {
  getBudgets,
  getAlerts,
  createBudget,
  updateBudget,
  deleteBudget,
  bulkUpsertBudgets,
};
