import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';

export type Role = 'admin' | 'member';
export interface User { id: string; email: string; password: string; name: string; studentId: string; phone: string; role: Role; joined: string }
export interface Plan { id: string; name: string; price: number; eventDisc: number; merchDisc: number; perks: string[] }
export interface Membership { userId: string; planId: string; start: string; end: string; paid: boolean; amount: number }
export interface EventT { id: string; name: string; date: string; venue: string; desc: string; capacity: number; memberPrice: number; publicPrice: number }
export interface Ticket { id: string; eventId: string; userId: string; holder: string; price: number; code: string; checkedIn: boolean; checkedAt?: string; bought: string }
export interface Announcement { id: string; title: string; body: string; date: string; author: string; audience: string }
export interface Product { id: string; name: string; price: number; desc: string; stock: Record<string, number> }
export interface Order { id: string; userId: string; productId: string; size: string; qty: number; total: number; date: string; status: 'Paid' | 'Collected' }
export interface Task { id: string; title: string; assignee: string; status: 'To do' | 'In progress' | 'Done' }
export interface Fundraiser { id: string; name: string; goal: number; raised: number; date: string; tasks: Task[] }
export interface Expense { id: string; userId: string; title: string; category: string; amount: number; date: string; status: 'Pending' | 'Approved' | 'Reimbursed' | 'Rejected' }
export interface Ledger { id: string; date: string; type: 'in' | 'out'; category: string; desc: string; amount: number }

interface DB {
  users: User[]; plans: Plan[]; memberships: Membership[]; events: EventT[]; tickets: Ticket[];
  announcements: Announcement[]; products: Product[]; orders: Order[]; fundraisers: Fundraiser[];
  expenses: Expense[]; ledger: Ledger[]; sessionId: string | null;
}

const uid = () => Math.random().toString(36).slice(2, 9);
const iso = (d: number) => new Date(Date.now() + d * 864e5).toISOString().slice(0, 10);
export const money = (n: number) => '₹' + n.toLocaleString('en-IN');
export const fdate = (s: string) => new Date(s).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

