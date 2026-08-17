'use strict';

/**
 * Integration tests against a real MongoDB.
 *
 * These run on a throwaway database (`<name>-test`) that is dropped on exit.
 * If no MongoDB is reachable the whole suite is skipped rather than failed, so
 * `npm test` still passes on a machine without a local server.
 */

process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error';

const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const config = require('../config/env');
const app = require('../app');

const TEST_URI = `${config.mongoUri.replace(/\/?$/, '')}-test`;

let server;
let baseUrl;
let available = true;

/* ------------------------------- helpers -------------------------------- */

async function api(path, { method = 'GET', token, body } = {}) {
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, body: json };
}

function unique(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}@test.local`;
}

async function makeUser(name = 'Test User') {
  const { status, body } = await api('/api/auth/register', {
    method: 'POST',
    body: { name, email: unique('user'), password: 'Password123' },
  });
  assert.equal(status, 201, `registration failed: ${JSON.stringify(body)}`);
  return { token: body.data.token, user: body.data.user };
}

async function firstCategory(token) {
  const { body } = await api('/api/categories', { token });
  return body.data.items[0];
}

/* -------------------------------- setup --------------------------------- */

test.before(async () => {
  try {
    await mongoose.connect(TEST_URI, { serverSelectionTimeoutMS: 3000 });
    await mongoose.connection.dropDatabase();
    server = app.listen(0);
    await new Promise((resolve) => server.once('listening', resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}`;
  } catch {
    available = false;
    // eslint-disable-next-line no-console
    console.warn('\n  ⚠  MongoDB not reachable — skipping integration tests.\n');
  }
});

test.after(async () => {
  if (!available) return;
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  await new Promise((resolve) => server.close(resolve));
});

const maybe = (name, fn) =>
  test(name, { skip: !available && 'MongoDB unavailable' }, fn);

/* ----------------------------- health & auth ---------------------------- */

maybe('GET /api/health reports a connected database', async () => {
  const { status, body } = await api('/api/health');
  assert.equal(status, 200);
  assert.equal(body.database, 'connected');
});

maybe('registration returns a token and seeds default categories', async () => {
  const { token, user } = await makeUser('Priya Sharma');

  assert.ok(token);
  assert.equal(user.name, 'Priya Sharma');
  assert.equal(user.password, undefined, 'password must never be returned');

  const { body } = await api('/api/categories', { token });
  const names = body.data.items.map((c) => c.name);
  assert.equal(names.length, 9);
  for (const expected of ['Food', 'Transport', 'Bills', 'Housing', 'Other']) {
    assert.ok(names.includes(expected), `missing default category ${expected}`);
  }
});

maybe('registration rejects a weak password', async () => {
  const { status, body } = await api('/api/auth/register', {
    method: 'POST',
    body: { name: 'Weak', email: unique('weak'), password: 'short' },
  });
  assert.equal(status, 400);
  assert.ok(body.errors.some((e) => e.field === 'password'));
});

maybe('registration rejects a duplicate email', async () => {
  const email = unique('dupe');
  const payload = { name: 'First', email, password: 'Password123' };

  assert.equal((await api('/api/auth/register', { method: 'POST', body: payload })).status, 201);
  const second = await api('/api/auth/register', { method: 'POST', body: payload });
  assert.equal(second.status, 409);
});

maybe('login rejects a wrong password without revealing the cause', async () => {
  const email = unique('login');
  await api('/api/auth/register', {
    method: 'POST',
    body: { name: 'Login Test', email, password: 'Password123' },
  });

  const { status, body } = await api('/api/auth/login', {
    method: 'POST',
    body: { email, password: 'WrongPassword1' },
  });

  assert.equal(status, 401);
  assert.equal(body.message, 'Invalid email or password');
});

maybe('login is not bypassable with an operator injection payload', async () => {
  const { status } = await api('/api/auth/login', {
    method: 'POST',
    body: { email: { $ne: null }, password: { $ne: null } },
  });
  assert.equal(status, 400, 'operator objects must be rejected by validation');
});

maybe('protected routes reject missing and malformed tokens', async () => {
  assert.equal((await api('/api/expenses')).status, 401);
  assert.equal((await api('/api/expenses', { token: 'not-a-jwt' })).status, 401);
});

/* ------------------------------- expenses ------------------------------- */

