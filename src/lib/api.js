// Shared API client for the product-owner portal.
// Talks to the same backend as the tenant FE — distinguished by login role.

import { API_BASE } from './config';

const STORAGE = {
  ACCESS: 'po_access_token',
  REFRESH: 'po_refresh_token',
  USER: 'po_user',
};

export const auth = {
  getAccess: () => localStorage.getItem(STORAGE.ACCESS),
  getRefresh: () => localStorage.getItem(STORAGE.REFRESH),
  getUser: () => {
    const raw = localStorage.getItem(STORAGE.USER);
    return raw ? JSON.parse(raw) : null;
  },
  setSession: ({ access_token, refresh_token, user }) => {
    if (access_token) localStorage.setItem(STORAGE.ACCESS, access_token);
    if (refresh_token) localStorage.setItem(STORAGE.REFRESH, refresh_token);
    if (user) localStorage.setItem(STORAGE.USER, JSON.stringify(user));
  },
  clear: () => Object.values(STORAGE).forEach((k) => localStorage.removeItem(k)),
  isAuthed: () => !!localStorage.getItem(STORAGE.ACCESS),
};

class ApiError extends Error {
  constructor(message, status, data) { super(message); this.status = status; this.data = data; }
}

let refreshing = null;
const tryRefresh = async () => {
  if (refreshing) return refreshing;
  const refresh_token = auth.getRefresh();
  if (!refresh_token) return null;
  refreshing = (async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ refresh_token }),
      });
      if (!res.ok) return null;
      const json = await res.json();
      const payload = json?.data ?? json;
      auth.setSession({
        access_token: payload.access_token,
        refresh_token: payload.refresh_token,
      });
      return payload.access_token ?? null;
    } catch { return null; } finally { refreshing = null; }
  })();
  return refreshing;
};

const doFetch = async (path, init = {}, retried = false) => {
  const headers = { ...(init.headers || {}) };
  if (!(init.body instanceof FormData)) headers['content-type'] ??= 'application/json';
  const token = auth.getAccess();
  if (token) headers.authorization = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  if (res.status === 401 && !retried && auth.getRefresh()) {
    const t = await tryRefresh();
    if (t) return doFetch(path, init, true);
    auth.clear();
    if (typeof window !== 'undefined') window.location.href = '/';
    throw new ApiError('Session expired', 401);
  }
  let data = null;
  const text = await res.text();
  if (text) { try { data = JSON.parse(text); } catch { data = text; } }
  if (!res.ok) {
    const msg = data?.error?.message || data?.message || res.statusText || 'Request failed';
    throw new ApiError(msg, res.status, data);
  }
  return data;
};

export const api = {
  get: (path, params) => {
    const qs = params ? `?${new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')).toString()}` : '';
    return doFetch(`${path}${qs}`, { method: 'GET' });
  },
  post: (path, body) => doFetch(path, { method: 'POST', body: body instanceof FormData ? body : JSON.stringify(body ?? {}) }),
  put: (path, body) => doFetch(path, { method: 'PUT', body: JSON.stringify(body ?? {}) }),
  patch: (path, body) => doFetch(path, { method: 'PATCH', body: JSON.stringify(body ?? {}) }),
  delete: (path) => doFetch(path, { method: 'DELETE' }),
};

export { ApiError, API_BASE };