function seed(): DB {
  const users: User[] = [
    { id: 'u1', email: 'admin@skyline.edu', password: 'admin123', name: 'Aarav Mehta', studentId: 'SKY-0001', phone: '9800000001', role: 'admin', joined: iso(-300) },
    { id: 'u2', email: 'riya@skyline.edu', password: 'member123', name: 'Riya Shah', studentId: 'SKY-1042', phone: '9800000002', role: 'member', joined: iso(-120) },
    { id: 'u3', email: 'kabir@skyline.edu', password: 'member123', name: 'Kabir Patel', studentId: 'SKY-1043', phone: '9800000003', role: 'member', joined: iso(-340) },
    { id: 'u4', email: 'naina@skyline.edu', password: 'member123', name: 'Naina Desai', studentId: 'SKY-1044', phone: '9800000004', role: 'member', joined: iso(-60) },
  ];
  const plans: Plan[] = [
    { id: 'p1', name: 'Standard', price: 500, eventDisc: 10, merchDisc: 10, perks: ['Member ticket pricing', '10% off merchandise', 'Voting rights'] },
    { id: 'p2', name: 'Premium', price: 1000, eventDisc: 20, merchDisc: 20, perks: ['Best ticket pricing', '20% off merchandise', 'Priority seating', 'Voting rights'] },
  ];
  const memberships: Membership[] = [
    { userId: 'u1', planId: 'p2', start: iso(-300), end: iso(65), paid: true, amount: 1000 },
    { userId: 'u2', planId: 'p1', start: iso(-120), end: iso(245), paid: true, amount: 500 },
    { userId: 'u3', planId: 'p2', start: iso(-340), end: iso(25), paid: true, amount: 1000 },
  ];
  const events: EventT[] = [
    { id: 'e1', name: 'Spring Gala 2026', date: iso(21) + 'T19:00', venue: 'Skyline Auditorium', desc: 'Our biggest night of the year — live music, dinner and the annual awards.', capacity: 120, memberPrice: 400, publicPrice: 650 },
    { id: 'e2', name: 'Open Mic Night', date: iso(-14) + 'T18:00', venue: 'Student Union Lawn', desc: 'An evening of poetry, music and stand-up.', capacity: 60, memberPrice: 100, publicPrice: 150 },
    { id: 'e3', name: 'Career Talk: Design in Tech', date: iso(9) + 'T16:30', venue: 'Seminar Hall B', desc: 'Alumni panel followed by networking.', capacity: 80, memberPrice: 0, publicPrice: 100 },
  ];
  const tickets: Ticket[] = [
    { id: 't1', eventId: 'e2', userId: 'u2', holder: 'Riya Shah', price: 100, code: 'SKY-OM-4821', checkedIn: true, checkedAt: iso(-14), bought: iso(-20) },
    { id: 't2', eventId: 'e2', userId: 'u3', holder: 'Kabir Patel', price: 100, code: 'SKY-OM-7710', checkedIn: true, checkedAt: iso(-14), bought: iso(-19) },
    { id: 't3', eventId: 'e2', userId: 'guest', holder: 'Guest – Tanvi', price: 150, code: 'SKY-OM-3392', checkedIn: false, bought: iso(-18) },
    { id: 't4', eventId: 'e1', userId: 'u3', holder: 'Kabir Patel', price: 320, code: 'SKY-GA-1105', checkedIn: false, bought: iso(-2) },
  ];
  const announcements: Announcement[] = [
    { id: 'a1', title: 'General body meeting this Friday', body: 'We meet at 5 PM in Seminar Hall B to finalise Spring Gala plans. Please attend.', date: iso(-2), author: 'Aarav Mehta', audience: 'All members' },
    { id: 'a2', title: 'Hoodie pre-orders are open', body: 'Order your Skyline hoodie from the Shop. Members get a discount. Orders close in two weeks.', date: iso(-6), author: 'Aarav Mehta', audience: 'All members' },
  ];
  const products: Product[] = [
    { id: 'm1', name: 'Skyline Hoodie', price: 1499, desc: 'Heavyweight fleece, embroidered crest, oatmeal colour.', stock: { S: 8, M: 14, L: 10, XL: 4 } },
    { id: 'm2', name: 'Skyline T-Shirt', price: 599, desc: '100% cotton, relaxed fit, printed skyline artwork.', stock: { S: 12, M: 20, L: 15, XL: 6 } },
  ];
  const fundraisers: Fundraiser[] = [{
    id: 'f1', name: 'Autumn Bake Sale', goal: 15000, raised: 6400, date: iso(12),
    tasks: [
      { id: 'k1', title: 'Bake brownies & cookies', assignee: 'Riya Shah', status: 'In progress' },
      { id: 'k2', title: 'Buy supplies & packaging', assignee: 'Naina Desai', status: 'Done' },
      { id: 'k3', title: 'Manage table on the day', assignee: 'Kabir Patel', status: 'To do' },
      { id: 'k4', title: 'Design price posters', assignee: 'Aarav Mehta', status: 'To do' },
    ],
  }];
  const expenses: Expense[] = [
    { id: 'x1', userId: 'u4', title: 'Gala decorations', category: 'Events', amount: 2300, date: iso(-5), status: 'Pending' },
    { id: 'x2', userId: 'u2', title: 'Open Mic sound rental', category: 'Events', amount: 3500, date: iso(-12), status: 'Reimbursed' },
    { id: 'x3', userId: 'u3', title: 'Bake sale ingredients', category: 'Fundraiser', amount: 1200, date: iso(-3), status: 'Approved' },
  ];
  const ledger: Ledger[] = [
    { id: 'l1', date: iso(-300), type: 'in', category: 'Dues', desc: 'Membership – Aarav Mehta', amount: 1000 },
    { id: 'l2', date: iso(-120), type: 'in', category: 'Dues', desc: 'Membership – Riya Shah', amount: 500 },
    { id: 'l3', date: iso(-340), type: 'in', category: 'Dues', desc: 'Membership – Kabir Patel', amount: 1000 },
    { id: 'l4', date: iso(-20), type: 'in', category: 'Tickets', desc: 'Open Mic tickets (3)', amount: 350 },
    { id: 'l5', date: iso(-18), type: 'in', category: 'Merchandise', desc: 'Hoodie pre-orders (batch 1)', amount: 8994 },
    { id: 'l6', date: iso(-9), type: 'in', category: 'Fundraiser', desc: 'Bake sale – first stall day', amount: 6400 },
    { id: 'l7', date: iso(-12), type: 'out', category: 'Reimbursement', desc: 'Open Mic sound rental – Riya Shah', amount: 3500 },
  ];
  return { users, plans, memberships, events, tickets, announcements, products, orders: [], fundraisers, expenses, ledger, sessionId: null };
}

const KEY = 'skyline-db-v1';
const load = (): DB => { try { const r = localStorage.getItem(KEY); if (r) return JSON.parse(r); } catch { /* ignore */ } return seed(); };

export interface PayRequest { title: string; amount: number; onSuccess: () => void }
type Res = { ok: boolean; msg: string };

