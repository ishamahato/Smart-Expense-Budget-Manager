import api from './api';

/* ------------------------------- auth -------------------------------- */

export const authService = {
  register: (payload) => api.post('/auth/register', payload).then((r) => r.data.data),
  login: (payload) => api.post('/auth/login', payload).then((r) => r.data.data),
  logout: () => api.post('/auth/logout').then((r) => r.data),
  me: () => api.get('/auth/me').then((r) => r.data.data.user),
  updateProfile: (payload) => api.put('/auth/me', payload).then((r) => r.data.data.user),
  changePassword: (payload) => api.put('/auth/password', payload).then((r) => r.data.data),
};

/* ----------------------------- expenses ------------------------------ */

export const expenseService = {
  list: (params) => api.get('/expenses', { params }).then((r) => r.data.data),
  recent: (limit = 5) =>
    api.get('/expenses/recent', { params: { limit } }).then((r) => r.data.data.items),
  get: (id) => api.get(`/expenses/${id}`).then((r) => r.data.data.expense),
  create: (payload) => api.post('/expenses', payload).then((r) => r.data.data.expense),
  update: (id, payload) => api.put(`/expenses/${id}`, payload).then((r) => r.data.data.expense),
  remove: (id) => api.delete(`/expenses/${id}`).then((r) => r.data),
};

/* ---------------------------- categories ----------------------------- */

export const categoryService = {
  list: () => api.get('/categories').then((r) => r.data.data.items),
  create: (payload) => api.post('/categories', payload).then((r) => r.data.data.category),
  update: (id, payload) =>
    api.put(`/categories/${id}`, payload).then((r) => r.data.data.category),
  remove: (id) => api.delete(`/categories/${id}`).then((r) => r.data),
};

/* ------------------------------ budgets ------------------------------ */

export const budgetService = {
  overview: (params) => api.get('/budgets', { params }).then((r) => r.data.data),
  alerts: (params) => api.get('/budgets/alerts', { params }).then((r) => r.data.data),
  save: (payload) => api.post('/budgets', payload).then((r) => r.data.data.budget),
  update: (id, payload) => api.put(`/budgets/${id}`, payload).then((r) => r.data.data.budget),
  remove: (id) => api.delete(`/budgets/${id}`).then((r) => r.data),
  bulkSave: (payload) => api.post('/budgets/bulk', payload).then((r) => r.data.data),
};

/* ----------------------------- analytics ----------------------------- */

export const analyticsService = {
  dashboard: (params) => api.get('/analytics/dashboard', { params }).then((r) => r.data.data),
  monthly: (params) => api.get('/analytics/monthly', { params }).then((r) => r.data.data),
  categories: (params) => api.get('/analytics/categories', { params }).then((r) => r.data.data),
  trends: (params) => api.get('/analytics/trends', { params }).then((r) => r.data.data),
  daily: (params) => api.get('/analytics/daily', { params }).then((r) => r.data.data),
  merchants: (params) => api.get('/analytics/merchants', { params }).then((r) => r.data.data),
  comparison: (params) => api.get('/analytics/comparison', { params }).then((r) => r.data.data),
};

/* ------------------------- recurring expenses ------------------------ */

export const recurringService = {
  list: () => api.get('/recurring-expenses').then((r) => r.data.data),
  create: (payload) =>
    api.post('/recurring-expenses', payload).then((r) => r.data.data.recurringExpense),
  update: (id, payload) =>
    api.put(`/recurring-expenses/${id}`, payload).then((r) => r.data.data.recurringExpense),
  remove: (id) => api.delete(`/recurring-expenses/${id}`).then((r) => r.data),
  postNow: (id) => api.post(`/recurring-expenses/${id}/post`).then((r) => r.data),
  skip: (id) => api.post(`/recurring-expenses/${id}/skip`).then((r) => r.data),
  processDue: () => api.post('/recurring-expenses/process').then((r) => r.data.data),
};

/* -------------------------------- ai --------------------------------- */

export const aiService = {
  status: () => api.get('/ai/status').then((r) => r.data.data),
  chat: (payload) => api.post('/ai/chat', payload).then((r) => r.data.data),
  parseExpense: (text) => api.post('/ai/parse-expense', { text }).then((r) => r.data.data.parsed),
  suggestBudget: (targetAmount) =>
    api.post('/ai/suggest-budget', { targetAmount }).then((r) => r.data.data.suggestion),
};
