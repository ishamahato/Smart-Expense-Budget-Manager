import { Link } from 'react-router-dom';
import { Compass, Home } from 'lucide-react';
import { useDocumentTitle } from '../hooks';

export default function NotFound() {
  useDocumentTitle('Page not found');

  return (
    <div className="grid min-h-screen place-items-center bg-canvas px-6">
      <div className="text-center">
        <div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
          <Compass className="h-7 w-7" />
        </div>
        <p className="text-sm font-semibold uppercase tracking-wide text-faint">404</p>
        <h1 className="mt-1 text-2xl font-semibold text-ink">This page doesn't exist</h1>
        <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
          The link may be out of date, or the page may have moved.
        </p>
        <Link
          to="/dashboard"
          className="mt-6 inline-flex h-10 items-center gap-2 rounded-lg bg-brand-600 px-4 text-sm font-medium text-white transition hover:bg-brand-700"
        >
          <Home className="h-4 w-4" />
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
