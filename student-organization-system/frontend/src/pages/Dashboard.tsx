import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp, money, fdate } from '../store/store';
import { Head, Stat } from '../store/ui';
import { api } from '../services/api';
import type { DashboardData, ApiEvent, Announcement } from '../services/api';


export function Dashboard() {
  const { me, refreshKey } = useApp();
  const [dash, setDash] = useState<DashboardData | null>(null);
  const [events, setEvents] = useState<ApiEvent[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [err, setErr] = useState('');

  useEffect(() => {
    setErr('');
    Promise.all([
      api.get<DashboardData>('/dashboard'),
      api.get<{ items: ApiEvent[] }>('/events?page_size=5'),
      api.get<{ items: Announcement[] }>('/announcements?page_size=5'),
    ])
      .then(([d, ev, ann]) => {
        setDash(d);
        setEvents(ev.items ?? []);
        setAnnouncements(ann.items ?? []);
      })
      .catch(e => setErr(e.message));
  }, [refreshKey]);

  const isStaff = me?.is_staff ?? false;
  const membership = dash?.member?.membership;
  const daysLeft = membership?.days_until_expiry ?? null;
  const upcomingEvents = events.filter(e => new Date(e.start_datetime) >= new Date());

  if (err) return <><Head title="Dashboard" /><div className="res bad">{err}</div></>;

  return (<>
    <Head
      title={`Welcome, ${me?.first_name}`}
      sub={isStaff ? 'Club overview for the leadership team' : 'Here is what is happening at Skyline'}
    />

    {/* Membership warnings */}
    {!isStaff && !membership?.is_active && (
      <div className="banner">You don't have an active membership. <Link to="/membership">Choose a plan</Link> to unlock member prices.</div>
    )}
    {!isStaff && daysLeft !== null && daysLeft >= 0 && daysLeft <= 60 && (
      <div className="banner">Your membership expires in {daysLeft} days. <Link to="/membership"><button className="sm pri">Renew now</button></Link></div>
    )}

    {/* Stats */}
    {isStaff && dash?.overview ? (
      <div className="grid g4">
        <Stat l="Total members" v={dash.overview.members} />
        <Stat l="Active memberships" v={dash.overview.active_memberships} />
        <Stat l="Upcoming events" v={dash.overview.events} />
        <Stat l="Pending expenses" v={dash.overview.pending_expenses} />
      </div>
    ) : !isStaff && (
      <div className="grid g3">
        <div className="card stat">
          <div className="l">Membership</div>
          <div className="v">{membership?.plan_name ?? 'None'}</div>
          <div className="mut sans" style={{ fontSize: 12 }}>
            {membership?.is_active ? `Valid until ${fdate(membership.end_date)}` : 'Not enrolled'}
          </div>
        </div>
        <Stat l="My tickets" v={dash?.member?.tickets ?? '—'} />
        <Stat l="Merch orders" v={dash?.member?.orders ?? '—'} />
      </div>
    )}

    {/* Finance overview for staff */}
    {isStaff && dash?.finance && (
      <div className="grid g4 mt">
        <Stat l="Total income" v={money(dash.finance.total_income ?? 0)} />
        <Stat l="Total expenses" v={money((dash.finance as any).total_expenses ?? dash.finance.total_expense ?? 0)} />
        <Stat l="Balance" v={money(dash.finance.balance ?? 0)} />
        <Stat l="Pending expenses" v={dash.finance.pending_expenses?.length ?? 0} sub="awaiting approval" />
      </div>
    )}

    <div className="grid g2 mt">
      {/* Upcoming events */}
      <div className="card">
        <div className="row sp"><h2>Upcoming events</h2><Link to="/events">All</Link></div>
        {!dash ? <div className="mut sans" style={{ fontSize: 13, marginTop: 8 }}>Loading…</div> :
          upcomingEvents.length === 0 ? <div className="mut sans" style={{ fontSize: 13, marginTop: 8 }}>No upcoming events.</div> :
            upcomingEvents.map(e => (
              <div key={e.id} className="row sp mt">
                <div>
                  <b>{e.name}</b>
                  <div className="mut sans" style={{ fontSize: 13 }}>{fdate(e.start_datetime)} · {e.venue}</div>
                </div>
                <span className="badge">{e.capacity - (e.sold ?? 0)} seats left</span>
              </div>
            ))}
      </div>

      {/* Latest announcements */}
      <div className="card">
        <div className="row sp"><h2>Latest announcements</h2><Link to="/announcements">All</Link></div>
        {!dash ? <div className="mut sans" style={{ fontSize: 13, marginTop: 8 }}>Loading…</div> :
          announcements.length === 0 ? <div className="mut sans" style={{ fontSize: 13, marginTop: 8 }}>No announcements yet.</div> :
            announcements.slice(0, 3).map(a => (
              <div key={a.id} className="mt">
                <b>{a.title}</b>
                <div className="mut sans" style={{ fontSize: 13 }}>{fdate(a.published_at ?? a.created_at)}</div>
              </div>
            ))}
      </div>
    </div>

    {/* Pending expenses for staff */}
    {isStaff && dash?.finance?.pending_expenses && dash.finance.pending_expenses.length > 0 && (
      <div className="card mt">
        <div className="row sp"><h2>Expenses awaiting approval</h2><Link to="/expenses">All</Link></div>
        <table><thead><tr><th>Description</th><th>Amount</th><th>Status</th></tr></thead><tbody>
          {dash.finance.pending_expenses.map(e => (
            <tr key={e.id}>
              <td>{e.description}</td>
              <td>{money(e.amount)}</td>
              <td><span className="badge b-warn">{e.status}</span></td>
            </tr>
          ))}
        </tbody></table>
      </div>
    )}
  </>);
}
