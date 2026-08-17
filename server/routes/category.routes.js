'use strict';

const express = require('express');
const ctrl = require('../controllers/categoryController');
const validate = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const v = require('../validators');

const router = express.Router();
router.use(protect);

router
  .route('/')
  .get(ctrl.listCategories)
  .post(validate(v.createCategorySchema), ctrl.createCategory);

router
  .route('/:id')
  .put(
    validate(v.idParamSchema, 'params'),
    validate(v.updateCategorySchema),
    ctrl.updateCategory
  )
  .delete(validate(v.idParamSchema, 'params'), ctrl.deleteCategory);

module.exports = router;
