import { useState } from 'react';
import { useApp, money, fdate } from '../store/store';
import { Head } from '../store/ui';

export function Announcements() {
  const { db, me, postAnnouncement, notify } = useApp();
  const [t, setT] = useState(''); const [b, setB] = useState('');
  const send = () => { if (!t.trim() || !b.trim()) return notify('Add a title and a message'); postAnnouncement({ title: t, body: b, audience: 'All members' }); setT(''); setB(''); notify(`Announcement sent to ${db.users.length} members`); };
  return (<>
    <Head title="Announcements" sub="One post reaches every member, and the history stays on record." />
    {me!.role === 'admin' && <div className="card" style={{ marginBottom: 18 }}><h2>New announcement</h2><label>Title</label><input value={t} onChange={e => setT(e.target.value)} /><label>Message</label><textarea rows={3} value={b} onChange={e => setB(e.target.value)} /><button className="pri mt" onClick={send}>Post & email all members</button></div>}
    {db.announcements.map(a => <div key={a.id} className="card" style={{ marginBottom: 12 }}><div className="row sp"><h2>{a.title}</h2><span className="badge">{a.audience}</span></div><p>{a.body}</p><div className="mut sans" style={{ fontSize: 12 }}>{fdate(a.date)} · {a.author}</div></div>)}
  </>);
}

export function Shop() {
  const { db, me, isActiveMember, myMembership, startPay, buyProduct, restock, notify } = useApp();
  const admin = me!.role === 'admin';
  const [sel, setSel] = useState<Record<string, string>>({}); const [qty, setQty] = useState<Record<string, number>>({});
  const disc = me && isActiveMember(me.id) && myMembership ? db.plans.find(p => p.id === myMembership.planId)!.merchDisc : 0;
  const mine = db.orders.filter(o => o.userId === me!.id);
  return (<>
    <Head title="Merchandise" sub={disc ? `Your member discount: ${disc}% off` : 'Join as a member for a discount'} />
    <div className="grid g2">{db.products.map(p => { const size = sel[p.id]; const q = qty[p.id] || 1; const total = Math.round(p.price * q * (1 - disc / 100));
      return <div key={p.id} className="card"><h2>{p.name}</h2><p className="mut">{p.desc}</p><div style={{ fontSize: 22 }}>{money(Math.round(p.price * (1 - disc / 100)))} {disc > 0 && <s className="mut sans" style={{ fontSize: 14 }}>{money(p.price)}</s>}</div>
        <label>Size</label><div className="row">{Object.entries(p.stock).map(([s, n]) => <button key={s} disabled={n <= 0} className={'size sm ' + (size === s ? 'on' : '')} onClick={() => setSel({ ...sel, [p.id]: s })}>{s} <span style={{ opacity: .7 }}>({n})</span></button>)}</div>
        <label>Quantity</label><input type="number" min={1} style={{ width: 90 }} value={q} onChange={e => setQty({ ...qty, [p.id]: Math.max(1, +e.target.value || 1) })} />
        <button className="pri mt" onClick={() => { if (!size) return notify('Please choose a size first'); if (q > p.stock[size]) return notify(`Only ${p.stock[size]} left in size ${size}`); startPay({ title: `${p.name} (${size}) × ${q}`, amount: total, onSuccess: () => buyProduct(p.id, size, q) }); }}>Order · {money(total)}</button>
        {admin && <div className="row mt sans" style={{ fontSize: 13 }}><span className="mut">Restock:</span>{Object.keys(p.stock).map(s => <button key={s} className="sm" onClick={() => { restock(p.id, s, 5); notify(`+5 ${p.name} (${s})`); }}>+5 {s}</button>)}</div>}</div>; })}</div>
    <div className="card mt"><h2>{admin ? 'All orders' : 'My orders'}</h2><table><thead><tr><th>Date</th><th>Item</th><th>Size</th><th>Qty</th><th>Total</th></tr></thead><tbody>
      {(admin ? db.orders : mine).length === 0 && <tr><td colSpan={5} className="mut">No orders yet.</td></tr>}
      {(admin ? db.orders : mine).map(o => <tr key={o.id}><td>{fdate(o.date)}</td><td>{db.products.find(p => p.id === o.productId)!.name}</td><td>{o.size}</td><td>{o.qty}</td><td>{money(o.total)}</td></tr>)}</tbody></table></div>
  </>);
}

