import { Link } from 'react-router-dom';
import { useApp, money, fdate } from '../store/store';
import { Head, Stat } from '../store/ui';

export function Dashboard() {
  const { db, me, myMembership, isActiveMember, startPay, buyMembership, notify, postAnnouncement } = useApp();
  const admin = me!.role === 'admin';
  const today = new Date().toISOString().slice(0, 10);
  const days = myMembership ? Math.ceil((+new Date(myMembership.end) - Date.now()) / 864e5) : null;
  const plan = myMembership ? db.plans.find(p => p.id === myMembership.planId) : null;
  const up = db.events.filter(e => e.date.slice(0, 10) >= today).sort((a, b) => a.date.localeCompare(b.date));
  const inc = db.ledger.filter(l => l.type === 'in').reduce((s, l) => s + l.amount, 0);
  const out = db.ledger.filter(l => l.type === 'out').reduce((s, l) => s + l.amount, 0);
  const expiring = db.memberships.filter(m => { const d = Math.ceil((+new Date(m.end) - Date.now()) / 864e5); return d <= 60; });
  const renew = () => myMembership && startPay({ title: `Renew ${plan!.name} membership`, amount: plan!.price, onSuccess: () => buyMembership(plan!.id) });
  return (<>
    <Head title={`Welcome, ${me!.name.split(' ')[0]}`} sub={admin ? 'Club overview for the leadership team' : 'Here is what is happening at Skyline'} />
    {!admin && !isActiveMember(me!.id) && <div className="banner">You don't have an active membership. <Link to="/membership">Choose a plan</Link> to unlock member prices.</div>}
    {!admin && days !== null && days >= 0 && days <= 60 && <div className="banner">Your membership expires in {days} days. <button className="sm pri" onClick={renew}>Renew now</button></div>}
    {admin && <div className="grid g4">
      <Stat l="Members" v={db.memberships.filter(m => isActiveMember(m.userId)).length} sub="active" />
      <Stat l="Money in" v={money(inc)} /><Stat l="Money out" v={money(out)} /><Stat l="Balance" v={money(inc - out)} />
    </div>}
    {!admin && <div className="grid g3">
      <div className="card stat"><div className="l">Membership</div><div className="v">{plan?.name ?? 'None'}</div><div className="mut sans" style={{ fontSize: 12 }}>{myMembership ? `Valid until ${fdate(myMembership.end)}` : 'Not enrolled'}</div></div>
      <Stat l="My tickets" v={db.tickets.filter(t => t.userId === me!.id).length} />
      <Stat l="Merch orders" v={db.orders.filter(o => o.userId === me!.id).length} />
    </div>}
    <div className="grid g2 mt">
      <div className="card"><div className="row sp"><h2>Upcoming events</h2><Link to="/events">All</Link></div>
        {up.map(e => <div key={e.id} className="row sp mt"><div><b>{e.name}</b><div className="mut sans" style={{ fontSize: 13 }}>{fdate(e.date)} · {e.venue}</div></div><span className="badge">{e.capacity - db.tickets.filter(t => t.eventId === e.id).length} seats left</span></div>)}
      </div>
      <div className="card"><div className="row sp"><h2>Latest announcements</h2><Link to="/announcements">All</Link></div>
        {db.announcements.slice(0, 3).map(a => <div key={a.id} className="mt"><b>{a.title}</b><div className="mut sans" style={{ fontSize: 13 }}>{fdate(a.date)}</div></div>)}
      </div>
    </div>
    {admin && <div className="card mt"><h2>Renewals due (next 60 days or lapsed)</h2>
      <table><thead><tr><th>Member</th><th>Plan</th><th>Expires</th><th></th></tr></thead><tbody>
        {expiring.length === 0 && <tr><td colSpan={4} className="mut">No renewals due.</td></tr>}
        {expiring.map(m => { const u = db.users.find(x => x.id === m.userId)!; return <tr key={m.userId}><td>{u.name}</td><td>{db.plans.find(p => p.id === m.planId)!.name}</td><td>{fdate(m.end)}</td>
          <td><button className="sm" onClick={() => { postAnnouncement({ title: `Renewal reminder: ${u.name}`, body: `Hi ${u.name.split(' ')[0]}, your membership expires on ${fdate(m.end)}. Please renew from My Membership.`, audience: u.name }); notify('Reminder sent to ' + u.name); }}>Send reminder</button></td></tr>; })}
      </tbody></table></div>}
  </>);
}
