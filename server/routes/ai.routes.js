'use strict';

const express = require('express');
const ctrl = require('../controllers/aiController');
const validate = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const { aiLimiter } = require('../middleware/rateLimiters');
const v = require('../validators');

const router = express.Router();
router.use(protect);

router.get('/status', ctrl.status);
router.post('/chat', aiLimiter, validate(v.chatSchema), ctrl.chat);
router.post('/parse-expense', aiLimiter, validate(v.parseExpenseSchema), ctrl.parseExpense);
router.post('/suggest-budget', aiLimiter, validate(v.suggestBudgetSchema), ctrl.suggestBudget);

module.exports = router;