maybe('creates, reads, updates and deletes an expense', async () => {
  const { token } = await makeUser();
  const category = await firstCategory(token);

  const created = await api('/api/expenses', {
    method: 'POST',
    token,
    body: { amount: 450, merchant: 'Swiggy', category: category._id, paymentMethod: 'upi' },
  });
  assert.equal(created.status, 201);
  const id = created.body.data.expense._id;
  assert.equal(created.body.data.expense.amount, 450);

  const read = await api(`/api/expenses/${id}`, { token });
  assert.equal(read.status, 200);
  assert.equal(read.body.data.expense.merchant, 'Swiggy');

  const updated = await api(`/api/expenses/${id}`, {
    method: 'PUT',
    token,
    body: { amount: 525 },
  });
  assert.equal(updated.body.data.expense.amount, 525);

  assert.equal((await api(`/api/expenses/${id}`, { method: 'DELETE', token })).status, 200);
  assert.equal((await api(`/api/expenses/${id}`, { token })).status, 404);
});

maybe('rejects invalid expense payloads with field-level errors', async () => {
  const { token } = await makeUser();

  const { status, body } = await api('/api/expenses', {
    method: 'POST',
    token,
    body: { amount: -5, merchant: '', category: 'not-an-id' },
  });

  assert.equal(status, 400);
  const fields = body.errors.map((e) => e.field);
  assert.ok(fields.includes('amount'));
  assert.ok(fields.includes('merchant'));
  assert.ok(fields.includes('category'));
});

maybe('search, category filter and sorting all narrow the result set', async () => {
  const { token } = await makeUser();
  const categories = (await api('/api/categories', { token })).body.data.items;
  const food = categories.find((c) => c.name === 'Food');
  const transport = categories.find((c) => c.name === 'Transport');

  const rows = [
    { amount: 450, merchant: 'Swiggy', category: food._id },
    { amount: 1200, merchant: 'Zomato', category: food._id },
    { amount: 850, merchant: 'Uber', category: transport._id },
  ];
  for (const row of rows) {
    await api('/api/expenses', { method: 'POST', token, body: row });
  }

  const all = await api('/api/expenses', { token });
  assert.equal(all.body.data.pagination.total, 3);
  assert.equal(all.body.data.filteredTotal, 2500);

  const search = await api('/api/expenses?search=uber', { token });
  assert.equal(search.body.data.pagination.total, 1);
  assert.equal(search.body.data.items[0].merchant, 'Uber');

  const byCategory = await api(`/api/expenses?category=${food._id}`, { token });
  assert.equal(byCategory.body.data.pagination.total, 2);
  assert.equal(byCategory.body.data.filteredTotal, 1650);

  const sorted = await api('/api/expenses?sortBy=amount&order=desc', { token });
  const amounts = sorted.body.data.items.map((e) => e.amount);
  assert.deepEqual(amounts, [1200, 850, 450]);

  const ranged = await api('/api/expenses?minAmount=800&maxAmount=1300', { token });
  assert.equal(ranged.body.data.pagination.total, 2);
});

/* ---------------------------- data isolation ---------------------------- */

maybe('one user cannot read, edit or delete another user\'s expense', async () => {
  const alice = await makeUser('Alice');
  const mallory = await makeUser('Mallory');

  const category = await firstCategory(alice.token);
  const created = await api('/api/expenses', {
    method: 'POST',
    token: alice.token,
    body: { amount: 999, merchant: 'Alice Only', category: category._id },
  });
  const id = created.body.data.expense._id;

  assert.equal((await api(`/api/expenses/${id}`, { token: mallory.token })).status, 404);
  assert.equal(
    (await api(`/api/expenses/${id}`, { method: 'PUT', token: mallory.token, body: { amount: 1 } }))
      .status,
    404
  );
  assert.equal(
    (await api(`/api/expenses/${id}`, { method: 'DELETE', token: mallory.token })).status,
    404
  );

  // Alice's record is untouched.
  const still = await api(`/api/expenses/${id}`, { token: alice.token });
  assert.equal(still.body.data.expense.amount, 999);

  // Mallory's own list stays empty.
  const list = await api('/api/expenses', { token: mallory.token });
  assert.equal(list.body.data.pagination.total, 0);
});

