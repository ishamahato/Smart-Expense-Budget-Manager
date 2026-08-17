'use strict';

const express = require('express');
const mongoose = require('mongoose');
const gemini = require('../services/gemini.service');

const router = express.Router();

router.get('/health', (_req, res) => {
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  res.json({
    success: true,
    status: 'ok',
    uptime: Math.round(process.uptime()),
    database: states[mongoose.connection.readyState] || 'unknown',
    // Whether a key exists — never the key itself.
    ai: gemini.isEnabled() ? 'configured' : 'not-configured',
    timestamp: new Date().toISOString(),
  });
});

router.use('/auth', require('./auth.routes'));
router.use('/expenses', require('./expense.routes'));
router.use('/categories', require('./category.routes'));
router.use('/budgets', require('./budget.routes'));
router.use('/analytics', require('./analytics.routes'));
router.use('/recurring-expenses', require('./recurring.routes'));
router.use('/ai', require('./ai.routes'));

module.exports = router;
