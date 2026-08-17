import axios from 'axios';

export const TOKEN_KEY = 'sebm.token';

/**
 * In development Vite proxies `/api` to Express, so requests stay same-origin.
 * In production set VITE_API_URL to the deployed API base.
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 45000,
});

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* storage disabled — the in-memory header below still works this session */
  }
}

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/** Fired when the API rejects our token so AuthContext can sign the user out. */
export const AUTH_EXPIRED_EVENT = 'sebm:auth-expired';

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const message =
      error.response?.data?.message ||
      (error.code === 'ECONNABORTED'
        ? 'The request timed out. Please try again.'
        : error.request && !error.response
          ? 'Cannot reach the server. Is the API running?'
          : 'Something went wrong. Please try again.');

    // 401 on any route other than the login attempt itself means the stored
    // token is dead — clear it and let the app redirect.
    const isLoginAttempt = error.config?.url?.includes('/auth/login');
    if (status === 401 && !isLoginAttempt) {
      setToken(null);
      window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT, { detail: message }));
    }

    return Promise.reject(
      Object.assign(new Error(message), {
        status,
        fieldErrors: error.response?.data?.errors || null,
        original: error,
      })
    );
  }
);

export default api;
