import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, LogIn, Sparkles, ArrowRight } from 'lucide-react';
import { useAuth, useDocumentTitle, useToast } from '../hooks';
import Button from '../components/ui/Button';
import { Input } from '../components/ui/Field';

export default function Login() {
  useDocumentTitle('Sign in');
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const set = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    setErrors((prev) => ({ ...prev, [field]: undefined, form: undefined }));
  };

  function validate() {
    const next = {};
    if (!form.email.trim()) next.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) next.email = 'Enter a valid email';
    if (!form.password) next.password = 'Password is required';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const user = await login(form);
      toast.success(`Welcome back, ${user.name.split(' ')[0]}`);
      navigate(location.state?.from?.pathname || '/dashboard', { replace: true });
    } catch (err) {
      setErrors({ form: err.message });
    } finally {
      setSubmitting(false);
    }
  }

  function fillDemo() {
    setForm({ email: 'demo@expense.app', password: 'Demo@1234' });
    setErrors({});
  }

  return (
    <div className="animate-fade-in">
      <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-ink">Welcome back</h1>
      <p className="mt-2 text-sm text-muted">
        Sign in to manage your budgets, expenses, and insights.
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
            autoComplete="current-password"
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

        <Button type="submit" icon={LogIn} loading={submitting} className="w-full mt-2" size="lg">
          Sign In
        </Button>
      </form>

      {/* Demo helper card */}
      <div className="mt-6 rounded-2xl border border-indigo-200/70 bg-gradient-to-br from-indigo-50/80 to-brand-50/40 p-4 dark:border-indigo-500/25 dark:from-indigo-500/10 dark:to-transparent">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-brand-600 dark:text-brand-400" />
          <p className="text-xs font-bold text-ink uppercase tracking-wider">Fast Demo Preview</p>
        </div>
        <p className="mt-1 text-xs text-muted leading-relaxed">
          Explore with pre-seeded transactions, budgets, analytics &amp; AI assistant.
        </p>
        <button
          type="button"
          onClick={fillDemo}
          className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-bold text-brand-600 dark:text-brand-400 hover:text-brand-700 transition"
        >
          Auto-fill demo credentials <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>

      <p className="mt-6 text-center text-sm text-muted">
        Don&apos;t have an account?{' '}
        <Link
          to="/register"
          className="font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300 transition"
        >
          Create an account
        </Link>
      </p>
    </div>
  );
}