interface Ctx {
  db: DB; me: User | null; myMembership: Membership | null; isActiveMember: (id: string) => boolean;
  login: (e: string, p: string) => Res; logout: () => void;
  register: (d: { name: string; email: string; password: string; studentId: string; phone: string }) => Res;
  pay: PayRequest | null; startPay: (r: PayRequest) => void; closePay: () => void;
  buyMembership: (planId: string, userId?: string) => void;
  buyTicket: (eventId: string, holder?: string) => void;
  checkIn: (code: string) => { status: 'ok' | 'used' | 'missing'; ticket?: Ticket };
  createEvent: (e: Omit<EventT, 'id'>) => void;
  postAnnouncement: (a: { title: string; body: string; audience: string }) => void;
  buyProduct: (productId: string, size: string, qty: number) => void;
  restock: (productId: string, size: string, qty: number) => void;
  addFundraiser: (name: string, goal: number, date: string) => void;
  addTask: (fid: string, title: string, assignee: string) => void;
  setTaskStatus: (fid: string, tid: string, s: Task['status']) => void;
  recordSales: (fid: string, amt: number) => void;
  submitExpense: (e: { title: string; category: string; amount: number }) => void;
  setExpense: (id: string, s: Expense['status']) => void;
  notify: (msg: string) => void; toast: string; ticketPrice: (ev: EventT, userId: string | null) => number;
}

const C = createContext<Ctx | null>(null);
export const useApp = () => { const c = useContext(C); if (!c) throw new Error('no store'); return c; };