maybe('an expense cannot be filed against another user\'s category', async () => {
  const alice = await makeUser('Alice');
  const mallory = await makeUser('Mallory');
  const aliceCategory = await firstCategory(alice.token);

  const { status, body } = await api('/api/expenses', {
    method: 'POST',
    token: mallory.token,
    body: { amount: 100, merchant: 'Probe', category: aliceCategory._id },
  });

  assert.equal(status, 400);
  assert.match(body.message, /not found in your account/i);
});

maybe('analytics only ever aggregate the requesting user', async () => {
  const alice = await makeUser('Alice');
  const bob = await makeUser('Bob');

  const aliceCategory = await firstCategory(alice.token);
  const bobCategory = await firstCategory(bob.token);

  await api('/api/expenses', {
    method: 'POST',
    token: alice.token,
    body: { amount: 5000, merchant: 'Alice Shop', category: aliceCategory._id },
  });
  await api('/api/expenses', {
    method: 'POST',
    token: bob.token,
    body: { amount: 300, merchant: 'Bob Shop', category: bobCategory._id },
  });

  const aliceSummary = await api('/api/analytics/monthly', { token: alice.token });
  const bobSummary = await api('/api/analytics/monthly', { token: bob.token });

  assert.equal(aliceSummary.body.data.totals.total, 5000);
  assert.equal(bobSummary.body.data.totals.total, 300);
});

/* -------------------------------- budgets ------------------------------- */

maybe('budget overview joins limits against real spending', async () => {
  const { token } = await makeUser();
  const categories = (await api('/api/categories', { token })).body.data.items;
  const food = categories.find((c) => c.name === 'Food');

  const now = new Date();
  const period = { month: now.getMonth() + 1, year: now.getFullYear() };

  await api('/api/budgets', {
    method: 'POST',
    token,
    body: { category: food._id, amount: 5000, ...period },
  });
  await api('/api/expenses', {
    method: 'POST',
    token,
    body: { amount: 4200, merchant: 'Swiggy', category: food._id },
  });

  const { body } = await api('/api/budgets', { token });
  const row = body.data.categories.find((c) => c.name === 'Food');

  assert.equal(row.amount, 5000);
  assert.equal(row.spent, 4200);
  assert.equal(row.remaining, 800);
  assert.equal(row.percentage, 84);
  assert.equal(row.status, 'warning');
  assert.ok(body.data.alerts.some((a) => a.category === 'Food'));
});

maybe('exceeding a budget produces a danger alert', async () => {
  const { token } = await makeUser();
  const categories = (await api('/api/categories', { token })).body.data.items;
  const bills = categories.find((c) => c.name === 'Bills');
  const now = new Date();

  await api('/api/budgets', {
    method: 'POST',
    token,
    body: { category: bills._id, amount: 1000, month: now.getMonth() + 1, year: now.getFullYear() },
  });
  await api('/api/expenses', {
    method: 'POST',
    token,
    body: { amount: 1500, merchant: 'Electricity', category: bills._id },
  });

  const { body } = await api('/api/budgets/alerts', { token });
  const alert = body.data.alerts.find((a) => a.category === 'Bills');

  assert.equal(alert.level, 'danger');
  assert.equal(alert.overBy, 500);
});

maybe('posting the same period twice updates rather than duplicates', async () => {
  const { token } = await makeUser();
  const category = await firstCategory(token);
  const now = new Date();
  const period = { month: now.getMonth() + 1, year: now.getFullYear() };

  await api('/api/budgets', {
    method: 'POST',
    token,
    body: { category: category._id, amount: 3000, ...period },
  });
  await api('/api/budgets', {
    method: 'POST',
    token,
    body: { category: category._id, amount: 4500, ...period },
  });

  const { body } = await api('/api/budgets', { token });
  const matching = body.data.categories.filter((c) => String(c.categoryId) === String(category._id));

  assert.equal(matching.length, 1, 'the budget must be upserted, not duplicated');
  assert.equal(matching[0].amount, 4500);
});

/* ------------------------------- categories ----------------------------- */

maybe('deleting a category reassigns its expenses to Other', async () => {
  const { token } = await makeUser();

  const created = await api('/api/categories', {
    method: 'POST',
    token,
    body: { name: 'Travel', color: '#14b8a6' },
  });
  const travel = created.body.data.category;

  await api('/api/expenses', {
    method: 'POST',
    token,
    body: { amount: 7000, merchant: 'IndiGo', category: travel._id },
  });

  const removed = await api(`/api/categories/${travel._id}`, { method: 'DELETE', token });
  assert.equal(removed.status, 200);
  assert.equal(removed.body.data.reassignedExpenses, 1);

  const expenses = await api('/api/expenses', { token });
  assert.equal(expenses.body.data.pagination.total, 1, 'the expense must survive');
  assert.equal(expenses.body.data.items[0].category.name, 'Other');
});

