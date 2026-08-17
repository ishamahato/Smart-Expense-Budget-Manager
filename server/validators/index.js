'use strict';

const { z } = require('zod');
const { PAYMENT_METHODS } = require('../models/Expense');
const { FREQUENCIES } = require('../models/RecurringExpense');

const objectId = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, 'Must be a valid id');

const isoDate = z
  .string()
  .refine((v) => !Number.isNaN(Date.parse(v)), 'Must be a valid date')
  .transform((v) => new Date(v));

const money = z
  .coerce.number({ invalid_type_error: 'Must be a number' })
  .positive('Must be greater than zero')
  .max(100000000, 'Amount is unrealistically large');

const monthNum = z.coerce.number().int().min(1).max(12);
const yearNum = z.coerce.number().int().min(2000).max(2100);

/* ---------------------------- auth ---------------------------- */

const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(80),
  email: z.string().trim().toLowerCase().email('Please provide a valid email'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password is too long')
    .regex(/[a-zA-Z]/, 'Password must contain at least one letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  currency: z.enum(['INR', 'USD', 'EUR', 'GBP', 'AED', 'SGD', 'AUD', 'CAD', 'JPY']).optional(),
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Please provide a valid email'),
  password: z.string().min(1, 'Password is required'),
});

const updateProfileSchema = z
  .object({
    name: z.string().trim().min(2).max(80).optional(),
    currency: z.enum(['INR', 'USD', 'EUR', 'GBP', 'AED', 'SGD', 'AUD', 'CAD', 'JPY']).optional(),
    monthlyIncome: z.coerce.number().min(0).max(1000000000).optional(),
    preferences: z
      .object({
        alertThreshold: z.coerce.number().int().min(50).max(100).optional(),
        theme: z.enum(['light', 'dark', 'system']).optional(),
      })
      .optional(),
  })
  .refine((d) => Object.keys(d).length > 0, 'No fields to update');

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(8, 'New password must be at least 8 characters')
    .max(128)
    .regex(/[a-zA-Z]/, 'Password must contain at least one letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});

/* -------------------------- expenses -------------------------- */

const expenseBase = {
  amount: money,
  merchant: z.string().trim().min(1, 'Merchant is required').max(120),
  category: objectId,
  description: z.string().trim().max(500).optional().default(''),
  date: isoDate.optional(),
  paymentMethod: z.enum(PAYMENT_METHODS).optional().default('upi'),
  isRecurring: z.coerce.boolean().optional().default(false),
  tags: z.array(z.string().trim().max(30)).max(10).optional(),
};

const createExpenseSchema = z.object(expenseBase);

const updateExpenseSchema = z
  .object({
    amount: money.optional(),
    merchant: z.string().trim().min(1).max(120).optional(),
    category: objectId.optional(),
    description: z.string().trim().max(500).optional(),
    date: isoDate.optional(),
    paymentMethod: z.enum(PAYMENT_METHODS).optional(),
    isRecurring: z.coerce.boolean().optional(),
    tags: z.array(z.string().trim().max(30)).max(10).optional(),
  })
  .refine((d) => Object.keys(d).length > 0, 'No fields to update');

const listExpensesQuerySchema = z.object({
  search: z.string().trim().max(120).optional(),
  category: objectId.optional(),
  paymentMethod: z.enum(PAYMENT_METHODS).optional(),
  month: monthNum.optional(),
  year: yearNum.optional(),
  startDate: isoDate.optional(),
  endDate: isoDate.optional(),
  minAmount: z.coerce.number().min(0).optional(),
  maxAmount: z.coerce.number().min(0).optional(),
  isRecurring: z.enum(['true', 'false']).optional(),
  sortBy: z.enum(['date', 'amount', 'merchant', 'createdAt']).optional().default('date'),
  order: z.enum(['asc', 'desc']).optional().default('desc'),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

/* ------------------------- categories ------------------------- */

const createCategorySchema = z.object({
  name: z.string().trim().min(1, 'Category name is required').max(40),
  icon: z.string().trim().max(40).optional(),
  color: z
    .string()
    .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Color must be a hex value like #f97316')
    .optional(),
});

const updateCategorySchema = createCategorySchema.partial().refine(
  (d) => Object.keys(d).length > 0,
  'No fields to update'
);

/* --------------------------- budgets -------------------------- */

const createBudgetSchema = z.object({
  category: objectId.nullable().optional(),
  amount: money,
  month: monthNum,
  year: yearNum,
  notes: z.string().trim().max(300).optional().default(''),
});

const updateBudgetSchema = z
  .object({
    amount: money.optional(),
    notes: z.string().trim().max(300).optional(),
  })
  .refine((d) => Object.keys(d).length > 0, 'No fields to update');

const bulkBudgetSchema = z.object({
  month: monthNum,
  year: yearNum,
  overall: money.nullable().optional(),
  budgets: z
    .array(
      z.object({
        category: objectId,
        amount: money,
      })
    )
    .max(50),
});

const periodQuerySchema = z.object({
  month: monthNum.optional(),
  year: yearNum.optional(),
});

/* ---------------------- recurring expenses -------------------- */

const createRecurringSchema = z.object({
  amount: money,
  merchant: z.string().trim().min(1, 'Merchant is required').max(120),
  category: objectId,
  description: z.string().trim().max(500).optional().default(''),
  frequency: z.enum(FREQUENCIES),
  nextDueDate: isoDate,
  paymentMethod: z.enum(PAYMENT_METHODS).optional().default('upi'),
  autoPost: z.coerce.boolean().optional().default(true),
  endDate: isoDate.nullable().optional(),
});

const updateRecurringSchema = z
  .object({
    amount: money.optional(),
    merchant: z.string().trim().min(1).max(120).optional(),
    category: objectId.optional(),
    description: z.string().trim().max(500).optional(),
    frequency: z.enum(FREQUENCIES).optional(),
    nextDueDate: isoDate.optional(),
    paymentMethod: z.enum(PAYMENT_METHODS).optional(),
    autoPost: z.coerce.boolean().optional(),
    isActive: z.coerce.boolean().optional(),
    endDate: isoDate.nullable().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, 'No fields to update');

/* ------------------------- analytics -------------------------- */

const analyticsQuerySchema = z.object({
  month: monthNum.optional(),
  year: yearNum.optional(),
  months: z.coerce.number().int().min(2).max(24).optional().default(6),
  startDate: isoDate.optional(),
  endDate: isoDate.optional(),
  limit: z.coerce.number().int().min(1).max(50).optional().default(10),
});

/* ----------------------------- ai ----------------------------- */

const chatSchema = z.object({
  message: z.string().trim().min(1, 'Message is required').max(1000),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'model', 'assistant']),
        text: z.string().max(4000),
      })
    )
    .max(20)
    .optional()
    .default([]),
});

const parseExpenseSchema = z.object({
  text: z.string().trim().min(3, 'Describe the expense in a few words').max(500),
});

const suggestBudgetSchema = z.object({
  targetAmount: z.coerce.number().int().min(100).max(100000000),
});

const idParamSchema = z.object({ id: objectId });

module.exports = {
  objectId,
  registerSchema,
  loginSchema,
  updateProfileSchema,
  changePasswordSchema,
  createExpenseSchema,
  updateExpenseSchema,
  listExpensesQuerySchema,
  createCategorySchema,
  updateCategorySchema,
  createBudgetSchema,
  updateBudgetSchema,
  bulkBudgetSchema,
  periodQuerySchema,
  createRecurringSchema,
  updateRecurringSchema,
  analyticsQuerySchema,
  chatSchema,
  parseExpenseSchema,
  suggestBudgetSchema,
  idParamSchema,
};
