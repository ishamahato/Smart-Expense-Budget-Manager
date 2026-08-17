'use strict';

const express = require('express');
const ctrl = require('../controllers/recurringController');
const validate = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const v = require('../validators');

const router = express.Router();
router.use(protect);

router.post('/process', ctrl.processDue);

router
  .route('/')
  .get(ctrl.listRecurring)
  .post(validate(v.createRecurringSchema), ctrl.createRecurring);

router.post('/:id/post', validate(v.idParamSchema, 'params'), ctrl.postNow);
router.post('/:id/skip', validate(v.idParamSchema, 'params'), ctrl.skipNext);

router
  .route('/:id')
  .get(validate(v.idParamSchema, 'params'), ctrl.getRecurring)
  .put(
    validate(v.idParamSchema, 'params'),
    validate(v.updateRecurringSchema),
    ctrl.updateRecurring
  )
  .delete(validate(v.idParamSchema, 'params'), ctrl.deleteRecurring);

module.exports = router;
