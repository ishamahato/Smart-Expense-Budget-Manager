'use strict';

const mongoose = require('mongoose');
const { PAYMENT_METHODS } = require('./Expense');

const FREQUENCIES = ['weekly', 'monthly', 'yearly'];

const recurringExpenseSchema = new mongoose.Schema(
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
      set: (v) => (typeof v === 'number' ? Math.round(v * 100) / 100 : v),
    },
    merchant: {
      type: String,
      required: [true, 'Merchant is required'],
      trim: true,
      maxlength: 120,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'Category is required'],
    },
    description: { type: String, trim: true, maxlength: 500, default: '' },
    frequency: {
      type: String,
      enum: { values: FREQUENCIES, message: '`{VALUE}` is not a supported frequency' },
      required: true,
      default: 'monthly',
    },
    nextDueDate: {
      type: Date,
      required: [true, 'Next due date is required'],
      index: true,
    },
    paymentMethod: {
      type: String,
      enum: PAYMENT_METHODS,
      default: 'upi',
    },
    isActive: { type: Boolean, default: true },
    /**
     * When true the daily job posts an Expense automatically on the due date.
     * When false the item shows up in "Due now" and waits for a manual confirm.
     */
    autoPost: { type: Boolean, default: true },
    lastPostedAt: { type: Date, default: null },
    postedCount: { type: Number, default: 0 },
    endDate: { type: Date, default: null },
  },
  { timestamps: true, toJSON: { virtuals: true } }
);

recurringExpenseSchema.index({ userId: 1, nextDueDate: 1, isActive: 1 });

recurringExpenseSchema.statics.FREQUENCIES = FREQUENCIES;

module.exports = mongoose.model('RecurringExpense', recurringExpenseSchema);
module.exports.FREQUENCIES = FREQUENCIES;