export function Provider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<DB>(load);
  const [pay, setPay] = useState<PayRequest | null>(null);
  const [toast, setToast] = useState('');
  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch { /* ignore */ } }, [db]);
  const notify = (m: string) => { setToast(m); setTimeout(() => setToast(''), 3200); };
  const upd = (f: (d: DB) => DB) => setDb(d => f(d));
  const me = db.users.find(u => u.id === db.sessionId) || null;
  const today = () => new Date().toISOString().slice(0, 10);
  const isActiveMember = (id: string) => db.memberships.some(m => m.userId === id && m.paid && m.end >= today());
  const myMembership = me ? db.memberships.find(m => m.userId === me.id) || null : null;
  const led = (type: 'in' | 'out', category: string, desc: string, amount: number): Ledger => ({ id: uid(), date: today(), type, category, desc, amount });

  const login = (e: string, p: string): Res => {
    const u = db.users.find(x => x.email.toLowerCase() === e.trim().toLowerCase() && x.password === p);
    if (!u) return { ok: false, msg: 'Email or password is incorrect.' };
    upd(d => ({ ...d, sessionId: u.id })); return { ok: true, msg: '' };
  };
  const logout = () => upd(d => ({ ...d, sessionId: null }));
  const register: Ctx['register'] = d0 => {
    if (db.users.some(u => u.email.toLowerCase() === d0.email.trim().toLowerCase())) return { ok: false, msg: 'An account with this email already exists.' };
    const u: User = { id: uid(), email: d0.email.trim(), password: d0.password, name: d0.name.trim(), studentId: d0.studentId.trim() || 'SKY-' + Math.floor(2000 + Math.random() * 7000), phone: d0.phone, role: 'member', joined: today() };
    upd(d => ({ ...d, users: [...d.users, u], sessionId: u.id })); return { ok: true, msg: '' };
  };

  const buyMembership = (planId: string, userId?: string) => {
    const plan = db.plans.find(p => p.id === planId)!; const id = userId || me!.id; const user = db.users.find(u => u.id === id)!;
    const cur = db.memberships.find(m => m.userId === id);
    const base = cur && cur.end >= today() ? new Date(cur.end) : new Date();
    const end = new Date(base); end.setFullYear(end.getFullYear() + 1);
    const m: Membership = { userId: id, planId, start: today(), end: end.toISOString().slice(0, 10), paid: true, amount: plan.price };
    upd(d => ({ ...d, memberships: [...d.memberships.filter(x => x.userId !== id), m], ledger: [led('in', 'Dues', `Membership (${plan.name}) – ${user.name}`, plan.price), ...d.ledger] }));
  };

  const ticketPrice = (ev: EventT, userId: string | null) => {
    if (userId && isActiveMember(userId)) {
      const m = db.memberships.find(x => x.userId === userId)!; const plan = db.plans.find(p => p.id === m.planId)!;
      return Math.round(ev.memberPrice * (1 - (plan.eventDisc - 10) / 100));
    }
    return ev.publicPrice;
  };

  const buyTicket = (eventId: string, holder?: string) => {
    const ev = db.events.find(e => e.id === eventId)!;
    const price = ticketPrice(ev, me?.id || null);
    const code = 'SKY-' + ev.name.replace(/[^A-Z]/g, '').slice(0, 2).padEnd(2, 'X') + '-' + Math.floor(1000 + Math.random() * 9000);
    const t: Ticket = { id: uid(), eventId, userId: me?.id || 'guest', holder: holder || me?.name || 'Guest', price, code, checkedIn: false, bought: today() };
    upd(d => ({ ...d, tickets: [t, ...d.tickets], ledger: price > 0 ? [led('in', 'Tickets', `${ev.name} ticket – ${t.holder}`, price), ...d.ledger] : d.ledger }));
  };
  const checkIn: Ctx['checkIn'] = code => {
    const t = db.tickets.find(x => x.code.toLowerCase() === code.trim().toLowerCase());
    if (!t) return { status: 'missing' };
    if (t.checkedIn) return { status: 'used', ticket: t };
    upd(d => ({ ...d, tickets: d.tickets.map(x => x.id === t.id ? { ...x, checkedIn: true, checkedAt: new Date().toISOString() } : x) }));
    return { status: 'ok', ticket: t };
  };
  const createEvent: Ctx['createEvent'] = e => upd(d => ({ ...d, events: [{ ...e, id: uid() }, ...d.events] }));
  const postAnnouncement: Ctx['postAnnouncement'] = a => upd(d => ({ ...d, announcements: [{ id: uid(), ...a, date: today(), author: me?.name || 'Admin' }, ...d.announcements] }));

  const buyProduct = (productId: string, size: string, qty: number) => {
    const p = db.products.find(x => x.id === productId)!;
    const disc = me && isActiveMember(me.id) ? db.plans.find(pl => pl.id === db.memberships.find(m => m.userId === me.id)!.planId)!.merchDisc : 0;
    const total = Math.round(p.price * qty * (1 - disc / 100));
    const o: Order = { id: uid(), userId: me!.id, productId, size, qty, total, date: today(), status: 'Paid' };
    upd(d => ({ ...d, orders: [o, ...d.orders],
      products: d.products.map(x => x.id === productId ? { ...x, stock: { ...x.stock, [size]: x.stock[size] - qty } } : x),
      ledger: [led('in', 'Merchandise', `${p.name} (${size}) × ${qty} – ${me!.name}`, total), ...d.ledger] }));
  };
  const restock: Ctx['restock'] = (pid, size, qty) => upd(d => ({ ...d, products: d.products.map(x => x.id === pid ? { ...x, stock: { ...x.stock, [size]: x.stock[size] + qty } } : x) }));

  const addFundraiser: Ctx['addFundraiser'] = (name, goal, date) => upd(d => ({ ...d, fundraisers: [{ id: uid(), name, goal, raised: 0, date, tasks: [] }, ...d.fundraisers] }));
  const addTask: Ctx['addTask'] = (fid, title, assignee) => upd(d => ({ ...d, fundraisers: d.fundraisers.map(f => f.id === fid ? { ...f, tasks: [...f.tasks, { id: uid(), title, assignee, status: 'To do' }] } : f) }));
  const setTaskStatus: Ctx['setTaskStatus'] = (fid, tid, s) => upd(d => ({ ...d, fundraisers: d.fundraisers.map(f => f.id === fid ? { ...f, tasks: f.tasks.map(t => t.id === tid ? { ...t, status: s } : t) } : f) }));
  const recordSales: Ctx['recordSales'] = (fid, amt) => upd(d => { const f = d.fundraisers.find(x => x.id === fid)!; return { ...d, fundraisers: d.fundraisers.map(x => x.id === fid ? { ...x, raised: x.raised + amt } : x), ledger: [led('in', 'Fundraiser', `${f.name} – sales`, amt), ...d.ledger] }; });

  const submitExpense: Ctx['submitExpense'] = e => upd(d => ({ ...d, expenses: [{ id: uid(), userId: me!.id, ...e, date: today(), status: 'Pending' }, ...d.expenses] }));
  const setExpense: Ctx['setExpense'] = (id, s) => upd(d => {
    const x = d.expenses.find(e => e.id === id)!; const u = d.users.find(v => v.id === x.userId);
    return { ...d, expenses: d.expenses.map(e => e.id === id ? { ...e, status: s } : e), ledger: s === 'Reimbursed' ? [led('out', 'Reimbursement', `${x.title} – ${u?.name}`, x.amount), ...d.ledger] : d.ledger };
  });

  const v: Ctx = { db, me, myMembership, isActiveMember, login, logout, register, pay, startPay: setPay, closePay: () => setPay(null), buyMembership, buyTicket, checkIn, createEvent, postAnnouncement, buyProduct, restock, addFundraiser, addTask, setTaskStatus, recordSales, submitExpense, setExpense, notify, toast, ticketPrice };
  return <C.Provider value={v}>{children}</C.Provider>;
}

