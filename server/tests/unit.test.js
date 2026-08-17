'use strict';

/**
 * Pure-function tests — no database required.
 *   npm test
 */

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  advanceDueDate,
  daysInMonth,
  endOfMonth,
  lastNMonths,
  monthLabel,
  shiftMonth,
  startOfMonth,
} = require('../utils/dates');
const { buildAlerts, statusFor } = require('../services/budget.service');
const { parseExpenseOffline, suggestBudgetOffline } = require('../services/ai.service');

/* ----------------------------- date helpers ----------------------------- */

test('startOfMonth / endOfMonth cover the whole month', () => {
  const start = startOfMonth(2026, 2);
  const end = endOfMonth(2026, 2);

  assert.equal(start.getDate(), 1);
  assert.equal(start.getHours(), 0);
  assert.equal(end.getDate(), 28, '2026 is not a leap year');
  assert.equal(end.getHours(), 23);
  assert.equal(end.getMonth(), 1, 'end must stay inside February');
});

test('endOfMonth handles leap years', () => {
  assert.equal(endOfMonth(2028, 2).getDate(), 29);
  assert.equal(daysInMonth(2028, 2), 29);
});

test('shiftMonth rolls across year boundaries', () => {
  assert.deepEqual(shiftMonth(2026, 1, -1), { year: 2025, month: 12 });
  assert.deepEqual(shiftMonth(2026, 12, 1), { year: 2027, month: 1 });
  assert.deepEqual(shiftMonth(2026, 6, -7), { year: 2025, month: 11 });
});

test('lastNMonths returns an inclusive ascending window', () => {
  const months = lastNMonths(3, 2026, 2);
  assert.deepEqual(months, [
    { year: 2025, month: 12 },
    { year: 2026, month: 1 },
    { year: 2026, month: 2 },
  ]);
});

test('monthLabel is short and unambiguous', () => {
  assert.equal(monthLabel(2026, 8), 'Aug 26');
});

test('advanceDueDate steps each frequency', () => {
  const base = new Date(2026, 0, 15, 10, 0);

  assert.equal(advanceDueDate(base, 'weekly').getDate(), 22);
  assert.equal(advanceDueDate(base, 'monthly').getMonth(), 1);
  assert.equal(advanceDueDate(base, 'yearly').getFullYear(), 2027);
});

test('advanceDueDate clamps a 31st due date into shorter months', () => {
  // Jan 31 + 1 month must land on Feb 28, not spill into March.
  const next = advanceDueDate(new Date(2026, 0, 31, 10, 0), 'monthly');
  assert.equal(next.getMonth(), 1);
  assert.equal(next.getDate(), 28);
});

/* ------------------------------ budget logic ---------------------------- */

test('statusFor maps usage onto the three states', () => {
  assert.equal(statusFor(45), 'on-track');
  assert.equal(statusFor(79.9), 'on-track');
  assert.equal(statusFor(80), 'warning');
  assert.equal(statusFor(99.9), 'warning');
  assert.equal(statusFor(100), 'exceeded');
  assert.equal(statusFor(145), 'exceeded');
});

test('statusFor respects a custom threshold', () => {
  assert.equal(statusFor(60, 50), 'warning');
  assert.equal(statusFor(60, 90), 'on-track');
});

const overview = {
  overall: { amount: 60000, spent: 51000, percentage: 85, status: 'warning' },
  categories: [
    { name: 'Bills', amount: 4000, spent: 5809, percentage: 145.23, status: 'exceeded' },
    { name: 'Food', amount: 12000, spent: 9600, percentage: 80, status: 'warning' },
    { name: 'Transport', amount: 5000, spent: 1200, percentage: 24, status: 'on-track' },
  ],
};

test('buildAlerts flags only budgets at or past the threshold', () => {
  const alerts = buildAlerts(overview, 80);
  const names = alerts.map((a) => a.category);

  assert.ok(names.includes('Bills'));
  assert.ok(names.includes('Food'));
  assert.ok(!names.includes('Transport'), 'on-track budgets must not alert');
});

test('buildAlerts sorts most severe first and reports the overspend', () => {
  const alerts = buildAlerts(overview, 80);

  assert.equal(alerts[0].category, 'Bills');
  assert.equal(alerts[0].level, 'danger');
  assert.equal(alerts[0].overBy, 1809);
  // A budget exactly at the threshold warns but is not "over by" anything.
  const food = alerts.find((a) => a.category === 'Food');
  assert.equal(food.level, 'warning');
  assert.equal(food.overBy, 0);
});

