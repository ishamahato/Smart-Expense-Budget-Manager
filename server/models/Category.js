'use strict';

const mongoose = require('mongoose');

/**
 * Categories are per-user rows (not global lookups) so that a user can rename,
 * recolour or delete any of them, including the ones seeded at registration.
 * `isDefault` only marks provenance — it does not grant special behaviour
 * beyond guarding the "Other" fallback category from deletion.
 */
const categorySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Category name is required'],
      trim: true,
      maxlength: [40, 'Category name cannot exceed 40 characters'],
    },
    icon: { type: String, default: 'Tag', trim: true },
    color: {
      type: String,
      default: '#64748b',
      match: [/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Color must be a hex value'],
    },
    isDefault: { type: Boolean, default: false },
    isSystem: { type: Boolean, default: false }, // "Other" — cannot be deleted
  },
  { timestamps: true, toJSON: { virtuals: true } }
);

// One category name per user; the same name may exist for different users.
categorySchema.index({ userId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Category', categorySchema);
