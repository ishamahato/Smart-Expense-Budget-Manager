import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import { ToastContext } from '../context/ToastContext';
import { ConfirmContext } from '../context/ConfirmContext';
import { ThemeContext } from '../context/ThemeContext';

function required(ctx, name) {
  if (ctx === null || ctx === undefined) {
    throw new Error(`${name} must be used inside its provider`);
  }
  return ctx;
}

export const useAuth = () => required(useContext(AuthContext), 'useAuth');
export const useToast = () => required(useContext(ToastContext), 'useToast');
export const useConfirm = () => required(useContext(ConfirmContext), 'useConfirm');
export const useTheme = () => required(useContext(ThemeContext), 'useTheme');

/** Debounces a rapidly-changing value (search boxes, sliders). */
export function useDebounce(value, delay = 350) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

/**
 * Runs an async fetcher and tracks {data, loading, error}. `deps` controls when
 * it re-runs; stale responses are dropped so fast filter changes cannot render
 * an earlier request's result.
 */
export function useAsync(fetcher, deps = [], { immediate = true } = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState(null);
  const requestId = useRef(0);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const run = useCallback(async () => {
    const id = ++requestId.current;
    setLoading(true);
    setError(null);
    try {
      const result = await fetcherRef.current();
      if (id === requestId.current) setData(result);
      return result;
    } catch (err) {
      if (id === requestId.current) setError(err);
      return undefined;
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (immediate) run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, loading, error, refetch: run, setData };
}

/** Tracks a media query, e.g. useMediaQuery('(min-width: 1024px)'). */
export function useMediaQuery(query) {
  const [matches, setMatches] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(query).matches
  );

  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = (e) => setMatches(e.matches);
    setMatches(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}

/** Sets document.title and restores it on unmount. */
export function useDocumentTitle(title) {
  useEffect(() => {
    const previous = document.title;
    document.title = title ? `${title} · Smart Expense Manager` : 'Smart Expense Manager';
    return () => {
      document.title = previous;
    };
  }, [title]);
}
