'use strict';

const express = require('express');
const ctrl = require('../controllers/budgetController');
const validate = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const v = require('../validators');

const router = express.Router();
router.use(protect);

router.get('/alerts', validate(v.periodQuerySchema, 'query'), ctrl.getAlerts);
router.post('/bulk', validate(v.bulkBudgetSchema), ctrl.bulkUpsertBudgets);

router
  .route('/')
  .get(validate(v.periodQuerySchema, 'query'), ctrl.getBudgets)
  .post(validate(v.createBudgetSchema), ctrl.createBudget);

router
  .route('/:id')
  .put(
    validate(v.idParamSchema, 'params'),
    validate(v.updateBudgetSchema),
    ctrl.updateBudget
  )
  .delete(validate(v.idParamSchema, 'params'), ctrl.deleteBudget);

module.exports = router;
