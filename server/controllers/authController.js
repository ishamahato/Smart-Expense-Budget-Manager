'use strict';

const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { signToken } = require('../utils/token');
const { seedDefaultCategories } = require('../services/category.service');

/** POST /api/auth/register */
const register = asyncHandler(async (req, res) => {
  const { name, email, password, currency } = req.body;

  const existing = await User.findOne({ email });
  if (existing) {
    throw ApiError.conflict('An account with this email already exists');
  }

  const user = await User.create({ name, email, password, currency });

  // Every account starts with its own copy of the default categories so they
  // can be renamed or deleted without affecting anyone else.
  await seedDefaultCategories(user._id);

  res.status(201).json({
    success: true,
    message: 'Account created',
    data: { user: user.toJSON(), token: signToken(user) },
  });
});

/** POST /api/auth/login */
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select('+password');
  // Same message for both branches so the endpoint cannot be used to discover
  // which emails are registered.
  if (!user || !(await user.comparePassword(password))) {
    throw ApiError.unauthorized('Invalid email or password');
  }

  user.lastLoginAt = new Date();
  await user.save({ validateBeforeSave: false });

  res.json({
    success: true,
    message: 'Signed in',
    data: { user: user.toJSON(), token: signToken(user) },
  });
});

/** POST /api/auth/logout — token is discarded client-side. */
const logout = asyncHandler(async (_req, res) => {
  res.json({ success: true, message: 'Signed out' });
});

/** GET /api/auth/me */
const getMe = asyncHandler(async (req, res) => {
  res.json({ success: true, data: { user: req.user.toJSON() } });
});

/** PUT /api/auth/me */
const updateProfile = asyncHandler(async (req, res) => {
  const { name, currency, monthlyIncome, preferences } = req.body;
  const user = req.user;

  if (name !== undefined) user.name = name;
  if (currency !== undefined) user.currency = currency;
  if (monthlyIncome !== undefined) user.monthlyIncome = monthlyIncome;
  if (preferences) {
    if (preferences.alertThreshold !== undefined) {
      user.preferences.alertThreshold = preferences.alertThreshold;
    }
    if (preferences.theme !== undefined) user.preferences.theme = preferences.theme;
  }

  await user.save();
  res.json({ success: true, message: 'Profile updated', data: { user: user.toJSON() } });
});

/** PUT /api/auth/password */
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user._id).select('+password');
  if (!(await user.comparePassword(currentPassword))) {
    throw ApiError.unauthorized('Current password is incorrect');
  }

  user.password = newPassword;
  await user.save();

  // Re-issue so the old token cannot be reused after a password change.
  res.json({
    success: true,
    message: 'Password updated',
    data: { token: signToken(user) },
  });
});

module.exports = { register, login, logout, getMe, updateProfile, changePassword };