export function Fundraisers() {
  const { db, me, addFundraiser, addTask, setTaskStatus, recordSales, notify } = useApp();
  const admin = me!.role === 'admin';
  const [nf, setNf] = useState({ name: '', goal: '10000', date: '' }); const [nt, setNt] = useState<Record<string, { title: string; who: string }>>({}); const [amt, setAmt] = useState<Record<string, string>>({});
  const cols: ('To do' | 'In progress' | 'Done')[] = ['To do', 'In progress', 'Done'];
  return (<>
    <Head title="Fundraisers" sub="See what is done, who owns what, and how close you are to the goal." />
    {admin && <div className="card" style={{ marginBottom: 18 }}><h2>New fundraiser</h2><div className="row" style={{ alignItems: 'flex-end' }}>
      <div style={{ flex: 2 }}><label>Name</label><input value={nf.name} onChange={e => setNf({ ...nf, name: e.target.value })} /></div>
      <div style={{ flex: 1 }}><label>Goal (₹)</label><input type="number" value={nf.goal} onChange={e => setNf({ ...nf, goal: e.target.value })} /></div>
      <div style={{ flex: 1 }}><label>Date</label><input type="date" value={nf.date} onChange={e => setNf({ ...nf, date: e.target.value })} /></div>
      <button className="pri" onClick={() => { if (!nf.name.trim() || !nf.date) return notify('Add a name and date'); addFundraiser(nf.name, +nf.goal || 1000, nf.date); setNf({ name: '', goal: '10000', date: '' }); notify('Fundraiser created'); }}>Create</button></div></div>}
    {db.fundraisers.map(f => { const done = f.tasks.filter(t => t.status === 'Done').length; const pct = Math.min(100, Math.round(f.raised / f.goal * 100)); const tp = f.tasks.length ? Math.round(done / f.tasks.length * 100) : 0; const n = nt[f.id] || { title: '', who: db.users[0].name };
      return <div key={f.id} className="card" style={{ marginBottom: 18 }}><div className="row sp"><div><h2>{f.name}</h2><div className="mut sans" style={{ fontSize: 13 }}>Event day {fdate(f.date)}</div></div><span className={'badge ' + (pct >= 100 ? 'b-ok' : tp >= 50 ? 'b-ok' : 'b-warn')}>{pct >= 100 ? 'Goal reached' : tp >= 50 ? 'On track' : 'Needs attention'}</span></div>
        <div className="grid g2 mt"><div><div className="row sp sans" style={{ fontSize: 13 }}><span>Raised {money(f.raised)}</span><span>Goal {money(f.goal)}</span></div><div className="bar"><i style={{ width: pct + '%' }} /></div></div>
          <div><div className="row sp sans" style={{ fontSize: 13 }}><span>Tasks done</span><span>{done}/{f.tasks.length}</span></div><div className="bar"><i style={{ width: tp + '%' }} /></div></div></div>
        <div className="kan mt">{cols.map(c => <div key={c} className="col"><b className="sans" style={{ fontSize: 12 }}>{c.toUpperCase()}</b>{f.tasks.filter(t => t.status === c).map(t => <div key={t.id} className="t"><div>{t.title}</div><div className="mut" style={{ fontSize: 12 }}>{t.assignee}</div>
          <div className="row" style={{ marginTop: 6 }}>{cols.filter(x => x !== c).map(x => <button key={x} className="sm" onClick={() => setTaskStatus(f.id, t.id, x)}>→ {x}</button>)}</div></div>)}</div>)}</div>
        <div className="row mt" style={{ alignItems: 'flex-end' }}><div style={{ flex: 2 }}><label>Add task</label><input placeholder="e.g. Buy flour" value={n.title} onChange={e => setNt({ ...nt, [f.id]: { ...n, title: e.target.value } })} /></div>
          <div style={{ flex: 1 }}><label>Assign to</label><select value={n.who} onChange={e => setNt({ ...nt, [f.id]: { ...n, who: e.target.value } })}>{db.users.map(u => <option key={u.id}>{u.name}</option>)}</select></div>
          <button onClick={() => { if (!n.title.trim()) return notify('Describe the task first'); addTask(f.id, n.title, n.who); setNt({ ...nt, [f.id]: { title: '', who: n.who } }); }}>Add</button></div>
        {admin && <div className="row mt" style={{ alignItems: 'flex-end' }}><div style={{ flex: 1 }}><label>Record sales collected (₹)</label><input type="number" value={amt[f.id] || ''} onChange={e => setAmt({ ...amt, [f.id]: e.target.value })} /></div><button className="pri" onClick={() => { const a = +(amt[f.id] || 0); if (a <= 0) return notify('Enter an amount above zero'); recordSales(f.id, a); setAmt({ ...amt, [f.id]: '' }); notify('Sales added to the ledger'); }}>Add to ledger</button></div>}
      </div>; })}
  </>);
}
