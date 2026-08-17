'use strict';

const RecurringExpense = require('../models/RecurringExpense');
const Expense = require('../models/Expense');
const { advanceDueDate, endOfDay } = require('../utils/dates');
const logger = require('../utils/logger');

/**
 * Materialises one recurring template into a real Expense and rolls its due
 * date forward. If the template is behind by several periods (server was down,
 * user was away) the loop catches it up, capped so a mis-set date can't create
 * an unbounded number of rows in one pass.
 */
async function postDueOccurrences(recurring, { asOf = new Date(), maxCatchUp = 24 } = {}) {
  const created = [];
  const cutoff = endOfDay(asOf);
  let guard = 0;

  while (
    recurring.isActive &&
    recurring.nextDueDate <= cutoff &&
    guard < maxCatchUp &&
    (!recurring.endDate || recurring.nextDueDate <= recurring.endDate)
  ) {
    // eslint-disable-next-line no-await-in-loop
    const expense = await Expense.create({
      userId: recurring.userId,
      amount: recurring.amount,
      merchant: recurring.merchant,
      category: recurring.category,
      description:
        recurring.description || `Recurring ${recurring.frequency} payment`,
      date: new Date(recurring.nextDueDate),
      paymentMethod: recurring.paymentMethod,
      isRecurring: true,
      recurringExpenseId: recurring._id,
      source: 'recurring',
    });

    created.push(expense);
    recurring.nextDueDate = advanceDueDate(recurring.nextDueDate, recurring.frequency);
    recurring.lastPostedAt = new Date();
    recurring.postedCount += 1;
    guard += 1;
  }

  if (created.length) {
    if (recurring.endDate && recurring.nextDueDate > recurring.endDate) {
      recurring.isActive = false;
    }
    await recurring.save();
  }

  return created;
}

/**
 * Daily sweep across every user. Only `autoPost` templates are materialised —
 * the rest surface in the UI as "due now" and wait for an explicit confirm.
 */
async function processDueRecurringExpenses({ userId = null, asOf = new Date() } = {}) {
  const filter = {
    isActive: true,
    autoPost: true,
    nextDueDate: { $lte: endOfDay(asOf) },
  };
  if (userId) filter.userId = userId;

  const due = await RecurringExpense.find(filter);
  let createdCount = 0;

  for (const recurring of due) {
    try {
      // eslint-disable-next-line no-await-in-loop
      const created = await postDueOccurrences(recurring, { asOf });
      createdCount += created.length;
    } catch (err) {
      // One bad template must not stop the sweep for everyone else.
      logger.error(
        `Failed to post recurring expense ${recurring._id}: ${err.message}`
      );
    }
  }

  if (createdCount > 0) {
    logger.info(
      `Recurring sweep: posted ${createdCount} expense(s) from ${due.length} due template(s)`
    );
  }
  return { processed: due.length, created: createdCount };
}

/** Templates that are past due and waiting on a manual confirmation. */
async function getPendingConfirmations(userId, asOf = new Date()) {
  return RecurringExpense.find({
    userId,
    isActive: true,
    autoPost: false,
    nextDueDate: { $lte: endOfDay(asOf) },
  })
    .populate('category', 'name color icon')
    .sort({ nextDueDate: 1 })
    .lean();
}

module.exports = {
  postDueOccurrences,
  processDueRecurringExpenses,
  getPendingConfirmations,
};
