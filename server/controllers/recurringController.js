'use strict';

const RecurringExpense = require('../models/RecurringExpense');
const Category = require('../models/Category');
const Expense = require('../models/Expense');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const recurringService = require('../services/recurring.service');
const { endOfDay, advanceDueDate } = require('../utils/dates');

async function assertOwnedCategory(userId, categoryId) {
  const category = await Category.findOne({ _id: categoryId, userId });
  if (!category) throw ApiError.badRequest('Category not found in your account');
  return category;
}

/** Monthly-equivalent cost, so weekly and yearly items can be compared. */
function monthlyEquivalent(item) {
  switch (item.frequency) {
    case 'weekly':
      return Math.round(item.amount * (52 / 12) * 100) / 100;
    case 'yearly':
      return Math.round((item.amount / 12) * 100) / 100;
    default:
      return item.amount;
  }
}

/** GET /api/recurring-expenses */
const listRecurring = asyncHandler(async (req, res) => {
  const items = await RecurringExpense.find({ userId: req.user._id })
    .populate('category', 'name color icon')
    .sort({ isActive: -1, nextDueDate: 1 })
    .lean();

  const today = endOfDay(new Date());
  const enriched = items.map((item) => ({
    ...item,
    monthlyEquivalent: monthlyEquivalent(item),
    isDue: item.isActive && new Date(item.nextDueDate) <= today,
    daysUntilDue: Math.ceil(
      (new Date(item.nextDueDate) - new Date()) / (1000 * 60 * 60 * 24)
    ),
  }));

  const active = enriched.filter((i) => i.isActive);

  res.json({
    success: true,
    data: {
      items: enriched,
      summary: {
        activeCount: active.length,
        inactiveCount: enriched.length - active.length,
        monthlyCommitment:
          Math.round(active.reduce((s, i) => s + i.monthlyEquivalent, 0) * 100) / 100,
        dueNow: active.filter((i) => i.isDue).length,
      },
    },
  });
});

/** GET /api/recurring-expenses/:id */
const getRecurring = asyncHandler(async (req, res) => {
  const item = await RecurringExpense.findOne({
    _id: req.params.id,
    userId: req.user._id,
  }).populate('category', 'name color icon');

  if (!item) throw ApiError.notFound('Recurring expense not found');
  res.json({ success: true, data: { recurringExpense: item } });
});

/** POST /api/recurring-expenses */
const createRecurring = asyncHandler(async (req, res) => {
  await assertOwnedCategory(req.user._id, req.body.category);

  const item = await RecurringExpense.create({ ...req.body, userId: req.user._id });
  await item.populate('category', 'name color icon');

  res.status(201).json({
    success: true,
    message: 'Recurring expense created',
    data: { recurringExpense: item },
  });
});

/** PUT /api/recurring-expenses/:id */
const updateRecurring = asyncHandler(async (req, res) => {
  if (req.body.category) await assertOwnedCategory(req.user._id, req.body.category);

  const item = await RecurringExpense.findOneAndUpdate(
    { _id: req.params.id, userId: req.user._id },
    { $set: req.body },
    { new: true, runValidators: true }
  ).populate('category', 'name color icon');

  if (!item) throw ApiError.notFound('Recurring expense not found');
  res.json({
    success: true,
    message: 'Recurring expense updated',
    data: { recurringExpense: item },
  });
});

/**
 * DELETE /api/recurring-expenses/:id
 * Expenses already posted from this template are kept — deleting the schedule
 * should not rewrite spending history.
 */
const deleteRecurring = asyncHandler(async (req, res) => {
  const item = await RecurringExpense.findOneAndDelete({
    _id: req.params.id,
    userId: req.user._id,
  });

  if (!item) throw ApiError.notFound('Recurring expense not found');

  await Expense.updateMany(
    { userId: req.user._id, recurringExpenseId: item._id },
    { $set: { recurringExpenseId: null } }
  );

  res.json({ success: true, message: 'Recurring expense deleted', data: { id: item._id } });
});

/** POST /api/recurring-expenses/:id/post — record the due occurrence now. */
const postNow = asyncHandler(async (req, res) => {
  const item = await RecurringExpense.findOne({
    _id: req.params.id,
    userId: req.user._id,
  });
  if (!item) throw ApiError.notFound('Recurring expense not found');
  if (!item.isActive) throw ApiError.badRequest('This recurring expense is paused');

  const created = await recurringService.postDueOccurrences(item, { maxCatchUp: 1 });

  if (!created.length) {
    // Not due yet — post it anyway and roll the schedule forward once.
    const expense = await Expense.create({
      userId: req.user._id,
      amount: item.amount,
      merchant: item.merchant,
      category: item.category,
      description: item.description || `Recurring ${item.frequency} payment`,
      date: new Date(),
      paymentMethod: item.paymentMethod,
      isRecurring: true,
      recurringExpenseId: item._id,
      source: 'recurring',
    });
    item.nextDueDate = advanceDueDate(item.nextDueDate, item.frequency);
    item.lastPostedAt = new Date();
    item.postedCount += 1;
    await item.save();
    created.push(expense);
  }

  await item.populate('category', 'name color icon');
  res.status(201).json({
    success: true,
    message: `Recorded ${created.length} expense${created.length === 1 ? '' : 's'}`,
    data: { created: created.length, recurringExpense: item },
  });
});

/** POST /api/recurring-expenses/:id/skip — advance without recording. */
const skipNext = asyncHandler(async (req, res) => {
  const item = await RecurringExpense.findOne({
    _id: req.params.id,
    userId: req.user._id,
  });
  if (!item) throw ApiError.notFound('Recurring expense not found');

  item.nextDueDate = advanceDueDate(item.nextDueDate, item.frequency);
  await item.save();
  await item.populate('category', 'name color icon');

  res.json({
    success: true,
    message: 'Skipped to the next occurrence',
    data: { recurringExpense: item },
  });
});

/** POST /api/recurring-expenses/process — run the sweep for this user. */
const processDue = asyncHandler(async (req, res) => {
  const result = await recurringService.processDueRecurringExpenses({
    userId: req.user._id,
  });
  res.json({
    success: true,
    message: `Posted ${result.created} expense(s) from ${result.processed} due template(s)`,
    data: result,
  });
});

module.exports = {
  listRecurring,
  getRecurring,
  createRecurring,
  updateRecurring,
  deleteRecurring,
  postNow,
  skipNext,
  processDue,
};
