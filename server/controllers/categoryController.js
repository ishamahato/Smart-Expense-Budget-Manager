'use strict';

const Category = require('../models/Category');
const Expense = require('../models/Expense');
const Budget = require('../models/Budget');
const RecurringExpense = require('../models/RecurringExpense');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { getFallbackCategory } = require('../services/category.service');

/** GET /api/categories — includes a usage count per category. */
const listCategories = asyncHandler(async (req, res) => {
  const [categories, usage] = await Promise.all([
    Category.find({ userId: req.user._id }).sort({ name: 1 }).lean(),
    Expense.aggregate([
      { $match: { userId: req.user._id } },
      { $group: { _id: '$category', count: { $sum: 1 }, total: { $sum: '$amount' } } },
    ]),
  ]);

  const usageMap = new Map(usage.map((u) => [String(u._id), u]));
  const items = categories.map((c) => {
    const hit = usageMap.get(String(c._id));
    return {
      ...c,
      expenseCount: hit ? hit.count : 0,
      totalSpent: hit ? Math.round(hit.total * 100) / 100 : 0,
    };
  });

  res.json({ success: true, data: { items } });
});

/** POST /api/categories */
const createCategory = asyncHandler(async (req, res) => {
  const name = req.body.name.trim();

  const existing = await Category.findOne({
    userId: req.user._id,
    name: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'),
  });
  if (existing) throw ApiError.conflict(`You already have a "${existing.name}" category`);

  const category = await Category.create({
    userId: req.user._id,
    name,
    icon: req.body.icon || 'Tag',
    color: req.body.color || '#64748b',
  });

  res.status(201).json({ success: true, message: 'Category created', data: { category } });
});

/** PUT /api/categories/:id */
const updateCategory = asyncHandler(async (req, res) => {
  const category = await Category.findOneAndUpdate(
    { _id: req.params.id, userId: req.user._id },
    { $set: req.body },
    { new: true, runValidators: true }
  );

  if (!category) throw ApiError.notFound('Category not found');
  res.json({ success: true, message: 'Category updated', data: { category } });
});

/**
 * DELETE /api/categories/:id
 * Expenses are never deleted with the category — they are reassigned to the
 * system "Other" bucket so spending history stays intact.
 */
const deleteCategory = asyncHandler(async (req, res) => {
  const category = await Category.findOne({ _id: req.params.id, userId: req.user._id });
  if (!category) throw ApiError.notFound('Category not found');
  if (category.isSystem) {
    throw ApiError.badRequest('The "Other" category is required and cannot be deleted');
  }

  const fallback = await getFallbackCategory(req.user._id);

  const [expenseResult, recurringResult] = await Promise.all([
    Expense.updateMany(
      { userId: req.user._id, category: category._id },
      { $set: { category: fallback._id } }
    ),
    RecurringExpense.updateMany(
      { userId: req.user._id, category: category._id },
      { $set: { category: fallback._id } }
    ),
    Budget.deleteMany({ userId: req.user._id, category: category._id }),
  ]);

  await category.deleteOne();

  res.json({
    success: true,
    message: `Category deleted. ${expenseResult.modifiedCount} expense(s) moved to "${fallback.name}".`,
    data: {
      id: category._id,
      reassignedExpenses: expenseResult.modifiedCount,
      reassignedRecurring: recurringResult.modifiedCount,
      fallbackCategory: fallback.name,
    },
  });
});

module.exports = { listCategories, createCategory, updateCategory, deleteCategory };
