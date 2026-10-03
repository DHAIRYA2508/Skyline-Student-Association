/**
 * Global auth + app context.
 * All data now comes from the real FastAPI backend.
 */
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import {
  api, clearAccess, clearRefresh,
  getRefresh, setAccess, setRefresh,
  type AuthUser, type MembershipSummary,
} from '../services/api';

// ── Helper formatters (re-exported so pages don't need to import separately) ──
export const money = (n: number | string | null | undefined) => {
  const num = typeof n === 'number' ? n : Number(n);
  if (isNaN(num)) return '₹0.00';
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(num);
};

export const fdate = (s: string | null | undefined) => {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
};

// ── Types ────────────────────────────────────────────────────────────────────
export type { AuthUser, MembershipSummary };

interface PayRequest { title: string; amount: number; onSuccess: () => void }

interface Ctx {
  me: AuthUser | null;
  loading: boolean;         // initial auth restore in progress
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (d: { name: string; email: string; password: string; studentId: string; phone: string }) => Promise<void>;
  pay: PayRequest | null;
  startPay: (r: PayRequest) => void;
  closePay: () => void;
  toast: string;
  notify: (msg: string) => void;
  // Tells a page to reload its data (after mutation)
  refreshKey: number;
  bump: () => void;
}

const C = createContext<Ctx | null>(null);
export const useApp = () => { const c = useContext(C); if (!c) throw new Error('no store'); return c; };

// ── Provider ─────────────────────────────────────────────────────────────────
export function Provider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [pay, setPay] = useState<PayRequest | null>(null);
  const [toast, setToast] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  const notify = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3200);
  }, []);

  const bump = useCallback(() => setRefreshKey(k => k + 1), []);

  // Restore session from refresh token on app load
  useEffect(() => {
    const rt = getRefresh();
    if (!rt) { setLoading(false); return; }
    api.post<{ access_token: string; refresh_token: string }>('/auth/refresh', { refresh_token: rt })
      .then(data => {
        setAccess(data.access_token);
        setRefresh(data.refresh_token);
        return api.get<AuthUser>('/auth/me');
      })
      .then(user => setMe(user))
      .catch(() => { clearAccess(); clearRefresh(); })
      .finally(() => setLoading(false));
  }, []);

  // Listen for 401 logout events dispatched by the API client
  useEffect(() => {
    const handler = () => { setMe(null); setPay(null); };
    window.addEventListener('skyline:logout', handler);
    return () => window.removeEventListener('skyline:logout', handler);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await api.post<{
      access_token: string; refresh_token: string; user: AuthUser
    }>('/auth/login', { email, password });
    setAccess(data.access_token);
    setRefresh(data.refresh_token);
    setMe(data.user);
  }, []);

  const logout = useCallback(async () => {
    const rt = getRefresh();
    try { if (rt) await api.post('/auth/logout', { refresh_token: rt }); } catch { /* ignore */ }
    clearAccess();
    clearRefresh();
    setMe(null);
    setPay(null);
  }, []);

  const register = useCallback(async (d: {
    name: string; email: string; password: string; studentId: string; phone: string;
  }) => {
    const [first_name, ...rest] = d.name.trim().split(' ');
    const last_name = rest.join(' ') || first_name;
    const data = await api.post<{ access_token: string; refresh_token: string; user: AuthUser }>(
      '/auth/register',
      {
        email: d.email,
        password: d.password,
        first_name,
        last_name,
        student_id: d.studentId || undefined,
        phone: d.phone || undefined,
      }
    );
    setAccess(data.access_token);
    setRefresh(data.refresh_token);
    setMe(data.user);
  }, []);

  const v: Ctx = {
    me, loading, login, logout, register,
    pay, startPay: setPay, closePay: () => setPay(null),
    toast, notify, refreshKey, bump,
  };

  return <C.Provider value={v}>{children}</C.Provider>;
}
