'use strict';

const mongoose = require('mongoose');

const PAYMENT_METHODS = ['cash', 'card', 'upi', 'netbanking', 'wallet', 'other'];
const SOURCES = ['manual', 'ai', 'recurring', 'seed'];

const expenseSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0.01, 'Amount must be greater than zero'],
      // Money is stored as a rounded 2-decimal number rather than paise ints;
      // adequate for personal budgeting and keeps aggregation pipelines simple.
      set: (v) => (typeof v === 'number' ? Math.round(v * 100) / 100 : v),
    },
    merchant: {
      type: String,
      required: [true, 'Merchant is required'],
      trim: true,
      maxlength: [120, 'Merchant cannot exceed 120 characters'],
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'Category is required'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
      default: '',
    },
    date: {
      type: Date,
      required: [true, 'Date is required'],
      default: Date.now,
    },
    paymentMethod: {
      type: String,
      enum: { values: PAYMENT_METHODS, message: '`{VALUE}` is not a valid payment method' },
      default: 'upi',
    },
    isRecurring: { type: Boolean, default: false },
    recurringExpenseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RecurringExpense',
      default: null,
    },
    source: { type: String, enum: SOURCES, default: 'manual' },
    tags: [{ type: String, trim: true, maxlength: 30 }],
  },
  { timestamps: true, toJSON: { virtuals: true } }
);

// Every query is scoped by userId first — these indexes match that access shape.
expenseSchema.index({ userId: 1, date: -1 });
expenseSchema.index({ userId: 1, category: 1, date: -1 });
expenseSchema.index({ userId: 1, amount: -1 });
expenseSchema.index({ userId: 1, merchant: 1 });

expenseSchema.statics.PAYMENT_METHODS = PAYMENT_METHODS;

module.exports = mongoose.model('Expense', expenseSchema);
module.exports.PAYMENT_METHODS = PAYMENT_METHODS;