test('buildAlerts includes the overall budget when it crosses the threshold', () => {
  const alerts = buildAlerts(overview, 80);
  assert.ok(alerts.some((a) => a.scope === 'overall'));

  // Raise the threshold above the overall usage and it should drop out.
  const quiet = buildAlerts(overview, 95);
  assert.ok(!quiet.some((a) => a.scope === 'overall'));
});

test('buildAlerts stays silent when no budget is set', () => {
  const empty = { overall: { amount: 0, spent: 0, percentage: 0 }, categories: [] };
  assert.deepEqual(buildAlerts(empty, 80), []);
});

/* -------------------- natural language expense parsing ------------------ */

const CATEGORIES = [
  'Food', 'Transport', 'Shopping', 'Bills', 'Housing',
  'Entertainment', 'Healthcare', 'Education', 'Other',
];
const USER = { currency: 'INR' };

const parse = (text) => parseExpenseOffline(text, CATEGORIES, USER);

test('parses "paid 450 to dominos yesterday"', () => {
  const result = parse('paid 450 to dominos yesterday');

  assert.equal(result.amount, 450);
  assert.equal(result.merchant, 'Dominos');
  assert.equal(result.category, 'Food');

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  assert.equal(new Date(result.date).getDate(), yesterday.getDate());
});

test('parses "spent 850 on Uber today"', () => {
  const result = parse('spent 850 on Uber today');

  assert.equal(result.amount, 850);
  assert.equal(result.merchant, 'Uber');
  assert.equal(result.category, 'Transport');
  assert.equal(new Date(result.date).getDate(), new Date().getDate());
});

test('detects the payment method from the text', () => {
  assert.equal(parse('2500 at Amazon by card').paymentMethod, 'card');
  assert.equal(parse('paid 300 cash at the market').paymentMethod, 'cash');
  assert.equal(parse('1200 electricity bill via netbanking').paymentMethod, 'netbanking');
  assert.equal(parse('450 to swiggy').paymentMethod, 'upi', 'UPI is the default');
});

test('maps merchants onto the right categories', () => {
  assert.equal(parse('1200 electricity bill').category, 'Bills');
  assert.equal(parse('22000 rent for august').category, 'Housing');
  assert.equal(parse('649 netflix subscription').category, 'Entertainment');
  assert.equal(parse('800 at apollo pharmacy').category, 'Healthcare');
  assert.equal(parse('999 udemy course').category, 'Education');
});

test('handles amounts with separators and the "k" shorthand', () => {
  assert.equal(parse('spent 1,250 at BigBasket').amount, 1250);
  assert.equal(parse('paid 2k for rent').amount, 2000);
  assert.equal(parse('₹99.50 for coffee').amount, 99.5);
});

test('flags a recurring description', () => {
  assert.equal(parse('649 netflix every month').isRecurring, true);
  assert.equal(parse('450 to swiggy').isRecurring, false);
});

test('falls back to Other and low confidence when nothing matches', () => {
  const result = parse('500 for something unclear');
  assert.equal(result.category, 'Other');
  assert.ok(result.confidence <= 0.6);
});

test('never returns a category outside the allowed list', () => {
  const limited = parseExpenseOffline('450 to dominos', ['Groceries', 'Other'], USER);
  assert.ok(['Groceries', 'Other'].includes(limited.category));
});

/* --------------------------- budget suggestion -------------------------- */

test('offline budget suggestion allocates exactly the target amount', () => {
  const context = {
    user: { currency: 'INR' },
    availableCategories: CATEGORIES,
    thisMonth: {
      byCategory: [
        { category: 'Housing', spent: 25000, share: 50 },
        { category: 'Food', spent: 10000, share: 20 },
        { category: 'Transport', spent: 7500, share: 15 },
        { category: 'Bills', spent: 7500, share: 15 },
      ],
    },
  };

  const suggestion = suggestBudgetOffline(context, 15000);
  const sum = suggestion.allocations.reduce((s, a) => s + a.amount, 0);

  assert.equal(sum, 15000, 'allocations must sum to the requested total');
  assert.equal(suggestion.totalBudget, 15000);
  assert.ok(suggestion.allocations[0].amount >= suggestion.allocations[1].amount,
    'allocations are sorted high to low');
});

test('offline budget suggestion works with no spending history', () => {
  const context = {
    user: { currency: 'INR' },
    availableCategories: CATEGORIES,
    thisMonth: { byCategory: [] },
  };

  const suggestion = suggestBudgetOffline(context, 20000);
  const sum = suggestion.allocations.reduce((s, a) => s + a.amount, 0);

  assert.ok(suggestion.allocations.length > 0);
  assert.equal(sum, 20000);
});
