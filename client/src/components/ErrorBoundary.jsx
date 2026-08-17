import { Component } from 'react';
import { AlertOctagon, RotateCcw } from 'lucide-react';

/**
 * Last line of defence: a render error anywhere below this shows a recovery
 * screen instead of a blank page.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error('Unhandled UI error:', error, info?.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="grid min-h-screen place-items-center bg-canvas px-6">
        <div className="w-full max-w-md rounded-xl border border-line bg-surface p-8 text-center shadow-card">
          <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400">
            <AlertOctagon className="h-6 w-6" />
          </div>
          <h1 className="text-lg font-semibold text-ink">Something went wrong</h1>
          <p className="mt-2 text-sm text-muted">
            The page hit an unexpected error. Reloading usually clears it.
          </p>

          {import.meta.env.DEV && (
            <pre className="mt-4 max-h-40 overflow-auto rounded-lg bg-canvas p-3 text-left text-xs text-rose-600 dark:text-rose-400">
              {error.message}
            </pre>
          )}

          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-6 inline-flex h-10 items-center gap-2 rounded-lg bg-brand-600 px-4 text-sm font-medium text-white transition hover:bg-brand-700"
          >
            <RotateCcw className="h-4 w-4" />
            Reload the page
          </button>
        </div>
      </div>
    );
  }
}
