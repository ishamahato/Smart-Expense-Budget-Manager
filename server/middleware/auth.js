'use strict';

const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { verifyToken } = require('../utils/token');

/**
 * Verifies the bearer token and attaches the live user document to req.user.
 * Every downstream query scopes on `req.user._id`, which is the single
 * mechanism preventing one user from reading another user's data.
 */
const protect = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : null;

  if (!token) {
    throw ApiError.unauthorized('Authentication token missing');
  }

  let payload;
  try {
    payload = verifyToken(token);
  } catch (err) {
    const msg =
      err.name === 'TokenExpiredError'
        ? 'Session expired, please log in again'
        : 'Invalid authentication token';
    throw ApiError.unauthorized(msg);
  }

  // Look the user up on every request so deleted/disabled accounts lose access
  // immediately rather than when their token happens to expire.
  const user = await User.findById(payload.sub);
  if (!user) {
    throw ApiError.unauthorized('The account for this token no longer exists');
  }

  req.user = user;
  return next();
});

module.exports = { protect };
