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
  seats_taken?: number;
  seats_left?: number;
  your_price?: number;
  your_price_type?: string;
  stats?: {
    sold: number;
    capacity: number;
    remaining: number;
    checked_in: number;
    no_shows: number;
    attendance_rate: number;
    revenue: number;
    member_tickets: number;
    non_member_tickets: number;
  };
}

export function Events() {
  const { me, startPay, notify, bump, refreshKey } = useApp();
  const isStaff = me?.is_staff ?? false;
  const isMemberActive = me?.membership?.is_active ?? false;

  const [events, setEvents] = useState<FullEvent[]>([]);
  const [myTickets, setMyTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [repId, setRepId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [scope, setScope] = useState<'upcoming' | 'all' | 'past'>('upcoming');

  // Search queries
  const [eventSearch, setEventSearch] = useState('');
  const [ticketSearch, setTicketSearch] = useState('');

  // Ticket purchasing state (for non-admin members)
  const [selectedQtys, setSelectedQtys] = useState<Record<string, number>>({});

  const [form, setForm] = useState({
    name: '', venue: '', description: '',
    start_datetime: '', end_datetime: '',
    capacity: '100', member_price: '0', non_member_price: '0',
  });

  const reload = () => {
    setLoading(true);
    Promise.all([
      api.get<any>(`/events?scope=${scope}`),
      !isStaff ? api.get<Ticket[]>('/tickets/mine').catch(() => [] as Ticket[]) : Promise.resolve([] as Ticket[]),
    ])
      .then(([evs, tix]) => {
        const evList = Array.isArray(evs) ? evs : (evs?.items ?? []);
        setEvents(evList);
        setMyTickets(Array.isArray(tix) ? tix : (tix as any)?.items ?? []);
      })
      .catch(e => notify(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { reload(); }, [scope, refreshKey, isStaff]);

  const handleBuy = (ev: FullEvent) => {
    if (isStaff) return; // Admins are sole owners and do not purchase tickets
    const qty = selectedQtys[ev.id] || 1;
    const capacityLeft = Math.max(0, ev.capacity - (ev.sold ?? 0));
    if (qty > capacityLeft && capacityLeft > 0) {
      return notify(`Only ${capacityLeft} ticket(s) remaining for this event`);
    }

    const regularPrice = ev.non_member_price ?? 0;
    const memberPrice = ev.member_price ?? 0;

    // Multi-ticket rule: 1st ticket gets member price (if active), remaining (qty - 1) tickets are regular price
    let totalPrice = 0;
    if (isMemberActive) {
      totalPrice = memberPrice + (qty - 1) * regularPrice;
    } else {
      totalPrice = qty * regularPrice;
    }
    totalPrice = Math.max(0, Math.round(totalPrice * 100) / 100);

    const doPurchase = async () => {
      try {
        await api.post('/tickets/purchase', {
          event_id: ev.id,
          quantity: qty,
          payment_method: 'CARD',
          buyer_name: me ? `${me.first_name} ${me.last_name}` : 'Student',
          buyer_email: me?.email,
        });
        notify(`Successfully purchased ${qty} ticket(s) for ${ev.name}!`);
        bump();
        reload();
      } catch (e: unknown) {
        notify(e instanceof Error ? e.message : 'Booking failed');
      }
    };

    if (totalPrice === 0) {
      doPurchase();
    } else {
      startPay({
        title: `${qty}× Ticket – ${ev.name}${isMemberActive ? ' (1 Member + Guests)' : ''}`,
        amount: totalPrice,
        onSuccess: doPurchase,
      });
    }
  };

  const handleCreate = async () => {
    if (!form.name.trim() || !form.start_datetime || !form.venue.trim()) {
      return notify('Please fill event name, start time, and venue.');
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
      notify('Event created and published!');
      setShowCreate(false);
      setForm({
        name: '', venue: '', description: '',
        start_datetime: '', end_datetime: '',
        capacity: '100', member_price: '0', non_member_price: '0',
      });
      bump();
      reload();
    } catch (e: unknown) {
      notify(e instanceof Error ? e.message : 'Failed to create event');
    }
  };

  const filteredEvents = events.filter(e => {
    const q = eventSearch.toLowerCase();
    return (
      e.name.toLowerCase().includes(q) ||
      (e.venue || '').toLowerCase().includes(q) ||
      (e.description || '').toLowerCase().includes(q)
    );
  });

  const filteredTickets = myTickets.filter(t => {
    const q = ticketSearch.toLowerCase();
    return (
      (t.ticket_code || (t as any).code || '').toLowerCase().includes(q) ||
      (t.event_name || '').toLowerCase().includes(q) ||
      (t.holder_name || (t as any).buyer_name || '').toLowerCase().includes(q)
    );
  });

  return (
    <>
      <Head
        title="Events & Tickets"
        sub={
          isStaff
            ? 'Administrator View — Manage campus events, capacity, live ticket sales, and admissions.'
            : 'Browse club events, purchase multiple tickets with member discounts, and present QR codes for entrance.'
        }
      >
        {isStaff && (
          <button className="pri" onClick={() => setShowCreate(!showCreate)}>
            {showCreate ? 'Close Form' : '+ Create Event'}
          </button>
        )}
      </Head>

      {/* Staff Event Creation Modal / Form */}
      {isStaff && showCreate && (
        <div className="card" style={{ marginBottom: 20 }}>
          <h2>Create New Event</h2>
          <div className="grid g2 mt">
            <div>
              <label>Event Name</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Annual Gala Dinner" />
            </div>
            <div>
              <label>Venue / Location</label>
              <input value={form.venue} onChange={e => setForm({ ...form, venue: e.target.value })} placeholder="e.g. Student Union Auditorium" />
            </div>
          </div>
          <div className="grid g2 mt">
            <div>
              <label>Start Date & Time</label>
              <input type="datetime-local" value={form.start_datetime} onChange={e => setForm({ ...form, start_datetime: e.target.value })} />
            </div>
            <div>
              <label>End Date & Time</label>
              <input type="datetime-local" value={form.end_datetime} onChange={e => setForm({ ...form, end_datetime: e.target.value })} />
            </div>
          </div>
          <div className="grid g3 mt">
            <div>
              <label>Total Capacity (Seats)</label>
              <input type="number" min={1} value={form.capacity} onChange={e => setForm({ ...form, capacity: e.target.value })} />
            </div>
            <div>
              <label>Member Price (₹)</label>
              <input type="number" min={0} value={form.member_price} onChange={e => setForm({ ...form, member_price: e.target.value })} />
            </div>
            <div>
              <label>Non-Member Price (₹)</label>
              <input type="number" min={0} value={form.non_member_price} onChange={e => setForm({ ...form, non_member_price: e.target.value })} />
            </div>
          </div>
          <label className="mt">Description</label>
          <textarea rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Details about this event..." />
          <button className="pri mt" onClick={handleCreate}>Publish Event</button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="row sp" style={{ marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
        <div className="tabs" style={{ margin: 0 }}>
          {(['upcoming', 'all', 'past'] as const).map(s => (
            <button key={s} className={'sm ' + (scope === s ? 'on' : '')} onClick={() => setScope(s)}>
              {s === 'upcoming' ? 'Upcoming' : s === 'past' ? 'Past Events' : 'All Events'}
            </button>
          ))}
        </div>
        <input
          type="search"
          placeholder="Search events by title, venue…"
          value={eventSearch}
          onChange={e => setEventSearch(e.target.value)}
          style={{ maxWidth: 320 }}
        />
      </div>

      {/* Events List */}
      {loading ? (
        <div className="card mut sans">Loading events…</div>
      ) : filteredEvents.length === 0 ? (
        <div className="card mut sans">No events found matching your filter.</div>
      ) : (
        <div className="grid g2">
          {filteredEvents.map(e => {
            const qty = selectedQtys[e.id] || 1;
            const capacityLeft = Math.max(0, e.capacity - (e.sold ?? 0));
            const isSoldOut = capacityLeft <= 0;
            const isPast = new Date(e.end_datetime || e.start_datetime) < new Date();

            const regularPrice = e.non_member_price ?? 0;
            const memberPrice = e.member_price ?? 0;

            // Multi-ticket calculation:
            // 1 member discounted ticket + (qty - 1) regular fare tickets
            let calculatedTotal = 0;
            let memberSavings = 0;
            if (isMemberActive && regularPrice > memberPrice) {
              calculatedTotal = memberPrice + (qty - 1) * regularPrice;
              memberSavings = regularPrice - memberPrice;
            } else {
              calculatedTotal = qty * regularPrice;
            }
            calculatedTotal = Math.round(calculatedTotal * 100) / 100;

            return (
              <div key={e.id} className="card">
                <div className="row sp">
                  <h2>{e.name}</h2>
                  <span className={'badge ' + (isSoldOut ? 'b-bad' : 'b-ok')}>
                    {isSoldOut ? 'Sold Out' : `${capacityLeft} seats left`}
                  </span>
                </div>

                <div className="mut sans" style={{ fontSize: 13, margin: '6px 0 10px' }}>
                  📅 {fdate(e.start_datetime)} · 📍 {e.venue || 'Skyline Campus'}
                </div>

                {e.description && <p style={{ margin: '8px 0', fontSize: 13.5 }}>{e.description}</p>}

                {/* Price Display: Organizer Info for Staff vs Attendee Purchase Price */}
                {isStaff ? (
                  <div style={{ margin: '14px 0', background: 'var(--soft)', padding: '10px 14px', borderRadius: 8 }}>
                    <div style={{ display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
                      <div>
                        <span className="mut sans" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Member Price</span>
                        <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--pri)' }}>
                          {memberPrice > 0 ? money(memberPrice) : 'Free (₹0)'}
                        </div>
                      </div>
                      <div style={{ borderLeft: '1px solid #dcd5c9', paddingLeft: 20 }}>
                        <span className="mut sans" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Regular Price</span>
                        <div style={{ fontSize: 18, fontWeight: 700 }}>
                          {regularPrice > 0 ? money(regularPrice) : 'Free (₹0)'}
                        </div>
                      </div>
                      <div style={{ borderLeft: '1px solid #dcd5c9', paddingLeft: 20 }}>
                        <span className="mut sans" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Capacity</span>
                        <div style={{ fontSize: 18, fontWeight: 700 }}>{e.capacity} seats</div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ margin: '12px 0' }}>
                    <div style={{ fontSize: 24, fontWeight: 600 }}>
                      {money(isMemberActive ? memberPrice : regularPrice)}
                      <span className="mut sans" style={{ fontSize: 13, fontWeight: 400 }}> / ticket</span>
                      {isMemberActive && regularPrice > memberPrice && (
                        <s className="mut sans" style={{ fontSize: 14, marginLeft: 8 }}>{money(regularPrice)}</s>
                      )}
                    </div>

                    {isMemberActive && regularPrice > memberPrice && (
                      <div className="badge b-ok" style={{ marginTop: 6, display: 'inline-block' }}>
                        ✓ Active Member: 1st ticket @ {money(memberPrice)} + Extra tickets @ {money(regularPrice)}
                      </div>
                    )}
                    {!isMemberActive && regularPrice > memberPrice && (
                      <div className="mut sans" style={{ fontSize: 12, marginTop: 4 }}>
                        💡 Active members pay only {money(memberPrice)} for their ticket!
                      </div>
                    )}
                  </div>
                )}

                {/* Custom Ticket Quantity Selection & Purchase (Non-Admin Users Only) */}
                {!isStaff && !isPast && !isSoldOut && (
                  <div style={{ background: 'var(--soft)', padding: '10px 14px', borderRadius: 8, marginTop: 12 }}>
                    <label style={{ fontSize: 12, fontWeight: 600 }}>Select Number of Tickets</label>
                    <div className="row" style={{ alignItems: 'center', gap: 10, marginTop: 4 }}>
                      <button
                        className="sm"
                        style={{ width: 32, height: 32, padding: 0 }}
                        disabled={qty <= 1}
                        onClick={() => setSelectedQtys({ ...selectedQtys, [e.id]: Math.max(1, qty - 1) })}
                      >
                        −
                      </button>
                      <input
                        type="number"
                        min={1}
                        max={Math.min(10, capacityLeft)}
                        value={qty}
                        onChange={ev => {
                          const val = Math.max(1, Math.min(10, +ev.target.value || 1));
                          setSelectedQtys({ ...selectedQtys, [e.id]: val });
                        }}
                        style={{ width: 64, textAlign: 'center', fontWeight: 'bold' }}
                      />
                      <button
                        className="sm"
                        style={{ width: 32, height: 32, padding: 0 }}
                        disabled={qty >= Math.min(10, capacityLeft)}
                        onClick={() => setSelectedQtys({ ...selectedQtys, [e.id]: Math.min(10, Math.min(capacityLeft, qty + 1)) })}
                      >
                        +
                      </button>
                      <span className="mut sans" style={{ fontSize: 13 }}>
                        Total: <b>{money(calculatedTotal)}</b>
                        {memberSavings > 0 && (
                          <span style={{ color: 'var(--ok)', marginLeft: 6 }}>
                            (Saved {money(memberSavings)})
                          </span>
                        )}
                      </span>
                    </div>

                    {qty > 1 && isMemberActive && (
                      <div className="mut sans" style={{ fontSize: 11.5, marginTop: 6 }}>
                        Breakdown: 1 Member Ticket @ {money(memberPrice)} + {qty - 1} Guest Ticket(s) @ {money(regularPrice)}
                      </div>
                    )}

                    <button
                      className="pri mt"
                      style={{ width: '100%', marginTop: 12 }}
                      onClick={() => handleBuy(e)}
                    >
                      Get {qty} Ticket{qty > 1 ? 's' : ''} · {money(calculatedTotal)}
                    </button>
                  </div>
                )}

                {/* Staff Organizer Live Report Box */}
                {isStaff && (
                  <div style={{ marginTop: 12 }}>
                    <div className="row sp sans" style={{ fontSize: 13, borderTop: '1px solid #eee', paddingTop: 10 }}>
                      <span>Live Bookings: <b>{e.sold ?? 0}/{e.capacity}</b> seats ({Math.round(((e.sold ?? 0) / (e.capacity || 1)) * 100)}%)</span>
                      <button className="sm" onClick={() => setRepId(repId === e.id ? null : e.id)}>
                        {repId === e.id ? 'Hide Report' : 'View Report'}
                      </button>
                    </div>

                    {repId === e.id && (
                      <div style={{ marginTop: 10, background: 'var(--soft)', padding: 14, borderRadius: 8 }}>
                        <div className="grid g3">
                          <Stat l="Tickets Sold" v={`${e.sold ?? 0} / ${e.capacity}`} />
                          <Stat l="Checked In" v={`${e.checked_in ?? 0} (${e.sold ? Math.round(((e.checked_in ?? 0) / e.sold) * 100) : 0}%)`} />
                          <Stat l="Total Revenue" v={money(e.revenue ?? 0)} />
                        </div>
                        {e.stats && (
                          <div className="row sp mut sans" style={{ fontSize: 12, marginTop: 10, borderTop: '1px solid #e0d8cc', paddingTop: 8 }}>
                            <span>Member Tickets: <b>{e.stats.member_tickets ?? 0}</b></span>
                            <span>Guest Tickets: <b>{e.stats.non_member_tickets ?? 0}</b></span>
                            <span>Remaining: <b>{e.stats.remaining ?? 0}</b> seats</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* My Tickets Section (Students / Members Only) */}
      {!isStaff && (
        <div className="card mt">
          <div className="row sp" style={{ flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
            <h2>My Purchased Tickets ({myTickets.length})</h2>
            <input
              type="search"
              placeholder="Search tickets by code or event…"
              value={ticketSearch}
              onChange={e => setTicketSearch(e.target.value)}
              style={{ maxWidth: 280 }}
            />
          </div>

          {filteredTickets.length === 0 ? (
            <div className="mut sans" style={{ padding: '10px 0' }}>
              {myTickets.length === 0 ? 'You haven’t purchased any tickets yet.' : 'No tickets match your search.'}
            </div>
          ) : (
            <div className="grid g2">
              {filteredTickets.map(t => {
                const code = t.ticket_code || (t as any).code || 'TKT';
                const qrData = (t as any).qr_token || code;
                const isUsed = t.status === 'CHECKED_IN' || !!t.checked_in_at;

                return (
                  <div
                    key={t.id}
                    style={{
                      display: 'flex',
                      gap: 14,
                      alignItems: 'center',
                      border: '1px solid #e2d9cc',
                      borderRadius: 10,
                      padding: 12,
                      background: isUsed ? '#fafafa' : '#fff',
                    }}
                  >
                    <div style={{ flexShrink: 0 }}>
                      <QR text={qrData} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 16 }}>{t.event_name}</div>
                      <div className="mut sans" style={{ fontSize: 12, margin: '2px 0' }}>
                        Attendee: {t.holder_name || (t as any).buyer_name || 'Member'}
                      </div>
                      <div style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 14, color: 'var(--pri)' }}>
                        {code}
                      </div>
                      <div style={{ marginTop: 6 }}>
                        <span className={'badge ' + (isUsed ? 'b-warn' : 'b-ok')}>
                          {isUsed ? '✓ Checked In (Used)' : 'Valid · Ready for Entry'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </>
  );
}
