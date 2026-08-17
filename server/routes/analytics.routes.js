'use strict';

const express = require('express');
const ctrl = require('../controllers/analyticsController');
const validate = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const v = require('../validators');

const router = express.Router();
router.use(protect);
router.use(validate(v.analyticsQuerySchema, 'query'));

router.get('/dashboard', ctrl.getDashboard);
router.get('/monthly', ctrl.getMonthly);
router.get('/categories', ctrl.getCategories);
router.get('/trends', ctrl.getTrends);
router.get('/daily', ctrl.getDaily);
router.get('/merchants', ctrl.getMerchants);
router.get('/comparison', ctrl.getComparison);

module.exports = router;
