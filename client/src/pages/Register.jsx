import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check, Eye, EyeOff, UserPlus } from 'lucide-react';
import { useAuth, useDocumentTitle, useToast } from '../hooks';
import Button from '../components/ui/Button';
import { Input, Select } from '../components/ui/Field';
import { CURRENCIES } from '../utils/constants';
import cn from '../utils/cn';

const RULES = [
  { test: (v) => v.length >= 8, label: 'At least 8 characters' },
  { test: (v) => /[a-zA-Z]/.test(v), label: 'Contains a letter' },
  { test: (v) => /[0-9]/.test(v), label: 'Contains a number' },
];

export default function Register() {
  useDocumentTitle('Create account');
  const { register } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    currency: 'INR',
  });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const checks = useMemo(() => RULES.map((r) => ({ ...r, ok: r.test(form.password) })), [form.password]);

  const set = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    setErrors((prev) => ({ ...prev, [field]: undefined, form: undefined }));
  };

  function validate() {
    const next = {};
    if (form.name.trim().length < 2) next.name = 'Enter your name';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) next.email = 'Enter a valid email';
    if (checks.some((c) => !c.ok)) next.password = 'Password does not meet the requirements';
    if (form.password !== form.confirmPassword) next.confirmPassword = 'Passwords do not match';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      await register({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        currency: form.currency,
      });
      toast.success('Account created — your default categories are ready.');
      navigate('/dashboard', { replace: true });
    } catch (err) {
      if (err.fieldErrors?.length) {
        const mapped = {};
        err.fieldErrors.forEach((fe) => {
          mapped[fe.field] = fe.message;
        });
        setErrors({ ...mapped, form: err.message });
      } else {
        setErrors({ form: err.message });
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="animate-fade-in">
      <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-ink">Create your account</h1>
      <p className="mt-2 text-sm text-muted">
        Start tracking spending, budgets, and smart analytics today.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4" noValidate>
        {errors.form && (
          <div
            role="alert"
            className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300"
          >
            {errors.form}
          </div>
        )}

        <Input
          label="Full name"
          autoComplete="name"
          placeholder="Priya Sharma"
          value={form.name}
          onChange={set('name')}
          error={errors.name}
          required
        />

        <Input
          label="Email address"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={form.email}
          onChange={set('email')}
          error={errors.email}
          required
        />

        <div className="relative">
          <Input
            label="Password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            placeholder="••••••••"
            value={form.password}
            onChange={set('password')}
            error={errors.password}
            className="pr-10"
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3 top-[34px] rounded-lg p-1 text-faint transition hover:text-ink"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>

        {form.password && (
          <ul className="space-y-1 rounded-xl bg-canvas p-2.5 border border-line">
            {checks.map((c) => (
              <li
                key={c.label}
                className={cn(
                  'flex items-center gap-1.5 text-xs font-medium',
                  c.ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-faint'
                )}
              >
                <Check className={cn('h-3.5 w-3.5', !c.ok && 'opacity-30')} />
                {c.label}
              </li>
            ))}
          </ul>
        )}

        <Input
          label="Confirm password"
          type={showPassword ? 'text' : 'password'}
          autoComplete="new-password"
          placeholder="••••••••"
          value={form.confirmPassword}
          onChange={set('confirmPassword')}
          error={errors.confirmPassword}
          required
        />

        <Select
          label="Preferred currency"
          options={CURRENCIES}
          value={form.currency}
          onChange={set('currency')}
        />

        <Button type="submit" icon={UserPlus} loading={submitting} className="w-full mt-2" size="lg">
          Create Account
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        Already have an account?{' '}
        <Link
          to="/login"
          className="font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300 transition"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
