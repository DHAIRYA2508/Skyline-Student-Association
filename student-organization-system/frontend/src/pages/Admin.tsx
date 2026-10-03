import { useState } from 'react';
import { useApp, money, fdate } from '../store/store';
import { Head, Stat } from '../store/ui';

export function Expenses() {
  const { db, me, submitExpense, setExpense, notify } = useApp();
  const admin = me!.role === 'admin';
  const [f, setF] = useState({ title: '', category: 'Events', amount: '' });
  const list = admin ? db.expenses : db.expenses.filter(e => e.userId === me!.id);
  const cls = (s: string) => s === 'Reimbursed' ? 'b-ok' : s === 'Rejected' ? 'b-bad' : s === 'Approved' ? '' : 'b-warn';
  return (<>
    <Head title="Expenses & Reimbursements" sub="Submit what you spent; the treasurer approves and reimburses." />
    <div className="card" style={{ marginBottom: 18 }}><h2>Submit an expense</h2><div className="row" style={{ alignItems: 'flex-end' }}>
      <div style={{ flex: 2 }}><label>What was it for?</label><input value={f.title} onChange={e => setF({ ...f, title: e.target.value })} /></div>
      <div style={{ flex: 1 }}><label>Category</label><select value={f.category} onChange={e => setF({ ...f, category: e.target.value })}>{['Events', 'Fundraiser', 'Merchandise', 'Supplies', 'Other'].map(c => <option key={c}>{c}</option>)}</select></div>
      <div style={{ flex: 1 }}><label>Amount (₹)</label><input type="number" value={f.amount} onChange={e => setF({ ...f, amount: e.target.value })} /></div>
      <button className="pri" onClick={() => { if (!f.title.trim() || !(+f.amount > 0)) return notify('Add a description and an amount'); submitExpense({ title: f.title, category: f.category, amount: +f.amount }); setF({ ...f, title: '', amount: '' }); notify('Expense submitted for approval'); }}>Submit</button></div></div>
    <div className="card"><table><thead><tr><th>Date</th><th>Member</th><th>Item</th><th>Category</th><th>Amount</th><th>Status</th>{admin && <th></th>}</tr></thead><tbody>
      {list.length === 0 && <tr><td colSpan={7} className="mut">Nothing submitted yet.</td></tr>}
      {list.map(e => <tr key={e.id}><td>{fdate(e.date)}</td><td>{db.users.find(u => u.id === e.userId)?.name}</td><td>{e.title}</td><td>{e.category}</td><td>{money(e.amount)}</td><td><span className={'badge ' + cls(e.status)}>{e.status}</span></td>
        {admin && <td className="row">{e.status === 'Pending' && <><button className="sm pri" onClick={() => { setExpense(e.id, 'Approved'); notify('Approved'); }}>Approve</button><button className="sm" onClick={() => { setExpense(e.id, 'Rejected'); notify('Rejected'); }}>Reject</button></>}{e.status === 'Approved' && <button className="sm pri" onClick={() => { setExpense(e.id, 'Reimbursed'); notify('Reimbursed & recorded in ledger'); }}>Mark reimbursed</button>}</td>}</tr>)}</tbody></table></div>
  </>);
}

export function Members() {
  const { db, isActiveMember, startPay, buyMembership } = useApp();
  const [q, setQ] = useState('');
  const rows = db.users.filter(u => (u.name + u.email + u.studentId).toLowerCase().includes(q.toLowerCase()));
  return (<>
    <Head title="Members" sub="Everyone who has signed up, and who has paid dues." />
    <input placeholder="Search name, email or student ID" value={q} onChange={e => setQ(e.target.value)} style={{ maxWidth: 360, marginBottom: 14 }} />
    <div className="card"><table><thead><tr><th>Name</th><th>Student ID</th><th>Email</th><th>Plan</th><th>Valid until</th><th>Dues</th><th></th></tr></thead><tbody>
      {rows.map(u => { const m = db.memberships.find(x => x.userId === u.id); const act = isActiveMember(u.id); const p = m && db.plans.find(x => x.id === m.planId);
        return <tr key={u.id}><td>{u.name}</td><td>{u.studentId}</td><td>{u.email}</td><td>{p?.name ?? '—'}</td><td>{m ? fdate(m.end) : '—'}</td><td><span className={'badge ' + (act ? 'b-ok' : 'b-bad')}>{act ? 'Paid' : m ? 'Expired' : 'Unpaid'}</span></td>
          <td>{!act && <button className="sm" onClick={() => startPay({ title: `Dues – ${u.name}`, amount: 500, onSuccess: () => buyMembership('p1', u.id) })}>Collect dues</button>}</td></tr>; })}</tbody></table></div>
  </>);
}