maybe('the system "Other" category cannot be deleted', async () => {
  const { token } = await makeUser();
  const categories = (await api('/api/categories', { token })).body.data.items;
  const other = categories.find((c) => c.name === 'Other');

  const { status } = await api(`/api/categories/${other._id}`, { method: 'DELETE', token });
  assert.equal(status, 400);
});

/* --------------------------- recurring expenses ------------------------- */

maybe('recording a recurring expense creates an expense and rolls the due date', async () => {
  const { token } = await makeUser();
  const category = await firstCategory(token);

  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() - 1); // already due

  const created = await api('/api/recurring-expenses', {
    method: 'POST',
    token,
    body: {
      merchant: 'Monthly Rent',
      amount: 22000,
      category: category._id,
      frequency: 'monthly',
      nextDueDate: dueDate.toISOString(),
      autoPost: false,
    },
  });
  assert.equal(created.status, 201);
  const id = created.body.data.recurringExpense._id;

  const posted = await api(`/api/recurring-expenses/${id}/post`, { method: 'POST', token });
  assert.equal(posted.status, 201);
  assert.equal(posted.body.data.created, 1);

  const expenses = await api('/api/expenses', { token });
  assert.equal(expenses.body.data.pagination.total, 1);
  assert.equal(expenses.body.data.items[0].isRecurring, true);

  const after = new Date(posted.body.data.recurringExpense.nextDueDate);
  assert.ok(after > dueDate, 'the due date must move forward');
});

maybe('deleting a recurring template keeps the expenses it already produced', async () => {
  const { token } = await makeUser();
  const category = await firstCategory(token);
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() - 1);

  const created = await api('/api/recurring-expenses', {
    method: 'POST',
    token,
    body: {
      merchant: 'Internet',
      amount: 1099,
      category: category._id,
      frequency: 'monthly',
      nextDueDate: dueDate.toISOString(),
      autoPost: false,
    },
  });
  const id = created.body.data.recurringExpense._id;
  await api(`/api/recurring-expenses/${id}/post`, { method: 'POST', token });

  await api(`/api/recurring-expenses/${id}`, { method: 'DELETE', token });

  const expenses = await api('/api/expenses', { token });
  assert.equal(expenses.body.data.pagination.total, 1, 'history must be preserved');
});

/* ---------------------------------- ai ---------------------------------- */

maybe('the AI parser returns a draft scoped to the user\'s own categories', async () => {
  const { token } = await makeUser();

  const { status, body } = await api('/api/ai/parse-expense', {
    method: 'POST',
    token,
    body: { text: 'paid 450 to dominos yesterday' },
  });

  assert.equal(status, 200);
  const parsed = body.data.parsed;
  assert.equal(parsed.amount, 450);
  assert.equal(parsed.merchant, 'Dominos');

  const names = (await api('/api/categories', { token })).body.data.items.map((c) => c.name);
  assert.ok(names.includes(parsed.category), 'category must exist in this account');
});

maybe('the AI chat answers from the caller\'s data only', async () => {
  const alice = await makeUser('Alice');
  const bob = await makeUser('Bob');

  const aliceCategory = await firstCategory(alice.token);
  await api('/api/expenses', {
    method: 'POST',
    token: alice.token,
    body: { amount: 12345, merchant: 'Alice Secret Shop', category: aliceCategory._id },
  });

  const reply = await api('/api/ai/chat', {
    method: 'POST',
    token: bob.token,
    body: { message: 'Summarize my spending' },
  });

  assert.equal(reply.status, 200);
  assert.ok(
    !reply.body.data.reply.includes('12345') &&
      !reply.body.data.reply.includes('Alice Secret Shop'),
    "another user's data must never appear in the reply"
  );
});

maybe('the AI endpoints never leak the Gemini key', async () => {
  const { token } = await makeUser();
  const { body } = await api('/api/ai/status', { token });

  assert.equal(typeof body.data.geminiConfigured, 'boolean');
  assert.ok(!JSON.stringify(body).toLowerCase().includes('gemini_api_key'));
});
