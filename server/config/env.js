'use strict';

const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const NODE_ENV = process.env.NODE_ENV || 'development';

/**
 * Fail fast on missing secrets. In development we fall back to a well-known
 * value so `npm run dev` works out of the box, but production must be explicit.
 */
function required(name, devFallback) {
  const value = process.env[name];
  if (value && value.trim()) return value.trim();

  if (NODE_ENV === 'production') {
    // eslint-disable-next-line no-console
    console.error(`[config] Missing required environment variable: ${name}`);
    process.exit(1);
  }
  return devFallback;
}

const config = {
  env: NODE_ENV,
  isProd: NODE_ENV === 'production',
  isTest: NODE_ENV === 'test',
  // 5050 rather than 5000: macOS reserves 5000 for the AirPlay receiver.
  port: Number(process.env.PORT) || 5050,

  mongoUri: required(
    'MONGO_URI',
    'mongodb://127.0.0.1:27017/smart-expense-manager'
  ),

  jwt: {
    secret: required('JWT_SECRET', 'dev-only-insecure-jwt-secret-change-me'),
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  clientOrigins: (process.env.CLIENT_ORIGIN || 'http://localhost:5174')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),

  gemini: {
    apiKey: process.env.GEMINI_API_KEY || '',
    model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
    baseUrl:
      process.env.GEMINI_BASE_URL ||
      'https://generativelanguage.googleapis.com/v1beta',
    timeoutMs: Number(process.env.GEMINI_TIMEOUT_MS) || 30000,
    get enabled() {
      return Boolean(process.env.GEMINI_API_KEY);
    },
  },

  // Automatically materialise due recurring expenses into real expenses.
  recurring: {
    cronEnabled: process.env.RECURRING_CRON !== 'false',
    // Every day at 02:00 server time.
    cronSchedule: process.env.RECURRING_CRON_SCHEDULE || '0 2 * * *',
  },

  bcryptRounds: Number(process.env.BCRYPT_ROUNDS) || 12,
};

module.exports = config;
