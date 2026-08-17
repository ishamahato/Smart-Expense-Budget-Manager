'use strict';

const express = require('express');
const ctrl = require('../controllers/authController');
const validate = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiters');
const v = require('../validators');

const router = express.Router();

router.post('/register', authLimiter, validate(v.registerSchema), ctrl.register);
router.post('/login', authLimiter, validate(v.loginSchema), ctrl.login);
router.post('/logout', protect, ctrl.logout);

router.get('/me', protect, ctrl.getMe);
router.put('/me', protect, validate(v.updateProfileSchema), ctrl.updateProfile);
router.put(
  '/password',
  protect,
  authLimiter,
  validate(v.changePasswordSchema),
  ctrl.changePassword
);

module.exports = router;