export function CheckIn() {
  const { db, checkIn, isActiveMember } = useApp();
  const [code, setCode] = useState(''); const [res, setRes] = useState<ReturnType<typeof checkIn> | null>(null); const [q, setQ] = useState('');
  const go = () => { if (!code.trim()) return; setRes(checkIn(code)); setCode(''); };
  const mem = q.trim() ? db.users.find(u => [u.studentId, u.email, u.name].some(v => v.toLowerCase() === q.trim().toLowerCase())) : null;
  return (<>
    <Head title="Door Check-in" sub="Type or scan the ticket code, or verify a member by ID." />
    <div className="grid g2"><div className="card"><h2>Ticket check-in</h2><label>Ticket code</label><input autoFocus placeholder="SKY-GA-1105" value={code} onChange={e => setCode(e.target.value)} onKeyDown={e => e.key === 'Enter' && go()} /><button className="pri mt" onClick={go}>Check in</button>
      {res?.status === 'ok' && <div className="res ok"><b>✓ Valid — welcome in</b><div>{res.ticket!.holder} · {db.events.find(e => e.id === res.ticket!.eventId)?.name}</div></div>}
      {res?.status === 'used' && <div className="res warn"><b>Already used</b><div>{res.ticket!.holder} was checked in earlier.</div></div>}
      {res?.status === 'missing' && <div className="res bad"><b>Ticket not found</b><div>Check the code and try again.</div></div>}
      <div className="mut sans" style={{ fontSize: 12, marginTop: 12 }}>Try: SKY-GA-1105 (valid), SKY-OM-4821 (already used)</div></div>
    <div className="card"><h2>Verify a member</h2><label>Student ID, email or full name</label><input placeholder="SKY-1042" value={q} onChange={e => setQ(e.target.value)} />
      {q.trim() && (mem ? <div className={'res ' + (isActiveMember(mem.id) ? 'ok' : 'bad')}><b>{mem.name}</b> · {mem.studentId}<div>{isActiveMember(mem.id) ? 'Active member — dues paid' : 'Not an active member'}</div></div> : <div className="res bad">No member found for that entry.</div>)}</div></div>
  </>);
}

export function Finance() {
  const { db } = useApp();
  const sum = (t: 'in' | 'out', c?: string) => db.ledger.filter(l => l.type === t && (!c || l.category === c)).reduce((s, l) => s + l.amount, 0);
  const inc = sum('in'), out = sum('out'); const cats = ['Dues', 'Tickets', 'Merchandise', 'Fundraiser'];
  const pend = db.expenses.filter(e => e.status === 'Approved').reduce((s, e) => s + e.amount, 0);
  return (<>
    <Head title="Finance" sub="What came in, what went out, and what is left." />
    <div className="grid g4"><Stat l="Total in" v={money(inc)} /><Stat l="Total out" v={money(out)} /><Stat l="Balance" v={money(inc - out)} /><Stat l="Owed to volunteers" v={money(pend)} sub="approved, not yet paid" /></div>
    <div className="card mt"><h2>Income by source</h2>{cats.map(c => <div key={c} className="mt"><div className="row sp sans" style={{ fontSize: 14 }}><span>{c}</span><span>{money(sum('in', c))}</span></div><div className="bar"><i style={{ width: (inc ? sum('in', c) / inc * 100 : 0) + '%' }} /></div></div>)}
      <div className="mt"><div className="row sp sans" style={{ fontSize: 14 }}><span>Reimbursements (out)</span><span>{money(out)}</span></div><div className="bar"><i style={{ width: (inc ? out / inc * 100 : 0) + '%', background: 'var(--bad)' }} /></div></div></div>
    <div className="card mt"><h2>Ledger</h2><table><thead><tr><th>Date</th><th>Category</th><th>Description</th><th style={{ textAlign: 'right' }}>Amount</th></tr></thead><tbody>
      {[...db.ledger].sort((a, b) => b.date.localeCompare(a.date)).map(l => <tr key={l.id}><td>{fdate(l.date)}</td><td><span className="badge">{l.category}</span></td><td>{l.desc}</td><td style={{ textAlign: 'right', color: l.type === 'in' ? 'var(--ok)' : 'var(--bad)' }}>{l.type === 'in' ? '+' : '−'}{money(l.amount)}</td></tr>)}</tbody></table></div>
  </>);
}
