'use strict';

/**
 * Operational error carrying an HTTP status. Anything thrown that is not an
 * ApiError is treated as an unexpected failure by the error handler and is not
 * echoed back to the client.
 */
class ApiError extends Error {
  constructor(statusCode, message, details = undefined) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.isOperational = true;
    if (details) this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(msg = 'Bad request', details) {
    return new ApiError(400, msg, details);
  }
  static unauthorized(msg = 'Not authenticated') {
    return new ApiError(401, msg);
  }
  static forbidden(msg = 'Not authorized to access this resource') {
    return new ApiError(403, msg);
  }
  static notFound(msg = 'Resource not found') {
    return new ApiError(404, msg);
  }
  static conflict(msg = 'Resource already exists') {
    return new ApiError(409, msg);
  }
  static tooMany(msg = 'Too many requests') {
    return new ApiError(429, msg);
  }
  static serviceUnavailable(msg = 'Upstream service unavailable') {
    return new ApiError(503, msg);
  }
}

module.exports = ApiError;
