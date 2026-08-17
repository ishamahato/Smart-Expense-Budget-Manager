'use strict';

const Category = require('../models/Category');

/**
 * Seeded for every new account. `isSystem` marks "Other" as the fallback
 * bucket that expenses are reassigned to when a category is deleted.
 */
const DEFAULT_CATEGORIES = [
  { name: 'Food', icon: 'UtensilsCrossed', color: '#f97316' },
  { name: 'Transport', icon: 'Car', color: '#0ea5e9' },
  { name: 'Shopping', icon: 'ShoppingBag', color: '#ec4899' },
  { name: 'Bills', icon: 'ReceiptText', color: '#eab308' },
  { name: 'Housing', icon: 'Home', color: '#8b5cf6' },
  { name: 'Entertainment', icon: 'Clapperboard', color: '#22c55e' },
  { name: 'Healthcare', icon: 'HeartPulse', color: '#ef4444' },
  { name: 'Education', icon: 'GraduationCap', color: '#14b8a6' },
  { name: 'Other', icon: 'Tag', color: '#64748b', isSystem: true },
];

/** Idempotently creates the default category set for a user. */
async function seedDefaultCategories(userId) {
  const docs = DEFAULT_CATEGORIES.map((c) => ({
    ...c,
    userId,
    isDefault: true,
    isSystem: Boolean(c.isSystem),
  }));

  // ordered:false so a partial pre-existing set doesn't abort the rest.
  try {
    return await Category.insertMany(docs, { ordered: false });
  } catch (err) {
    if (err.code === 11000 || err.writeErrors) {
      return Category.find({ userId });
    }
    throw err;
  }
}

/** The bucket orphaned expenses fall back to when a category is removed. */
async function getFallbackCategory(userId) {
  let fallback = await Category.findOne({ userId, isSystem: true });
  if (!fallback) {
    fallback = await Category.findOneAndUpdate(
      { userId, name: 'Other' },
      { $setOnInsert: { userId, name: 'Other', icon: 'Tag', color: '#64748b', isSystem: true } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }
  return fallback;
}

module.exports = {
  DEFAULT_CATEGORIES,
  seedDefaultCategories,
  getFallbackCategory,
};
