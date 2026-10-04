/**
 * Centralized API client — all requests go through here.
 * Access token is stored in memory; refresh token in localStorage.
 */

const BASE = '/api/v1';
const RT_KEY = 'skyline_rt';

// ── Token state (in-memory, so it's gone on tab close) ──────────────────────
let _access: string | null = null;

export function setAccess(token: string) { _access = token; }
export function clearAccess() { _access = null; }
export function getRefresh() { return localStorage.getItem(RT_KEY); }
export function setRefresh(token: string) { localStorage.setItem(RT_KEY, token); }
export function clearRefresh() { localStorage.removeItem(RT_KEY); }

// ── Core fetch wrapper ───────────────────────────────────────────────────────
async function request<T = unknown>(
  method: string,
  path: string,
  body?: unknown,
  retry = true,
): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (_access) headers['Authorization'] = `Bearer ${_access}`;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  // 401 → try a silent token refresh once
  if (res.status === 401 && retry) {
    const rt = getRefresh();
    if (rt) {
      try {
        const refreshRes = await fetch(`${BASE}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: rt }),
        });
        if (refreshRes.ok) {
          const data = await refreshRes.json();
          setAccess(data.access_token);
          setRefresh(data.refresh_token);
          return request<T>(method, path, body, false);
        }
      } catch {
        /* ignore refresh failure; fall through to throw */
      }
    }
    clearAccess();
    clearRefresh();
    // Signal to the app that auth is gone
    window.dispatchEvent(new Event('skyline:logout'));
    throw new ApiError(401, 'Session expired');
  }

  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const err = await res.json();
      msg = err.detail ?? err.message ?? msg;
    } catch { /* ignore */ }
    throw new ApiError(res.status, msg);
  }

  // 204 No Content
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export const api = {
  get:    <T>(path: string) =>                   request<T>('GET', path),
  post:   <T>(path: string, body?: unknown) =>   request<T>('POST', path, body),
  patch:  <T>(path: string, body?: unknown) =>   request<T>('PATCH', path, body),
  put:    <T>(path: string, body?: unknown) =>   request<T>('PUT', path, body),
  delete: <T>(path: string) =>                   request<T>('DELETE', path),
};

// ── Typed API helpers ────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  organization_id: string;
  roles: string[];
  permissions: string[];
  is_staff: boolean;
  member_id: string | null;
  student_id: string | null;
  membership: MembershipSummary | null;
}

export interface MembershipSummary {
  state: string;
  is_active: boolean;
  plan_name?: string;
  plan_id?: string;
  start_date?: string;
  end_date?: string;
  days_until_expiry?: number;
  event_discount?: number;
  merch_discount?: number;
  event_discount_percentage?: number;
  merchandise_discount_percentage?: number;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: AuthUser;
}

export interface MembershipPlan {
  id: string;
  name: string;
  price: number;
  duration_months: number;
  description: string;
  event_discount_percentage: number;
  merchandise_discount_percentage: number;
  benefits: string[];
  is_active: boolean;
}

export interface Member {
  id: string;
  student_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  status: string;
  join_date: string;
  membership_state: string;
  plan_name: string | null;
  end_date: string | null;
  days_until_expiry: number | null;
  is_active_member: boolean;
}

export interface ApiEvent {
  id: string;
  name: string;
  description: string;
  venue: string;
  start_datetime: string;
  end_datetime: string;
  capacity: number;
  member_price: number;
  non_member_price: number;
  status: string;
  sold?: number;
  revenue?: number;
  checked_in?: number;
}

export interface Ticket {
  id: string;
  code?: string;
  ticket_code?: string;
  event_id: string;
  event_name: string;
  holder_name?: string;
  buyer_name?: string;
  buyer_email: string;
  status: string;
  price_paid?: number;
  price?: number;
  qr_token?: string;
  checked_in_at?: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  audience_type: string;
  status: string;
  created_by_name?: string;
  published_at?: string;
  created_at: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  category: string;
  base_price: number;
  is_active: boolean;
  variants: ProductVariant[];
}

export interface ProductVariant {
  id: string;
  sku: string;
  size: string | null;
  color: string | null;
  price: number | null;
  quantity: number;
  low_stock_threshold: number;
}

export interface Order {
  id: string;
  status: string;
  total_amount: number;
  payment_method: string;
  created_at: string;
  items: OrderItem[];
}

export interface OrderItem {
  id: string;
  variant_id: string;
  product_name: string;
  sku: string;
  size: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface Fundraiser {
  id: string;
  name: string;
  description: string;
  target_amount: number;
  raised_amount: number;
  status: string;
  start_date: string;
  end_date: string | null;
  tasks: FundraiserTask[];
}

export interface FundraiserTask {
  id: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  due_date?: string;
  assignees?: { name: string }[];
}

export interface Expense {
  id: string;
  category: string;
  description: string;
  amount: number;
  expense_date: string;
  status: string;
  submitted_by_name?: string;
  submitted_by_id?: string;
}

export interface Transaction {
  id: string;
  type: string;
  category: string;
  amount: number;
  description: string;
  date: string;
  reference_type?: string;
  is_reversal: boolean;
  reversed: boolean;
}

export interface FinanceSummary {
  balance: number;
  total_income: number;
  total_expense: number;
  monthly: { month: string; income: number; expenses: number }[];
}

export interface DashboardData {
  roles: string[];
  member?: {
    membership: MembershipSummary | null;
    tickets: number;
    unread_notifications: number;
    orders: number;
    my_open_tasks: number;
  };
  overview?: {
    members: number;
    active_memberships: number;
    events: number;
    tickets_sold: number;
    pending_expenses: number;
  };
  finance?: FinanceSummary & {
    pending_expenses: { id: string; description: string; amount: number; status: string }[];
  };
  events?: {
    upcoming: number;
    revenue: number;
    events: ApiEvent[];
  };
}
