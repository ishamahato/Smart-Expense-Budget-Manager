import { createContext, useEffect, useMemo, useState } from 'react';

export const ThemeContext = createContext(null);

const STORAGE_KEY = 'sebm.theme';

function readStored() {
  try {
    return localStorage.getItem(STORAGE_KEY) || 'system';
  } catch {
    return 'system';
  }
}

function apply(theme) {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const dark = theme === 'dark' || (theme === 'system' && prefersDark);
  document.documentElement.classList.toggle('dark', dark);
  return dark;
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(readStored);
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));

  useEffect(() => {
    setIsDark(apply(theme));
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* ignore — theme still applies for this session */
    }
  }, [theme]);

  // Follow the OS while the preference is "system".
  useEffect(() => {
    if (theme !== 'system') return undefined;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => setIsDark(apply('system'));
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [theme]);

  const value = useMemo(
    () => ({
      theme,
      isDark,
      setTheme: setThemeState,
      toggle: () => setThemeState(isDark ? 'light' : 'dark'),
    }),
    [theme, isDark]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
