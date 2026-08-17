'use strict';

/**
 * Development seed.
 *
 * NOTE: this does not import any external dataset. Every transaction below is
 * generated at run time from the merchant/amount profiles in this file, so the
 * data is synthetic, reproducible (fixed RNG seed) and shaped like real Indian
 * personal spending — daily food, weekday commutes, monthly rent and bills,
 * occasional large purchases.
 *
 *   npm run seed          → adds the demo account if it is missing
 *   npm run seed:fresh    → wipes the demo account first, then reseeds
 */

const mongoose = require('mongoose');
const { connectDB, disconnectDB } = require('../config/db');
const User = require('../models/User');
const Category = require('../models/Category');
const Expense = require('../models/Expense');
const Budget = require('../models/Budget');
const RecurringExpense = require('../models/RecurringExpense');
const { seedDefaultCategories } = require('../services/category.service');
const { currentPeriod, shiftMonth, daysInMonth, advanceDueDate } = require('../utils/dates');
const logger = require('../utils/logger');

const DEMO = {
  name: 'Demo User',
  email: 'demo@expense.app',
  password: 'Demo@1234',
  currency: 'INR',
  monthlyIncome: 85000,
};

const MONTHS_OF_HISTORY = 6;

/* --------------------------- deterministic RNG --------------------------- */
// mulberry32 — small, seeded, so `npm run seed:fresh` reproduces the same data.
let rngState = 20240815;
function rand() {
  rngState |= 0;
  rngState = (rngState + 0x6d2b79f5) | 0;
  let t = Math.imul(rngState ^ (rngState >>> 15), 1 | rngState);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const randInt = (min, max) => Math.floor(rand() * (max - min + 1)) + min;
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const chance = (p) => rand() < p;
/** Rounds to a "human" amount — most real payments are not 437.19. */
const roundish = (n) => {
  const v = Math.round(n);
  return v > 500 ? Math.round(v / 10) * 10 : v;
};

/* ----------------------------- spend profiles ---------------------------- */

const PROFILES = {
  Food: {
    merchants: ['Swiggy', 'Zomato', 'Dominos', 'Blinkit', 'BigBasket', 'Third Wave Coffee', 'Cafe Coffee Day', 'Local Kirana', 'Behrouz Biryani', 'Subway'],
    range: [120, 900],
    perMonth: [16, 24],
    methods: ['upi', 'upi', 'upi', 'card', 'cash'],
  },
  Transport: {
    merchants: ['Uber', 'Ola', 'Rapido', 'Namma Metro', 'HP Petrol Pump', 'Indian Oil', 'IRCTC'],
    range: [45, 700],
    perMonth: [10, 18],
    methods: ['upi', 'upi', 'card'],
  },
  Shopping: {
    merchants: ['Amazon', 'Flipkart', 'Myntra', 'Nykaa', 'Decathlon', 'Croma', 'Zudio'],
    range: [400, 4500],
    perMonth: [2, 5],
    methods: ['card', 'upi', 'card'],
  },
  Bills: {
    merchants: ['BESCOM Electricity', 'ACT Fibernet', 'Airtel Postpaid', 'Jio Fiber', 'Gas Cylinder'],
    range: [299, 2200],
    perMonth: [2, 4],
    methods: ['netbanking', 'upi', 'card'],
  },
  Housing: {
    merchants: ['Monthly Rent', 'Society Maintenance', 'Home Repairs'],
    range: [1500, 3500],
    perMonth: [0, 1],
    methods: ['netbanking', 'upi'],
  },
  Entertainment: {
    merchants: ['Netflix', 'Spotify', 'BookMyShow', 'PVR Cinemas', 'Steam', 'Prime Video'],
    range: [149, 1400],
    perMonth: [2, 5],
    methods: ['card', 'upi'],
  },
  Healthcare: {
    merchants: ['Apollo Pharmacy', 'PharmEasy', 'Practo Consult', 'Cult Fit', '1mg'],
    range: [250, 2500],
    perMonth: [1, 3],
    methods: ['upi', 'card'],
  },
  Education: {
    merchants: ['Udemy', 'Coursera', 'Blinkist', 'Crossword Bookstore'],
    range: [399, 3200],
    perMonth: [0, 2],
    methods: ['card'],
  },
  Other: {
    merchants: ['Gift Purchase', 'Donation', 'Salon', 'Courier'],
    range: [150, 1800],
    perMonth: [1, 3],
    methods: ['upi', 'cash'],
  },
};

/** Month-to-month multiplier so the trend chart is not flat. */
const MONTH_MODIFIERS = [0.88, 1.05, 0.94, 1.18, 0.97, 1.0];

/* ------------------------------ generators ------------------------------- */

function generateExpensesForMonth({ userId, categoryMap, year, month, modifier, isCurrentMonth }) {
  const total = daysInMonth(year, month);
  // Only seed up to today for the current month — future spend would be odd.
  const lastDay = isCurrentMonth ? Math.min(new Date().getDate(), total) : total;
  const docs = [];

  for (const [categoryName, profile] of Object.entries(PROFILES)) {
    const categoryId = categoryMap.get(categoryName);
    if (!categoryId) continue;

    const [minCount, maxCount] = profile.perMonth;
    let count = randInt(minCount, maxCount);
    if (isCurrentMonth) count = Math.round(count * (lastDay / total));

    for (let i = 0; i < count; i += 1) {
      const day = randInt(1, lastDay);
      const date = new Date(year, month - 1, day, randInt(8, 22), randInt(0, 59));

      const [lo, hi] = profile.range;
      let amount = lo + rand() * (hi - lo);
      amount *= modifier;
      // Weekends skew food and entertainment higher.
      if ((date.getDay() === 0 || date.getDay() === 6) &&
          ['Food', 'Entertainment', 'Shopping'].includes(categoryName)) {
        amount *= 1.25;
      }
      // Rare splurge.
      if (chance(0.03)) amount *= 2.4;

      docs.push({
        userId,
        amount: roundish(Math.max(20, amount)),
        merchant: pick(profile.merchants),
        category: categoryId,
        description: '',
        date,
        paymentMethod: pick(profile.methods),
        isRecurring: false,
        source: 'seed',
      });
    }
  }

  return docs;
}

/** Fixed monthly commitments — rent, utilities, subscriptions. */
function generateFixedExpenses({ userId, categoryMap, year, month, isCurrentMonth }) {
  const today = new Date();
  const fixed = [
    { merchant: 'Monthly Rent', category: 'Housing', amount: 22000, day: 3, method: 'netbanking' },
    { merchant: 'Society Maintenance', category: 'Housing', amount: 3200, day: 5, method: 'upi' },
    { merchant: 'ACT Fibernet', category: 'Bills', amount: 1099, day: 7, method: 'card' },
    { merchant: 'Netflix', category: 'Entertainment', amount: 649, day: 12, method: 'card' },
    { merchant: 'Spotify', category: 'Entertainment', amount: 149, day: 14, method: 'card' },
    { merchant: 'BESCOM Electricity', category: 'Bills', amount: 0, day: 9, method: 'netbanking' },
  ];

  return fixed
    .map((f) => {
      const date = new Date(year, month - 1, f.day, 10, 0);
      if (isCurrentMonth && date > today) return null;

      const categoryId = categoryMap.get(f.category);
      if (!categoryId) return null;

      // Electricity varies with the season; the rest are fixed.
      const amount = f.amount || roundish(1200 + rand() * 1600);

      return {
        userId,
        amount,
        merchant: f.merchant,
        category: categoryId,
        description: `${f.merchant} — monthly`,
        date,
        paymentMethod: f.method,
        isRecurring: true,
        source: 'seed',
      };
    })
    .filter(Boolean);
}

function buildBudgets({ userId, categoryMap, year, month }) {
  const plan = {
    Food: 12000,
    Transport: 5000,
    Shopping: 6000,
    Bills: 4000,
    Housing: 26000,
    Entertainment: 2500,
    Healthcare: 2500,
    Education: 2000,
  };

  const rows = Object.entries(plan)
    .filter(([name]) => categoryMap.has(name))
    .map(([name, amount]) => ({
      userId,
      category: categoryMap.get(name),
      amount,
      month,
      year,
      notes: '',
    }));

  rows.push({
    userId,
    category: null,
    amount: Object.values(plan).reduce((s, v) => s + v, 0),
    month,
    year,
    notes: 'Overall monthly cap',
  });

  return rows;
}

function buildRecurring({ userId, categoryMap }) {
  const today = new Date();
  const specs = [
    { merchant: 'Monthly Rent', category: 'Housing', amount: 22000, frequency: 'monthly', day: 3, method: 'netbanking' },
    { merchant: 'BESCOM Electricity', category: 'Bills', amount: 1800, frequency: 'monthly', day: 9, method: 'netbanking', autoPost: false },
    { merchant: 'ACT Fibernet', category: 'Bills', amount: 1099, frequency: 'monthly', day: 7, method: 'card' },
    { merchant: 'Netflix', category: 'Entertainment', amount: 649, frequency: 'monthly', day: 12, method: 'card' },
    { merchant: 'Spotify', category: 'Entertainment', amount: 149, frequency: 'monthly', day: 14, method: 'card' },
    { merchant: 'Cult Fit Membership', category: 'Healthcare', amount: 1499, frequency: 'monthly', day: 20, method: 'upi' },
    { merchant: 'Domain Renewal', category: 'Other', amount: 1200, frequency: 'yearly', day: 18, method: 'card' },
    { merchant: 'Weekly Groceries', category: 'Food', amount: 1600, frequency: 'weekly', day: null, method: 'upi' },
  ];

  return specs
    .filter((s) => categoryMap.has(s.category))
    .map((s) => {
      let nextDueDate;
      if (s.frequency === 'weekly') {
        nextDueDate = new Date(today);
        nextDueDate.setDate(today.getDate() + randInt(1, 6));
      } else {
        nextDueDate = new Date(today.getFullYear(), today.getMonth(), s.day, 10, 0);
        // Roll forward if this month's date has already passed.
        while (nextDueDate <= today) {
          nextDueDate = advanceDueDate(nextDueDate, s.frequency);
        }
      }

      return {
        userId,
        amount: s.amount,
        merchant: s.merchant,
        category: categoryMap.get(s.category),
        description: `${s.merchant} — ${s.frequency}`,
        frequency: s.frequency,
        nextDueDate,
        paymentMethod: s.method,
        isActive: true,
        autoPost: s.autoPost !== false,
      };
    });
}

/* --------------------------------- main ---------------------------------- */

async function seed({ fresh = false } = {}) {
  await connectDB();

  let user = await User.findOne({ email: DEMO.email });

  if (user && fresh) {
    logger.info('Removing existing demo data…');
    await Promise.all([
      Expense.deleteMany({ userId: user._id }),
      Budget.deleteMany({ userId: user._id }),
      RecurringExpense.deleteMany({ userId: user._id }),
      Category.deleteMany({ userId: user._id }),
    ]);
    await User.deleteOne({ _id: user._id });
    user = null;
  }

  if (user) {
    const count = await Expense.countDocuments({ userId: user._id });
    logger.info(
      `Demo account already exists (${count} expenses). Run "npm run seed:fresh" to rebuild it.`
    );
    await disconnectDB();
    return { created: false };
  }

  logger.info('Creating demo account…');
  user = await User.create(DEMO);
  await seedDefaultCategories(user._id);

  const categories = await Category.find({ userId: user._id }).lean();
  const categoryMap = new Map(categories.map((c) => [c.name, c._id]));

  const { year: curYear, month: curMonth } = currentPeriod();
  const expenses = [];

  for (let i = MONTHS_OF_HISTORY - 1; i >= 0; i -= 1) {
    const { year, month } = shiftMonth(curYear, curMonth, -i);
    const isCurrentMonth = i === 0;
    const modifier = MONTH_MODIFIERS[MONTHS_OF_HISTORY - 1 - i] ?? 1;

    expenses.push(
      ...generateExpensesForMonth({
        userId: user._id,
        categoryMap,
        year,
        month,
        modifier,
        isCurrentMonth,
      }),
      ...generateFixedExpenses({
        userId: user._id,
        categoryMap,
        year,
        month,
        isCurrentMonth,
      })
    );
  }

  await Expense.insertMany(expenses);

  // Budgets for this month and last, so the comparison views have data.
  const prev = shiftMonth(curYear, curMonth, -1);
  await Budget.insertMany([
    ...buildBudgets({ userId: user._id, categoryMap, year: curYear, month: curMonth }),
    ...buildBudgets({ userId: user._id, categoryMap, year: prev.year, month: prev.month }),
  ]);

  await RecurringExpense.insertMany(buildRecurring({ userId: user._id, categoryMap }));

  const total = expenses.reduce((s, e) => s + e.amount, 0);
  logger.info('─'.repeat(58));
  logger.info(`  Demo account ready`);
  logger.info(`  Email     : ${DEMO.email}`);
  logger.info(`  Password  : ${DEMO.password}`);
  logger.info(`  Expenses  : ${expenses.length} over ${MONTHS_OF_HISTORY} months (₹${Math.round(total).toLocaleString('en-IN')})`);
  logger.info(`  Categories: ${categories.length}`);
  logger.info(`  Budgets   : 2 months`);
  logger.info('─'.repeat(58));

  await disconnectDB();
  return { created: true, expenses: expenses.length };
}

if (require.main === module) {
  const fresh = process.argv.includes('--fresh');
  seed({ fresh })
    .then(() => process.exit(0))
    .catch(async (err) => {
      logger.error(`Seed failed: ${err.message}`);
      logger.error(err.stack);
      await mongoose.connection.close().catch(() => {});
      process.exit(1);
    });
}

module.exports = { seed, DEMO };
