'use strict';

const rateLimit = require('express-rate-limit');
const config = require('../config/env');

const base = {
  standardHeaders: true,
  legacyHeaders: false,
  // Disabled under test so the suite is not throttled by its own traffic.
  skip: () => config.isTest,
};

/** Broad protection for the whole API surface. */
const apiLimiter = rateLimit({
  ...base,
  windowMs: 15 * 60 * 1000,
  max: 600,
  message: { success: false, message: 'Too many requests, please slow down' },
});

/** Tight limit on credential endpoints to blunt password guessing. */
const authLimiter = rateLimit({
  ...base,
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: {
    success: false,
    message: 'Too many authentication attempts. Try again in 15 minutes.',
  },
});

/** Gemini calls cost money — keep a per-IP ceiling. */
const aiLimiter = rateLimit({
  ...base,
  windowMs: 60 * 1000,
  max: 20,
  message: {
    success: false,
    message: 'AI assistant rate limit reached. Please wait a moment.',
  },
});

module.exports = { apiLimiter, authLimiter, aiLimiter };
