'use strict';

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const config = require('../config/env');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [80, 'Name cannot exceed 80 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please provide a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      // Never returned unless explicitly selected — see authController.login
      select: false,
    },
    currency: {
      type: String,
      default: 'INR',
      enum: ['INR', 'USD', 'EUR', 'GBP', 'AED', 'SGD', 'AUD', 'CAD', 'JPY'],
    },
    monthlyIncome: {
      type: Number,
      default: 0,
      min: [0, 'Monthly income cannot be negative'],
    },
    preferences: {
      alertThreshold: {
        type: Number,
        default: 80,
        min: 50,
        max: 100,
      },
      theme: { type: String, enum: ['light', 'dark', 'system'], default: 'system' },
    },
    lastLoginAt: Date,
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(_doc, ret) {
        delete ret.password;
        delete ret.__v;
        return ret;
      },
    },
  }
);

userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(config.bcryptRounds);
  this.password = await bcrypt.hash(this.password, salt);
  return next();
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

module.exports = mongoose.model('User', userSchema);
