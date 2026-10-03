import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { useApp, money, fdate } from '../store/store';
import type { EventT } from '../store/store';
import { Head, Stat } from '../store/ui';

function QR({ text }: { text: string }) {
  const [src, setSrc] = useState('');
  useEffect(() => { QRCode.toDataURL(text, { width: 110, margin: 1, color: { dark: '#3a2f22', light: '#fbf7ef' } }).then(setSrc).catch(() => setSrc('')); }, [text]);
  return src ? <img src={src} width={90} height={90} alt="ticket qr" /> : <div style={{ width: 90 }} />;
}

export function Events() {
  const { db, me, startPay, buyTicket, ticketPrice, createEvent, notify } = useApp();
  const admin = me!.role === 'admin';
  const [show, setShow] = useState(false);
  const [f, setF] = useState({ name: '', date: '', venue: '', desc: '', capacity: '100', memberPrice: '300', publicPrice: '500' });
  const [rep, setRep] = useState<string | null>(null);
  const mine = db.tickets.filter(t => t.userId === me!.id);
  const left = (e: EventT) => e.capacity - db.tickets.filter(t => t.eventId === e.id).length;
  const make = () => {
    if (!f.name.trim() || !f.date || !f.venue.trim()) return notify('Please fill name, date and venue');
    createEvent({ name: f.name, date: f.date, venue: f.venue, desc: f.desc, capacity: +f.capacity || 50, memberPrice: +f.memberPrice || 0, publicPrice: +f.publicPrice || 0 });
    setShow(false); notify('Event published'); setF({ ...f, name: '', date: '', venue: '', desc: '' });
  };
  const set = (k: string, v: string) => setF({ ...f, [k]: v });
  const r = rep ? db.events.find(e => e.id === rep)! : null;
  const rt = r ? db.tickets.filter(t => t.eventId === r.id) : [];
  return (<>
    <Head title="Events & Tickets" sub="Member prices apply automatically while your membership is active.">{admin && <button className="pri" onClick={() => setShow(!show)}>+ New event</button>}</Head>
    {show && <div className="card" style={{ marginBottom: 18 }}><h2>Create event</h2><div className="grid g2">
      <div><label>Name</label><input value={f.name} onChange={e => set('name', e.target.value)} /></div>
      <div><label>Date & time</label><input type="datetime-local" value={f.date} onChange={e => set('date', e.target.value)} /></div>
      <div><label>Venue</label><input value={f.venue} onChange={e => set('venue', e.target.value)} /></div>
      <div><label>Seats</label><input type="number" value={f.capacity} onChange={e => set('capacity', e.target.value)} /></div>
      <div><label>Member price (₹)</label><input type="number" value={f.memberPrice} onChange={e => set('memberPrice', e.target.value)} /></div>
      <div><label>Public price (₹)</label><input type="number" value={f.publicPrice} onChange={e => set('publicPrice', e.target.value)} /></div></div>
      <label>Description</label><textarea rows={2} value={f.desc} onChange={e => set('desc', e.target.value)} /><button className="pri mt" onClick={make}>Publish event</button></div>}
    {mine.length > 0 && <><h2>My tickets</h2><div className="grid g2 mt" style={{ marginBottom: 22 }}>{mine.map(t => <div key={t.id} className="ticket"><QR text={t.code} /><div><b>{db.events.find(e => e.id === t.eventId)?.name}</b><div className="sans" style={{ fontSize: 13 }}>{t.holder}</div><div className="sans mut" style={{ fontSize: 13 }}>Code {t.code}</div><span className={'badge ' + (t.checkedIn ? 'b-ok' : '')}>{t.checkedIn ? 'Checked in' : 'Valid'}</span></div></div>)}</div></>}
    <div className="grid g2">{db.events.map(e => { const sold = db.tickets.filter(t => t.eventId === e.id).length; const price = ticketPrice(e, me!.id); const past = new Date(e.date) < new Date(); const owned = mine.some(t => t.eventId === e.id);
      return <div key={e.id} className="card"><div className="row sp"><h2>{e.name}</h2>{past && <span className="badge">Past</span>}</div>
        <div className="mut sans" style={{ fontSize: 13 }}>{fdate(e.date)} · {e.venue}</div><p>{e.desc}</p>
        <div className="sans" style={{ fontSize: 14 }}>Member <b>{e.memberPrice ? money(e.memberPrice) : 'Free'}</b> · Public <b>{money(e.publicPrice)}</b></div>
        <div className="bar mt"><i style={{ width: (sold / e.capacity * 100) + '%' }} /></div><div className="mut sans" style={{ fontSize: 12, margin: '4px 0 12px' }}>{left(e)} of {e.capacity} seats left</div>
        <div className="row">
          {!past && left(e) > 0 && !owned && <button className="pri" onClick={() => price === 0 ? (buyTicket(e.id), notify('Free ticket booked')) : startPay({ title: `Ticket – ${e.name}`, amount: price, onSuccess: () => buyTicket(e.id) })}>{price === 0 ? 'Get free ticket' : `Buy ticket ${money(price)}`}</button>}
          {owned && <span className="badge b-ok">You have a ticket</span>}{!past && left(e) <= 0 && <span className="badge b-bad">Sold out</span>}
          {admin && <button onClick={() => setRep(rep === e.id ? null : e.id)}>Report</button>}</div></div>; })}</div>
    {r && <div className="card mt"><h2>{r.name} — report</h2><div className="grid g4 mt"><Stat l="Tickets sold" v={rt.length} /><Stat l="Attended" v={rt.filter(t => t.checkedIn).length} /><Stat l="No-show" v={rt.filter(t => !t.checkedIn).length} /><Stat l="Revenue" v={money(rt.reduce((s, t) => s + t.price, 0))} /></div></div>}
  </>);
}
