'use strict';

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const compression = require('compression');
const mongoSanitize = require('express-mongo-sanitize');

const config = require('./config/env');
const logger = require('./utils/logger');
const routes = require('./routes');
const { errorHandler, notFound } = require('./middleware/errorHandler');
const { apiLimiter } = require('./middleware/rateLimiters');

const app = express();

// Behind a proxy (Render/Railway/nginx) so rate limiting sees the real client IP.
app.set('trust proxy', 1);

app.use(helmet());
app.use(compression());

app.use(
  cors({
    origin(origin, callback) {
      // Same-origin/curl requests arrive with no Origin header.
      if (!origin || config.clientOrigins.includes(origin)) return callback(null, true);
      // Deny by omitting the CORS headers rather than throwing — throwing here
      // would surface to the client as an opaque 500 instead of a CORS block.
      logger.warn(`Blocked cross-origin request from ${origin}`);
      return callback(null, false);
    },
    credentials: true,
  })
);

app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

// Strips `$`/`.` keys so query objects can't smuggle Mongo operators.
app.use(mongoSanitize({ replaceWith: '_' }));

if (!config.isTest) {
  app.use(morgan(config.isProd ? 'combined' : 'dev'));
}

app.use('/api', apiLimiter, routes);

app.get('/', (_req, res) => {
  res.json({
    name: 'Smart Expense & Budget Manager API',
    version: '1.0.0',
    docs: '/api/health',
  });
});

app.use(notFound);
app.use(errorHandler);

module.exports = app;
