import { useState } from 'react';
import type { ReactNode } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useApp, money } from './store';

export const Head = ({ title, sub, children }: { title: string; sub?: string; children?: ReactNode }) => (
  <div className="head"><div><h1>{title}</h1>{sub && <p>{sub}</p>}</div><div className="row">{children}</div></div>
);

export const Stat = ({ l, v, sub }: { l: string; v: string | number; sub?: string }) => (
  <div className="card stat"><div className="l">{l}</div><div className="v">{v}</div>{sub && <div className="mut sans" style={{ fontSize: 12 }}>{sub}</div>}</div>
);

export function Layout() {
  const { me, logout } = useApp();
  const isStaff = me?.is_staff ?? false;
  const canFinance = me?.permissions?.includes('finance.view') ?? false;

  const links: [string, string][] = [
    ['/', 'Dashboard'],
    ['/events', 'Events & Tickets'],
    ['/announcements', 'Announcements'],
    ['/shop', 'Merchandise'],
    ['/fundraisers', 'Fundraisers'],
    ['/expenses', 'Expenses'],
    ['/membership', isStaff ? 'Membership Plans' : 'My Membership'],
  ];
  const staffLinks: [string, string][] = [
    ['/members', 'Members'],
    ['/checkin', 'Door Check-in'],
    ...(canFinance ? [['/finance', 'Finance Ledger']] as [string, string][] : []),
  ];

  const name = me ? `${me.first_name} ${me.last_name}` : '';

  return (
    <div className="shell">
      <aside className="side">
        <div className="brand">Skyline<small>Student Association</small></div>
        <nav className="nav">
          {links.map(([to, t]) => <NavLink key={to} to={to} end={to === '/'}>{t}</NavLink>)}
          {isStaff && <div className="sec">Leadership</div>}
          {isStaff && staffLinks.map(([to, t]) => <NavLink key={to} to={to}>{t}</NavLink>)}
        </nav>
        <div className="who">
          <b>{name}</b>
          <div className="mut">
            {me?.roles?.filter(r => r !== 'MEMBER').join(', ') || 'Member'} · {me?.student_id ?? ''}
          </div>
          <button className="sm" style={{ marginTop: 8 }} onClick={logout}>Sign out</button>
        </div>
      </aside>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="mnav">
          {[...links, ...(isStaff ? staffLinks : [])].map(([to, t]) => <NavLink key={to} to={to} end={to === '/'}>{t}</NavLink>)}
          <a href="#/" onClick={logout}>Sign out</a>
        </div>
        <main className="main"><Outlet /></main>
      </div>
    </div>
  );
}

export function Toast() { const { toast } = useApp(); return toast ? <div className="toast">{toast}</div> : null; }

type Method = 'upi' | 'card' | 'bank';
export function Gateway() {
  const { pay, closePay, notify } = useApp();
  const [method, setMethod] = useState<Method>('upi');
  const [f, setF] = useState({ upi: '', card: '', exp: '', cvv: '', name: '', bank: 'State Bank of India' });
  const [err, setErr] = useState('');
  const [stage, setStage] = useState<'form' | 'wait' | 'done'>('form');
  if (!pay) return null;
  const validate = () => {
    if (method === 'upi' && !/^[\w.\-]{2,}@[a-z]{2,}$/i.test(f.upi.trim())) return 'Enter a valid UPI ID, e.g. name@okbank';
    if (method === 'card') {
      if (f.card.replace(/\s/g, '').length < 13) return 'Enter a valid card number';
      if (!/^\d{2}\/\d{2}$/.test(f.exp)) return 'Expiry should look like 08/28';
      if (f.cvv.length < 3) return 'Enter the 3-digit CVV';
      if (!f.name.trim()) return 'Enter the name on the card';
    }
    return '';
  };
  const submit = () => {
    const e = validate(); setErr(e); if (e) return;
    setStage('wait');
    setTimeout(() => { setStage('done'); pay.onSuccess(); }, 1800);
  };
  const close = () => {
    if (stage === 'wait') return;
    if (stage === 'done') notify('Payment of ' + money(pay.amount) + ' successful');
    setStage('form'); setErr(''); closePay();
  };
  const set = (k: string, v: string) => setF({ ...f, [k]: v });
  return (
    <div className="modal"><div className="mbox">
      <div className="gwh"><div style={{ fontSize: 12, opacity: .8 }}>SKYLINE SECURE CHECKOUT · TEST MODE</div><div style={{ fontSize: 24, marginTop: 4 }}>{money(pay.amount)}</div><div style={{ fontSize: 13, opacity: .85 }}>{pay.title}</div></div>
      <div style={{ padding: 20 }}>
        {stage === 'form' && <>
          <div className="tabs">{(['upi', 'card', 'bank'] as Method[]).map(m => <button key={m} className={method === m ? 'on sm' : 'sm'} onClick={() => { setMethod(m); setErr(''); }}>{m === 'upi' ? 'UPI' : m === 'card' ? 'Card' : 'Net Banking'}</button>)}</div>
          {method === 'upi' && <><label>UPI ID</label><input placeholder="name@okbank" value={f.upi} onChange={e => set('upi', e.target.value)} /></>}
          {method === 'card' && <><label>Card number</label><input inputMode="numeric" placeholder="4111 1111 1111 1111" value={f.card} onChange={e => set('card', e.target.value.replace(/[^\d ]/g, '').slice(0, 19))} />
            <div className="row" style={{ alignItems: 'flex-start' }}><div style={{ flex: 1 }}><label>Expiry</label><input placeholder="MM/YY" value={f.exp} onChange={e => set('exp', e.target.value.slice(0, 5))} /></div><div style={{ flex: 1 }}><label>CVV</label><input type="password" placeholder="•••" value={f.cvv} onChange={e => set('cvv', e.target.value.replace(/\D/g, '').slice(0, 4))} /></div></div>
            <label>Name on card</label><input value={f.name} onChange={e => set('name', e.target.value)} /></>}
          {method === 'bank' && <><label>Select bank</label><select value={f.bank} onChange={e => set('bank', e.target.value)}>{['State Bank of India', 'HDFC Bank', 'ICICI Bank', 'Axis Bank', 'Bank of Baroda'].map(b => <option key={b}>{b}</option>)}</select></>}
          {err && <div className="err">{err}</div>}
          <button className="pri" style={{ width: '100%', marginTop: 18, padding: 12 }} onClick={submit}>Pay {money(pay.amount)}</button>
          <button style={{ width: '100%', marginTop: 8 }} onClick={close}>Cancel</button>
          <div className="mut sans" style={{ fontSize: 11.5, textAlign: 'center', marginTop: 10 }}>Demo gateway — no real money is charged.</div>
        </>}
        {stage === 'wait' && <div style={{ textAlign: 'center', padding: '40px 0' }}><h3>Processing payment…</h3><p className="mut sans">Please don't close this window.</p></div>}
        {stage === 'done' && <div style={{ textAlign: 'center', padding: '30px 0' }}><div style={{ fontSize: 44, color: 'var(--ok)' }}>✓</div><h2>Payment successful</h2><p className="mut sans">Ref: TXN{Date.now().toString().slice(-9)}</p><button className="pri" onClick={close}>Done</button></div>}
      </div>
    </div></div>
  );
}
