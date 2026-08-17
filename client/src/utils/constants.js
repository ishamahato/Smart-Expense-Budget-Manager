export const PAYMENT_METHODS = [
  { value: 'upi', label: 'UPI' },
  { value: 'card', label: 'Card' },
  { value: 'cash', label: 'Cash' },
  { value: 'netbanking', label: 'Net Banking' },
  { value: 'wallet', label: 'Wallet' },
  { value: 'other', label: 'Other' },
];

export const FREQUENCIES = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
];

export const CURRENCIES = [
  { value: 'INR', label: 'Indian Rupee (₹)' },
  { value: 'USD', label: 'US Dollar ($)' },
  { value: 'EUR', label: 'Euro (€)' },
  { value: 'GBP', label: 'British Pound (£)' },
  { value: 'AED', label: 'UAE Dirham' },
  { value: 'SGD', label: 'Singapore Dollar' },
  { value: 'AUD', label: 'Australian Dollar' },
  { value: 'CAD', label: 'Canadian Dollar' },
  { value: 'JPY', label: 'Japanese Yen (¥)' },
];

export const SORT_OPTIONS = [
  { value: 'date:desc', label: 'Newest first' },
  { value: 'date:asc', label: 'Oldest first' },
  { value: 'amount:desc', label: 'Highest amount' },
  { value: 'amount:asc', label: 'Lowest amount' },
  { value: 'merchant:asc', label: 'Merchant A–Z' },
];

/** Palette used when a category has no colour of its own. */
export const CHART_COLORS = [
  '#6366f1', '#f97316', '#0ea5e9', '#22c55e', '#ec4899',
  '#eab308', '#8b5cf6', '#14b8a6', '#ef4444', '#64748b',
];

export const CATEGORY_ICON_CHOICES = [
  'UtensilsCrossed', 'Car', 'ShoppingBag', 'ReceiptText', 'Home',
  'Clapperboard', 'HeartPulse', 'GraduationCap', 'Plane', 'Gift',
  'Dumbbell', 'Coffee', 'Smartphone', 'PawPrint', 'Tag',
];

export const CATEGORY_COLOR_CHOICES = [
  '#f97316', '#0ea5e9', '#ec4899', '#eab308', '#8b5cf6',
  '#22c55e', '#ef4444', '#14b8a6', '#6366f1', '#64748b',
];

export const BUDGET_STATUS = {
  'on-track': {
    label: 'On track',
    bar: 'bg-emerald-500',
    text: 'text-emerald-600 dark:text-emerald-400',
    chip: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400',
  },
  warning: {
    label: 'Near limit',
    bar: 'bg-amber-500',
    text: 'text-amber-600 dark:text-amber-400',
    chip: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
  },
  exceeded: {
    label: 'Over budget',
    bar: 'bg-rose-500',
    text: 'text-rose-600 dark:text-rose-400',
    chip: 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400',
  },
};
