'use strict';

const mongoose = require('mongoose');
const Expense = require('../models/Expense');
const Category = require('../models/Category');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { monthRange } = require('../utils/dates');

/** Escapes user input before it is used inside a RegExp. */
function escapeRegex(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Confirms the category belongs to the requesting user. */
async function assertOwnedCategory(userId, categoryId) {
  const category = await Category.findOne({ _id: categoryId, userId });
  if (!category) {
    throw ApiError.badRequest('Category not found in your account');
  }
  return category;
}

/**
 * GET /api/expenses
 * Search, filter, sort and paginate — all scoped to req.user._id.
 */
const listExpenses = asyncHandler(async (req, res) => {
  const q = req.validatedQuery;
  const filter = { userId: req.user._id };

  // Cast explicitly: this same filter is reused by the aggregation below, and
  // unlike find(), an aggregation pipeline gets no schema-based casting — a
  // string id would silently match nothing.
  if (q.category) filter.category = new mongoose.Types.ObjectId(q.category);
  if (q.paymentMethod) filter.paymentMethod = q.paymentMethod;
  if (q.isRecurring) filter.isRecurring = q.isRecurring === 'true';

  // Month/year is a convenience shortcut; explicit dates win if both are given.
  if (q.month && q.year) {
    const { start, end } = monthRange(q.year, q.month);
    filter.date = { $gte: start, $lte: end };
  }
  if (q.startDate || q.endDate) {
    filter.date = filter.date || {};
    if (q.startDate) filter.date.$gte = q.startDate;
    if (q.endDate) filter.date.$lte = q.endDate;
  }

  if (q.minAmount !== undefined || q.maxAmount !== undefined) {
    filter.amount = {};
    if (q.minAmount !== undefined) filter.amount.$gte = q.minAmount;
    if (q.maxAmount !== undefined) filter.amount.$lte = q.maxAmount;
  }

  if (q.search) {
    const rx = new RegExp(escapeRegex(q.search), 'i');
    filter.$or = [{ merchant: rx }, { description: rx }, { tags: rx }];
  }

  const sort = { [q.sortBy]: q.order === 'asc' ? 1 : -1 };
  if (q.sortBy !== 'date') sort.date = -1; // stable secondary ordering
  const skip = (q.page - 1) * q.limit;

  const [items, total, sumRow] = await Promise.all([
    Expense.find(filter)
      .populate('category', 'name color icon')
      .sort(sort)
      .skip(skip)
      .limit(q.limit)
      .lean(),
    Expense.countDocuments(filter),
    Expense.aggregate([
      { $match: filter },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
  ]);

  res.json({
    success: true,
    data: {
      items,
      pagination: {
        page: q.page,
        limit: q.limit,
        total,
        pages: Math.max(1, Math.ceil(total / q.limit)),
        hasNext: skip + items.length < total,
        hasPrev: q.page > 1,
      },
      // Sum across the whole filtered set, not just the current page.
      filteredTotal: Math.round((sumRow[0]?.total || 0) * 100) / 100,
    },
  });
});

/** GET /api/expenses/:id */
const getExpense = asyncHandler(async (req, res) => {
  const expense = await Expense.findOne({
    _id: req.params.id,
    userId: req.user._id,
  }).populate('category', 'name color icon');

  if (!expense) throw ApiError.notFound('Expense not found');
  res.json({ success: true, data: { expense } });
});

/** POST /api/expenses */
const createExpense = asyncHandler(async (req, res) => {
  await assertOwnedCategory(req.user._id, req.body.category);

  const expense = await Expense.create({
    ...req.body,
    date: req.body.date || new Date(),
    userId: req.user._id,
    source: req.body.source === 'ai' ? 'ai' : 'manual',
  });

  await expense.populate('category', 'name color icon');
  res.status(201).json({ success: true, message: 'Expense added', data: { expense } });
});

/** PUT /api/expenses/:id */
const updateExpense = asyncHandler(async (req, res) => {
  if (req.body.category) {
    await assertOwnedCategory(req.user._id, req.body.category);
  }

  // userId in the filter is what stops one user editing another's row.
  const expense = await Expense.findOneAndUpdate(
    { _id: req.params.id, userId: req.user._id },
    { $set: req.body },
    { new: true, runValidators: true }
  ).populate('category', 'name color icon');

  if (!expense) throw ApiError.notFound('Expense not found');
  res.json({ success: true, message: 'Expense updated', data: { expense } });
});

/** DELETE /api/expenses/:id */
const deleteExpense = asyncHandler(async (req, res) => {
  const expense = await Expense.findOneAndDelete({
    _id: req.params.id,
    userId: req.user._id,
  });

  if (!expense) throw ApiError.notFound('Expense not found');
  res.json({ success: true, message: 'Expense deleted', data: { id: expense._id } });
});

/** GET /api/expenses/recent?limit= */
const getRecentExpenses = asyncHandler(async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 5, 50);
  const items = await Expense.find({ userId: req.user._id })
    .populate('category', 'name color icon')
    .sort({ date: -1, createdAt: -1 })
    .limit(limit)
    .lean();

  res.json({ success: true, data: { items } });
});

module.exports = {
  listExpenses,
  getExpense,
  createExpense,
  updateExpense,
  deleteExpense,
  getRecentExpenses,
};
