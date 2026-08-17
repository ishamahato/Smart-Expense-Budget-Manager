'use strict';

const mongoose = require('mongoose');

/**
 * A budget row is either:
 *   - category-scoped  → `category` holds a Category id
 *   - the overall cap  → `category` is null
 *
 * The compound unique index treats null as a value, which is exactly what we
 * want: one overall budget and one budget per category, per user per month.
 */
const budgetSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      default: null,
    },
    amount: {
      type: Number,
      required: [true, 'Budget amount is required'],
      min: [1, 'Budget amount must be at least 1'],
      set: (v) => (typeof v === 'number' ? Math.round(v * 100) / 100 : v),
    },
    month: {
      type: Number,
      required: true,
      min: [1, 'Month must be between 1 and 12'],
      max: [12, 'Month must be between 1 and 12'],
    },
    year: {
      type: Number,
      required: true,
      min: [2000, 'Year looks invalid'],
      max: [2100, 'Year looks invalid'],
    },
    notes: { type: String, trim: true, maxlength: 300, default: '' },
    rollover: { type: Boolean, default: false },
  },
  { timestamps: true, toJSON: { virtuals: true } }
);

budgetSchema.index({ userId: 1, year: 1, month: 1, category: 1 }, { unique: true });

budgetSchema.virtual('isOverall').get(function isOverall() {
  return this.category === null || this.category === undefined;
});

module.exports = mongoose.model('Budget', budgetSchema);
