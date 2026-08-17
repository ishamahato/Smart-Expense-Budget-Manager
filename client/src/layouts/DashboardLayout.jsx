import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  ChevronDown,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Plus,
  Receipt,
  Repeat,
  Settings,
  Sparkles,
  Sun,
  Wallet,
  X,
} from 'lucide-react';
import { useAuth, useMediaQuery, useTheme } from '../hooks';
import { initials } from '../utils/format';
import cn from '../utils/cn';
import Button from '../components/ui/Button';
import NotificationBell from '../components/dashboard/NotificationBell';

const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/expenses', label: 'Expenses', icon: Receipt },
  { to: '/budgets', label: 'Budgets', icon: Wallet },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/recurring', label: 'Recurring', icon: Repeat },
  { to: '/assistant', label: 'AI Assistant', icon: Sparkles, badge: 'AI' },
];

function Logo({ collapsed }) {
  return (
    <div className="flex items-center gap-3 px-1">
      <span className="relative grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 text-white shadow-md shadow-brand-500/25 ring-1 ring-white/20">
        <BarChart3 className="h-5 w-5" strokeWidth={2.5} />
      </span>
      {!collapsed && (
        <span className="min-w-0">
          <span className="block truncate text-sm font-bold tracking-tight text-ink">
            Smart Expense
          </span>
          <span className="block truncate text-[11px] font-medium text-muted">
            Budget &amp; AI Manager
          </span>
        </span>
      )}
    </div>
  );
}

function SidebarNav({ onNavigate }) {
  return (
    <nav className="flex-1 space-y-1.5 overflow-y-auto px-3 py-4" aria-label="Main">
      {NAV.map(({ to, label, icon: Icon, badge }) => (
        <NavLink
          key={to}
          to={to}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              'group relative flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-150',
              isActive
                ? 'bg-brand-50 text-brand-700 shadow-sm shadow-brand-500/10 font-semibold dark:bg-brand-500/15 dark:text-brand-300'
                : 'text-muted hover:bg-slate-100 hover:text-ink dark:hover:bg-slate-800/60'
            )
          }
        >
          {({ isActive }) => (
            <>
              <div className="flex items-center gap-3">
                <Icon
                  className={cn(
                    'h-4.5 w-4.5 shrink-0 transition-transform duration-150 group-hover:scale-110',
                    isActive ? 'text-brand-600 dark:text-brand-400' : 'text-faint group-hover:text-muted'
                  )}
                />
                <span>{label}</span>
              </div>
              {badge && (
                <span className="rounded-md bg-gradient-to-r from-brand-600 to-indigo-600 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-xs">
                  {badge}
                </span>
              )}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}

function UserMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    const close = () => setOpen(false);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [open]);

  return (
    <div className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 rounded-xl p-2 text-left transition-colors hover:bg-slate-100 dark:hover:bg-slate-800/60"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand-600 to-indigo-700 text-xs font-bold text-white shadow-sm ring-2 ring-white/20">
          {initials(user?.name || 'U')}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-ink leading-tight">{user?.name}</span>
          <span className="block truncate text-xs text-muted leading-tight mt-0.5">{user?.email}</span>
        </span>
        <ChevronDown className={cn('h-4 w-4 shrink-0 text-faint transition-transform duration-200', open && 'rotate-180')} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute bottom-full left-0 z-30 mb-2 w-full overflow-hidden rounded-xl border border-line bg-surface p-1 shadow-lift animate-scale-in"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              navigate('/settings');
            }}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-muted transition hover:bg-slate-100 hover:text-ink dark:hover:bg-slate-800"
          >
            <Settings className="h-4 w-4" />
            Profile &amp; settings
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={async () => {
              setOpen(false);
              await logout();
              navigate('/login', { replace: true });
            }}
            className="flex w-full items-center gap-2.5 rounded-lg border-t border-line/60 px-3 py-2 text-sm font-medium text-rose-600 transition hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

function ThemeToggle() {
  const { isDark, toggle } = useTheme();
  return (
    <button
      type="button"
      onClick={toggle}
      className="grid h-9 w-9 place-items-center rounded-xl text-muted transition-colors hover:bg-slate-100 hover:text-ink dark:hover:bg-slate-800"
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Light mode' : 'Dark mode'}
    >
      {isDark ? <Sun className="h-4.5 w-4.5 text-amber-400" /> : <Moon className="h-4.5 w-4.5" />}
    </button>
  );
}

export default function DashboardLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const location = useLocation();
  const navigate = useNavigate();

  // Close the drawer whenever the route changes.
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const currentPage = NAV.find((n) => location.pathname.startsWith(n.to));

  return (
    <div className="min-h-screen bg-canvas">
      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-line/80 bg-surface backdrop-blur-md transition-transform duration-300 ease-out lg:translate-x-0',
          mobileOpen ? 'translate-x-0 shadow-lift' : '-translate-x-full'
        )}
      >
        <div className="flex h-18 items-center justify-between border-b border-line/80 px-4">
          <Logo />
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="grid h-8 w-8 place-items-center rounded-lg text-faint hover:bg-slate-100 hover:text-ink dark:hover:bg-slate-800 lg:hidden"
            aria-label="Close navigation"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <SidebarNav onNavigate={() => setMobileOpen(false)} />

        <div className="border-t border-line/80 p-3 space-y-2">
          <Button
            icon={Plus}
            className="w-full"
            onClick={() => navigate('/expenses/new')}
          >
            Add expense
          </Button>
          <UserMenu />
        </div>
      </aside>

      {mobileOpen && !isDesktop && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/60 backdrop-blur-sm transition-opacity lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden
        />
      )}

      {/* Main column */}
      <div className="lg:pl-64 flex flex-col min-h-screen">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-line/80 bg-surface/80 px-4 backdrop-blur-md sm:px-8">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="grid h-9 w-9 place-items-center rounded-xl text-muted transition hover:bg-slate-100 hover:text-ink dark:hover:bg-slate-800 lg:hidden"
            aria-label="Open navigation"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base sm:text-lg font-bold tracking-tight text-ink">
              {currentPage?.label || 'Settings'}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />

            <NotificationBell />

            <Button
              size="sm"
              icon={Plus}
              className="ml-1 hidden sm:inline-flex"
              onClick={() => navigate('/expenses/new')}
            >
              Add Expense
            </Button>
          </div>
        </header>

        <main className="flex-1 mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-8 lg:py-8 animate-fade-in">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
