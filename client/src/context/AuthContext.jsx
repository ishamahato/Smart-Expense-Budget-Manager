import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { authService } from '../services';
import { setToken, getToken, AUTH_EXPIRED_EVENT } from '../services/api';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // `initialising` covers the first token check so protected routes don't
  // bounce to /login before we know whether the stored token is valid.
  const [initialising, setInitialising] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function restoreSession() {
      if (!getToken()) {
        setInitialising(false);
        return;
      }
      try {
        const me = await authService.me();
        if (!cancelled) setUser(me);
      } catch {
        setToken(null);
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setInitialising(false);
      }
    }

    restoreSession();
    return () => {
      cancelled = true;
    };
  }, []);

  // The axios interceptor fires this when the API rejects our token.
  useEffect(() => {
    const onExpired = () => setUser(null);
    window.addEventListener(AUTH_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, onExpired);
  }, []);

  const login = useCallback(async (credentials) => {
    const { user: nextUser, token } = await authService.login(credentials);
    setToken(token);
    setUser(nextUser);
    return nextUser;
  }, []);

  const register = useCallback(async (payload) => {
    const { user: nextUser, token } = await authService.register(payload);
    setToken(token);
    setUser(nextUser);
    return nextUser;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } catch {
      /* the token is discarded locally regardless of the server's reply */
    }
    setToken(null);
    setUser(null);
  }, []);

  const updateUser = useCallback((partial) => {
    setUser((prev) => (prev ? { ...prev, ...partial } : prev));
  }, []);

  const value = useMemo(
    () => ({
      user,
      initialising,
      isAuthenticated: Boolean(user),
      currency: user?.currency || 'INR',
      login,
      register,
      logout,
      updateUser,
    }),
    [user, initialising, login, register, logout, updateUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
