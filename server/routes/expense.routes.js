'use strict';

const express = require('express');
const ctrl = require('../controllers/expenseController');
const validate = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const v = require('../validators');

const router = express.Router();

// Every route below requires a valid token; controllers scope on req.user._id.
router.use(protect);

router.get('/recent', ctrl.getRecentExpenses);

router
  .route('/')
  .get(validate(v.listExpensesQuerySchema, 'query'), ctrl.listExpenses)
  .post(validate(v.createExpenseSchema), ctrl.createExpense);

router
  .route('/:id')
  .get(validate(v.idParamSchema, 'params'), ctrl.getExpense)
  .put(
    validate(v.idParamSchema, 'params'),
    validate(v.updateExpenseSchema),
    ctrl.updateExpense
  )
  .delete(validate(v.idParamSchema, 'params'), ctrl.deleteExpense);

module.exports = router;
