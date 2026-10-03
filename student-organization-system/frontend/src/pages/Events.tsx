import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { useApp, money, fdate } from '../store/store';
import { Head, Stat } from '../store/ui';
import { api } from '../services/api';
import type { ApiEvent, Ticket } from '../services/api';

function QR({ text }: { text: string }) {
  const [src, setSrc] = useState('');
  useEffect(() => {
    QRCode.toDataURL(text, { width: 110, margin: 1, color: { dark: '#3a2f22', light: '#fbf7ef' } })
      .then(setSrc).catch(() => setSrc(''));
  }, [text]);
  return src ? <img src={src} width={90} height={90} alt="ticket qr" /> : <div style={{ width: 90 }} />;
}

interface FullEvent extends ApiEvent {
  seats_taken: number;
  seats_left: number;
  your_price: number;
  your_price_type: string;
  stats?: { sold: number; revenue: number; checked_in: number };
}

export function Events() {
  const { me, startPay, notify, bump, refreshKey } = useApp();
  const isStaff = me?.is_staff ?? false;
  const [events, setEvents] = useState<FullEvent[]>([]);
  const [myTickets, setMyTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [repId, setRepId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [scope, setScope] = useState<'upcoming' | 'all' | 'past'>('upcoming');
  const [form, setForm] = useState({
    name: '', venue: '', description: '',
    start_datetime: '', end_datetime: '',
    capacity: '100', member_price: '0', non_member_price: '0',
  });

  const reload = () => {
    setLoading(true);
    Promise.all([
      api.get<FullEvent[]>(`/events?scope=${scope}`),
      api.get<{ items: Ticket[] }>('/tickets/me?page_size=50'),
    ])
      .then(([evs, tix]) => {
        setEvents(evs);
        setMyTickets(tix.items ?? []);
      })
      .catch(e => notify(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { reload(); }, [scope, refreshKey]);

  const handleBuy = (ev: FullEvent) => {
    const price = ev.your_price;
    const doPurchase = async () => {
      try {
        await api.post('/tickets/buy', {
          event_id: ev.id,
          quantity: 1,
          payment_method: 'CARD',
          buyer_name: me ? `${me.first_name} ${me.last_name}` : 'Guest',
          buyer_email: me?.email,
        });
        notify('Ticket booked!');
        bump();
        reload();
      } catch (e: unknown) {
        notify(e instanceof Error ? e.message : 'Booking failed');
      }
    };
    if (price === 0) {
      doPurchase();
    } else {
      startPay({ title: `Ticket – ${ev.name}`, amount: price, onSuccess: doPurchase });
    }
  };

  const handleCreate = async () => {
    if (!form.name.trim() || !form.start_datetime || !form.venue.trim()) {
      return notify('Please fill name, start time, and venue.');
    }
    const end = form.end_datetime || (() => {
      const d = new Date(form.start_datetime);
      d.setHours(d.getHours() + 3);
      return d.toISOString().slice(0, 16);
    })();
    try {
      await api.post('/events', {
        name: form.name,
        venue: form.venue,
        description: form.description,
        start_datetime: form.start_datetime,
        end_datetime: end,
        capacity: parseInt(form.capacity) || 50,
        member_price: parseFloat(form.member_price) || 0,
        non_member_price: parseFloat(form.non_member_price) || 0,
      });
      notify('Event created (as draft). Publish it to make it visible.');
      setShowCreate(false);
      setForm({ name: '', venue: '', description: '', start_datetime: '', end_datetime: '', capacity: '100', member_price: '0', non_member_price: '0' });
      reload();
    } catch (e: unknown) {
      notify(e instanceof Error ? e.message : 'Failed to create event');
    }
  };

  const handlePublish = async (evId: string) => {
    try {
      await api.post(`/events/${evId}/publish`);
      notify('Event published!');
      reload();
    } catch (e: unknown) {
      notify(e instanceof Error ? e.message : 'Failed to publish');
    }
  };

  const repEvent = repId ? events.find(e => e.id === repId) : null;

  return (<>
    <Head title="Events & Tickets" sub="Member prices apply automatically while your membership is active.">
      {isStaff && <button className="pri" onClick={() => setShowCreate(!showCreate)}>+ New event</button>}
    </Head>

    {/* Scope tabs */}
    <div className="tabs" style={{ marginBottom: 16 }}>
      {(['upcoming', 'all', 'past'] as const).map(s => (
        <button key={s} className={scope === s ? 'sm on' : 'sm'} onClick={() => setScope(s)}>
          {s.charAt(0).toUpperCase() + s.slice(1)}
        </button>
      ))}
    </div>

    {/* Create event form */}
    {showCreate && isStaff && (
      <div className="card" style={{ marginBottom: 18 }}>
        <h2>Create event</h2>
        <div className="grid g2">
          <div><label>Name</label><input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
          <div><label>Venue</label><input value={form.venue} onChange={e => setForm(f => ({ ...f, venue: e.target.value }))} /></div>
          <div><label>Start date & time</label><input type="datetime-local" value={form.start_datetime} onChange={e => setForm(f => ({ ...f, start_datetime: e.target.value }))} /></div>
          <div><label>End date & time</label><input type="datetime-local" value={form.end_datetime} onChange={e => setForm(f => ({ ...f, end_datetime: e.target.value }))} /></div>
          <div><label>Capacity</label><input type="number" value={form.capacity} onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))} /></div>
          <div><label>Member price ($)</label><input type="number" value={form.member_price} onChange={e => setForm(f => ({ ...f, member_price: e.target.value }))} /></div>
          <div><label>Public price ($)</label><input type="number" value={form.non_member_price} onChange={e => setForm(f => ({ ...f, non_member_price: e.target.value }))} /></div>
        </div>
        <label>Description</label>
        <textarea rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
        <button className="pri mt" onClick={handleCreate}>Create event</button>
      </div>
    )}

    {/* My tickets */}
    {myTickets.length > 0 && (
      <>
        <h2 style={{ marginBottom: 12 }}>My tickets</h2>
        <div className="grid g2" style={{ marginBottom: 22 }}>
          {myTickets.map(t => (
            <div key={t.id} className="ticket">
              <QR text={t.code} />
              <div>
                <b>{t.event_name}</b>
                <div className="sans" style={{ fontSize: 13 }}>{t.holder_name}</div>
                <div className="sans mut" style={{ fontSize: 13 }}>Code {t.code}</div>
                <span className={'badge ' + (t.status === 'CHECKED_IN' ? 'b-ok' : '')}>
                  {t.status === 'CHECKED_IN' ? 'Checked in' : 'Valid'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </>
    )}

    {/* Events list */}
    {loading ? (
      <div className="mut sans">Loading…</div>
    ) : events.length === 0 ? (
      <div className="mut sans">No events found.</div>
    ) : (
      <div className="grid g2">
        {events.map(ev => {
          const isPast = new Date(ev.end_datetime) < new Date();
          const hasTicket = myTickets.some(t => t.event_id === ev.id);
          const soldOut = ev.seats_left <= 0;

          return (
            <div key={ev.id} className="card">
              <div className="row sp">
                <h2>{ev.name}</h2>
                <span className={'badge ' + (ev.status === 'PUBLISHED' ? '' : 'b-warn')}>
                  {isPast ? 'Past' : ev.status}
                </span>
              </div>
              <div className="mut sans" style={{ fontSize: 13 }}>{fdate(ev.start_datetime)} · {ev.venue}</div>
              {ev.description && <p style={{ margin: '8px 0' }}>{ev.description}</p>}
              <div className="sans" style={{ fontSize: 14 }}>
                Member <b>{money(typeof ev.member_price === 'number' ? ev.member_price : parseFloat(ev.member_price as unknown as string))}</b>
                {' '}· Public <b>{money(typeof ev.non_member_price === 'number' ? ev.non_member_price : parseFloat(ev.non_member_price as unknown as string))}</b>
                {ev.your_price !== undefined && (
                  <span className="badge" style={{ marginLeft: 8 }}>Your price: {money(ev.your_price)}</span>
                )}
              </div>
              <div className="bar mt">
                <i style={{ width: (ev.seats_taken / ev.capacity * 100) + '%' }} />
              </div>
              <div className="mut sans" style={{ fontSize: 12, margin: '4px 0 12px' }}>
                {ev.seats_left} of {ev.capacity} seats left
              </div>

              <div className="row" style={{ flexWrap: 'wrap' }}>
                {!isPast && !hasTicket && !soldOut && ev.status === 'PUBLISHED' && (
                  <button className="pri" onClick={() => handleBuy(ev)}>
                    {ev.your_price === 0 ? 'Get free ticket' : `Buy · ${money(ev.your_price)}`}
                  </button>
                )}
                {hasTicket && <span className="badge b-ok">You have a ticket</span>}
                {!isPast && soldOut && !hasTicket && <span className="badge b-bad">Sold out</span>}
                {isStaff && ev.status === 'DRAFT' && (
                  <button className="sm" onClick={() => handlePublish(ev.id)}>Publish</button>
                )}
                {isStaff && (
                  <button className="sm" onClick={() => setRepId(repId === ev.id ? null : ev.id)}>Report</button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    )}

    {/* Event report */}
    {repEvent && repEvent.stats && (
      <div className="card mt">
        <h2>{repEvent.name} — report</h2>
        <div className="grid g4 mt">
          <Stat l="Tickets sold" v={repEvent.stats.sold} />
          <Stat l="Checked in" v={repEvent.stats.checked_in} />
          <Stat l="No-show" v={(repEvent.stats.sold ?? 0) - (repEvent.stats.checked_in ?? 0)} />
          <Stat l="Revenue" v={money(repEvent.stats.revenue ?? 0)} />
        </div>
      </div>
    )}
  </>);
}
