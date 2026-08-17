'use strict';

const mongoose = require('mongoose');
const ApiError = require('../utils/ApiError');
const config = require('../config/env');
const logger = require('../utils/logger');

function notFound(req, _res, next) {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
}

/**
 * Translates the error shapes we actually produce (Mongoose validation, cast
 * errors, duplicate keys, ApiError) into a stable JSON envelope. Anything else
 * is logged in full and reported to the client as a generic 500.
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, _next) {
  let error = err;

  if (err instanceof mongoose.Error.ValidationError) {
    const details = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
    error = ApiError.badRequest('Validation failed', details);
  } else if (err instanceof mongoose.Error.CastError) {
    error = ApiError.badRequest(`Invalid value for '${err.path}'`);
  } else if (err && err.code === 11000) {
    const field = Object.keys(err.keyPattern || { value: 1 })[0];
    error = ApiError.conflict(`A record with this ${field} already exists`);
  } else if (err && err.type === 'entity.parse.failed') {
    error = ApiError.badRequest('Request body is not valid JSON');
  }

  if (!(error instanceof ApiError)) {
    logger.error('Unhandled error:', err && err.stack ? err.stack : err);
    error = new ApiError(500, 'Something went wrong on our end');
  } else if (error.statusCode >= 500) {
    logger.error(`${error.statusCode} ${error.message}`);
  } else {
    logger.debug(`${error.statusCode} ${req.method} ${req.originalUrl} — ${error.message}`);
  }

  const body = {
    success: false,
    message: error.message,
  };
  if (error.details) body.errors = error.details;
  if (!config.isProd && err && err.stack) body.stack = err.stack;

  return res.status(error.statusCode).json(body);
}

module.exports = { errorHandler, notFound };
