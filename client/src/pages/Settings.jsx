import { useState } from 'react';
import {
  Bell,
  KeyRound,
  Monitor,
  Moon,
  Palette,
  Plus,
  Save,
  Sun,
  Tag,
  Trash2,
  User as UserIcon,
} from 'lucide-react';
import { authService, categoryService } from '../services';
import {
  useAsync,
  useAuth,
  useConfirm,
  useDocumentTitle,
  useTheme,
  useToast,
} from '../hooks';
import { CATEGORY_COLOR_CHOICES, CATEGORY_ICON_CHOICES, CURRENCIES } from '../utils/constants';
import { currencyMeta, formatMoney } from '../utils/format';
import PageHeader from '../components/ui/PageHeader';
import Card, { CardHeader } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import { Input, Select } from '../components/ui/Field';
import CategoryIcon from '../components/ui/CategoryIcon';
import { Badge, EmptyState } from '../components/ui/Feedback';
import cn from '../utils/cn';

const TABS = [
  { key: 'profile', label: 'Profile', icon: UserIcon },
  { key: 'categories', label: 'Categories', icon: Tag },
  { key: 'preferences', label: 'Preferences', icon: Palette },
  { key: 'security', label: 'Security', icon: KeyRound },
];

export default function Settings() {
  useDocumentTitle('Settings');
  const [tab, setTab] = useState('profile');

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <PageHeader title="Profile & settings" subtitle="Manage your account, categories and preferences." />

      <div className="flex gap-1 overflow-x-auto rounded-lg border border-line bg-surface p-1">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={cn(
              'inline-flex shrink-0 items-center gap-2 rounded-md px-3.5 py-2 text-sm font-medium transition',
              tab === key ? 'bg-brand-600 text-white shadow-sm' : 'text-muted hover:text-ink'
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {tab === 'profile' && <ProfilePanel />}
      {tab === 'categories' && <CategoriesPanel />}
      {tab === 'preferences' && <PreferencesPanel />}
      {tab === 'security' && <SecurityPanel />}
    </div>
  );
}

/* ------------------------------- profile ------------------------------- */

function ProfilePanel() {
  const { user, updateUser } = useAuth();
  const toast = useToast();

  const [form, setForm] = useState({
    name: user?.name || '',
    currency: user?.currency || 'INR',
    monthlyIncome: user?.monthlyIncome ?? 0,
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const set = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    setErrors({});
  };

  async function handleSubmit(e) {
    e.preventDefault();
    if (form.name.trim().length < 2) {
      setErrors({ name: 'Enter your name' });
      return;
    }

    setSaving(true);
    try {
      const updated = await authService.updateProfile({
        name: form.name.trim(),
        currency: form.currency,
        monthlyIncome: Number(form.monthlyIncome) || 0,
      });
      updateUser(updated);
      toast.success('Profile updated');
    } catch (err) {
      setErrors({ form: err.message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader title="Your details" subtitle="Shown across the app and used for currency formatting." />

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {errors.form && (
          <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
            {errors.form}
          </p>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Full name" value={form.name} onChange={set('name')} error={errors.name} required />
          <Input label="Email" value={user?.email || ''} disabled hint="Email cannot be changed" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Select label="Currency" options={CURRENCIES} value={form.currency} onChange={set('currency')} />
          <Input
            label="Monthly income"
            type="number"
            min="0"
            prefix={currencyMeta(form.currency).symbol}
            value={form.monthlyIncome}
            onChange={set('monthlyIncome')}
            hint="Optional — helps the assistant judge your budgets"
          />
        </div>

        <div className="flex justify-end pt-1">
          <Button type="submit" icon={Save} loading={saving}>
            Save changes
          </Button>
        </div>
      </form>
    </Card>
  );
}

/* ------------------------------ categories ----------------------------- */

function CategoriesPanel() {
  const { currency } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();

  const { data: categories, loading, refetch } = useAsync(() => categoryService.list(), []);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  async function handleDelete(category) {
    const ok = await confirm({
      title: `Delete "${category.name}"?`,
      message:
        category.expenseCount > 0
          ? `${category.expenseCount} expense(s) will be moved to "Other". Nothing is deleted.`
          : 'This category has no expenses.',
      confirmLabel: 'Delete category',
    });
    if (!ok) return;

    try {
      const result = await categoryService.remove(category._id);
      toast.success(result.message);
      refetch();
    } catch (err) {
      toast.error(err.message);
    }
  }

  return (
    <>
      <Card padded={false}>
        <div className="flex items-center justify-between gap-3 px-5 py-4">
          <div>
            <h3 className="text-sm font-semibold text-ink">Your categories</h3>
            <p className="mt-0.5 text-xs text-muted">
              Deleting a category moves its expenses to “Other” — history is never lost.
            </p>
          </div>
          <Button
            size="sm"
            icon={Plus}
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            New
          </Button>
        </div>

        {loading ? (
          <div className="space-y-2 px-5 pb-5" aria-hidden>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="skeleton h-12 w-full rounded-lg" />
            ))}
          </div>
        ) : !categories?.length ? (
          <EmptyState icon={Tag} title="No categories" />
        ) : (
          <ul className="divide-y divide-line border-t border-line">
            {categories.map((c) => (
              <li key={c._id} className="group flex items-center gap-3 px-5 py-3">
                <CategoryIcon name={c.icon} color={c.color} />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 truncate text-sm font-medium text-ink">
                    {c.name}
                    {c.isSystem && <Badge tone="neutral">System</Badge>}
                    {c.isDefault && !c.isSystem && <Badge tone="neutral">Default</Badge>}
                  </p>
                  <p className="text-xs text-faint">
                    {c.expenseCount} expense{c.expenseCount === 1 ? '' : 's'} ·{' '}
                    {formatMoney(c.totalSpent, currency)} all time
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(c);
                      setOpen(true);
                    }}
                    className="rounded-md px-2.5 py-1.5 text-xs font-medium text-muted transition hover:bg-line/60 hover:text-ink"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(c)}
                    disabled={c.isSystem}
                    className="grid h-7 w-7 place-items-center rounded-md text-faint transition hover:bg-rose-50 hover:text-rose-600 disabled:pointer-events-none disabled:opacity-30 dark:hover:bg-rose-500/10"
                    aria-label={`Delete ${c.name}`}
                    title={c.isSystem ? 'The "Other" category cannot be deleted' : undefined}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <CategoryEditor
        open={open}
        editing={editing}
        onClose={() => {
          setOpen(false);
          setEditing(null);
        }}
        onSaved={() => {
          setOpen(false);
          setEditing(null);
          refetch();
        }}
      />
    </>
  );
}

function CategoryEditor({ open, editing, onClose, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState({ name: '', icon: 'Tag', color: '#64748b' });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const key = editing?._id || 'new';
  const [lastKey, setLastKey] = useState(null);
  if (open && key !== lastKey) {
    setLastKey(key);
    setForm(
      editing
        ? { name: editing.name, icon: editing.icon || 'Tag', color: editing.color || '#64748b' }
        : { name: '', icon: 'Tag', color: '#64748b' }
    );
    setErrors({});
  }
  if (!open && lastKey !== null) setLastKey(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) {
      setErrors({ name: 'Give the category a name' });
      return;
    }

    setSaving(true);
    try {
      if (editing) await categoryService.update(editing._id, form);
      else await categoryService.create(form);
      toast.success(editing ? 'Category updated' : 'Category created');
      onSaved();
    } catch (err) {
      setErrors({ form: err.message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Edit category' : 'New category'}>
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {errors.form && (
          <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
            {errors.form}
          </p>
        )}

        <div className="flex items-center gap-3 rounded-lg border border-line bg-canvas p-3">
          <CategoryIcon name={form.icon} color={form.color} size="lg" />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-ink">{form.name || 'Preview'}</p>
            <p className="text-xs text-faint">How it will look in lists and charts</p>
          </div>
        </div>

        <Input
          label="Name"
          placeholder="Travel"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          error={errors.name}
          required
        />

        <div>
          <p className="mb-2 text-sm font-medium text-ink">Colour</p>
          <div className="flex flex-wrap gap-2">
            {CATEGORY_COLOR_CHOICES.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => setForm((f) => ({ ...f, color }))}
                className={cn(
                  'h-8 w-8 rounded-lg transition',
                  form.color === color && 'ring-2 ring-brand-500 ring-offset-2 ring-offset-surface'
                )}
                style={{ background: color }}
                aria-label={`Colour ${color}`}
                aria-pressed={form.color === color}
              />
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm font-medium text-ink">Icon</p>
          <div className="flex flex-wrap gap-2">
            {CATEGORY_ICON_CHOICES.map((icon) => (
              <button
                key={icon}
                type="button"
                onClick={() => setForm((f) => ({ ...f, icon }))}
                className={cn(
                  'rounded-lg p-0.5 transition',
                  form.icon === icon && 'ring-2 ring-brand-500 ring-offset-2 ring-offset-surface'
                )}
                aria-label={icon}
                aria-pressed={form.icon === icon}
              >
                <CategoryIcon name={icon} color={form.color} />
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" loading={saving}>
            {editing ? 'Save changes' : 'Create category'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

/* ----------------------------- preferences ----------------------------- */

function PreferencesPanel() {
  const { user, updateUser } = useAuth();
  const { theme, setTheme } = useTheme();
  const toast = useToast();

  const [threshold, setThreshold] = useState(user?.preferences?.alertThreshold ?? 80);
  const [saving, setSaving] = useState(false);

  async function saveThreshold() {
    setSaving(true);
    try {
      const updated = await authService.updateProfile({
        preferences: { alertThreshold: Number(threshold) },
      });
      updateUser(updated);
      toast.success('Alert threshold updated');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  const themes = [
    { key: 'light', label: 'Light', icon: Sun },
    { key: 'dark', label: 'Dark', icon: Moon },
    { key: 'system', label: 'System', icon: Monitor },
  ];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader title="Appearance" subtitle="Applies to this browser." icon={Palette} />
        <div className="grid gap-2 sm:grid-cols-3">
          {themes.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setTheme(key)}
              className={cn(
                'flex items-center gap-2.5 rounded-lg border p-3 text-sm font-medium transition',
                theme === key
                  ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300'
                  : 'border-line text-muted hover:border-faint hover:text-ink'
              )}
              aria-pressed={theme === key}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Budget alerts"
          subtitle="When to warn you that a budget is running low."
          icon={Bell}
        />

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label htmlFor="threshold" className="text-sm text-muted">
              Warn me at
            </label>
            <span className="text-lg font-semibold tabular-nums text-ink">{threshold}%</span>
          </div>

          <input
            id="threshold"
            type="range"
            min="50"
            max="100"
            step="5"
            value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value))}
            className="w-full accent-brand-600"
          />
          <div className="flex justify-between text-xs text-faint">
            <span>50%</span>
            <span>75%</span>
            <span>100%</span>
          </div>

          <p className="text-xs text-muted">
            You are always alerted when a budget is exceeded, regardless of this setting.
          </p>

          <div className="flex justify-end">
            <Button
              size="sm"
              icon={Save}
              loading={saving}
              onClick={saveThreshold}
              disabled={threshold === (user?.preferences?.alertThreshold ?? 80)}
            >
              Save
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

/* ------------------------------- security ------------------------------ */

function SecurityPanel() {
  const toast = useToast();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const set = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    setErrors({});
  };

  async function handleSubmit(e) {
    e.preventDefault();
    const next = {};
    if (!form.currentPassword) next.currentPassword = 'Enter your current password';
    if (form.newPassword.length < 8) next.newPassword = 'At least 8 characters';
    else if (!/[a-zA-Z]/.test(form.newPassword) || !/[0-9]/.test(form.newPassword)) {
      next.newPassword = 'Must contain a letter and a number';
    }
    if (form.newPassword !== form.confirmPassword) {
      next.confirmPassword = 'Passwords do not match';
    }
    setErrors(next);
    if (Object.keys(next).length) return;

    setSaving(true);
    try {
      const { token } = await authService.changePassword({
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      // The server re-issues a token so the previous one stops working.
      if (token) localStorage.setItem('sebm.token', token);
      toast.success('Password updated');
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setErrors({ form: err.message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader
        title="Change password"
        subtitle="Passwords are hashed with bcrypt and never stored in plain text."
        icon={KeyRound}
      />

      <form onSubmit={handleSubmit} className="max-w-md space-y-4" noValidate>
        {errors.form && (
          <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
            {errors.form}
          </p>
        )}

        <Input
          label="Current password"
          type="password"
          autoComplete="current-password"
          value={form.currentPassword}
          onChange={set('currentPassword')}
          error={errors.currentPassword}
          required
        />
        <Input
          label="New password"
          type="password"
          autoComplete="new-password"
          value={form.newPassword}
          onChange={set('newPassword')}
          error={errors.newPassword}
          hint="At least 8 characters, with a letter and a number"
          required
        />
        <Input
          label="Confirm new password"
          type="password"
          autoComplete="new-password"
          value={form.confirmPassword}
          onChange={set('confirmPassword')}
          error={errors.confirmPassword}
          required
        />

        <div className="flex justify-end">
          <Button type="submit" icon={KeyRound} loading={saving}>
            Update password
          </Button>
        </div>
      </form>
    </Card>
  );
}
