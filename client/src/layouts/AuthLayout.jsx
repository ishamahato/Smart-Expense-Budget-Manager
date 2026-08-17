import { Navigate, Outlet } from 'react-router-dom';
import { BarChart3, PieChart, Repeat, Sparkles, TrendingUp, ShieldCheck, Zap } from 'lucide-react';
import { useAuth } from '../hooks';
import { LoadingBlock } from '../components/ui/Feedback';

const HIGHLIGHTS = [
  {
    icon: PieChart,
    title: 'Visualise Where Your Money Goes',
    text: 'Real-time category donuts, daily burn rate trends, and monthly velocity charts.',
  },
  {
    icon: TrendingUp,
    title: 'Early Warning Proactive Budgets',
    text: 'Visual health gauges that alert you at 80% capacity before you overspend.',
  },
  {
    icon: Repeat,
    title: 'Recurring Bills & Subscriptions',
    text: 'Automate rent, SaaS, and utilities with scheduled posting and runway tracking.',
  },
  {
    icon: Sparkles,
    title: 'Gemini AI Financial Copilot',
    text: 'Chat with your real financial data in natural English with zero data leaks.',
  },
];

export default function AuthLayout() {
  const { isAuthenticated, initialising } = useAuth();

  if (initialising) {
    return (
      <div className="grid min-h-screen place-items-center bg-canvas">
        <LoadingBlock label="Loading workspace…" />
      </div>
    );
  }

  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  return (
    <div className="grid min-h-screen lg:grid-cols-12 bg-canvas">
      {/* Form column */}
      <div className="flex flex-col justify-center px-6 py-12 sm:px-12 lg:col-span-5 xl:col-span-5 relative z-10">
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-500 text-white shadow-lg shadow-brand-500/30 ring-2 ring-white/20">
              <BarChart3 className="h-6 w-6" strokeWidth={2.5} />
            </span>
            <span>
              <span className="block text-base font-bold tracking-tight text-ink">
                Smart Expense
              </span>
              <span className="block text-xs font-medium text-muted">
                Budget &amp; AI Manager
              </span>
            </span>
          </div>

          <Outlet />
        </div>
      </div>

      {/* Marketing column */}
      <div className="relative hidden overflow-hidden bg-slate-950 lg:col-span-7 xl:col-span-7 lg:flex flex-col justify-center px-12 xl:px-20 py-16">
        {/* Ambient glow mesh */}
        <div
          className="absolute -top-32 -right-32 h-[500px] w-[500px] rounded-full bg-brand-600/30 blur-[120px] pointer-events-none"
          aria-hidden
        />
        <div
          className="absolute -bottom-32 -left-32 h-[500px] w-[500px] rounded-full bg-indigo-600/25 blur-[140px] pointer-events-none"
          aria-hidden
        />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[350px] w-[350px] rounded-full bg-emerald-500/10 blur-[100px] pointer-events-none"
          aria-hidden
        />

        <div className="relative z-10 max-w-xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-400/30 bg-indigo-500/10 px-3.5 py-1 text-xs font-semibold text-indigo-300 backdrop-blur-md mb-6">
            <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
            Powered by Google Gemini AI &amp; MongoDB Aggregations
          </div>

          <h2 className="text-3xl xl:text-4xl font-extrabold tracking-tight text-white leading-tight">
            Financial clarity made <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 via-indigo-300 to-teal-300">effortless</span> and intelligent.
          </h2>

          <p className="mt-4 text-base text-slate-300 leading-relaxed">
            Gain complete mastery over your cash flow. Track daily spends, enforce realistic category budgets, and let AI reveal your true spending habits.
          </p>

          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {HIGHLIGHTS.map(({ icon: Icon, title, text }) => (
              <div
                key={title}
                className="rounded-2xl border border-white/10 bg-white/5 p-4.5 backdrop-blur-md transition hover:bg-white/10 hover:border-white/20"
              >
                <div className="flex items-center gap-3">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-brand-500/20 text-brand-300 ring-1 ring-white/15">
                    <Icon className="h-4 w-4" />
                  </span>
                  <h4 className="text-sm font-semibold text-white leading-snug">{title}</h4>
                </div>
                <p className="mt-2 text-xs text-slate-400 leading-relaxed">{text}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 flex items-center gap-6 border-t border-white/10 pt-6 text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-emerald-400" /> End-to-end encrypted
            </span>
            <span className="flex items-center gap-1.5">
              <Zap className="h-4 w-4 text-amber-400" /> Instant local calculations
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
