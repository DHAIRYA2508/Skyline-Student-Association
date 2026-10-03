import { useApp, money, fdate } from '../store/store';
import { Head } from '../store/ui';

export function Membership() {
  const { db, me, myMembership, isActiveMember, startPay, buyMembership } = useApp();
  const active = isActiveMember(me!.id);
  return (<>
    <Head title="My Membership" sub="Pick a plan for member prices on tickets and merchandise. Memberships run for one year." />
    {myMembership && <div className="card" style={{ marginBottom: 18 }}>
      <div className="row sp"><div><h2>{db.plans.find(p => p.id === myMembership.planId)!.name} plan</h2><div className="mut sans">{fdate(myMembership.start)} → {fdate(myMembership.end)}</div></div>
      <span className={'badge ' + (active ? 'b-ok' : 'b-bad')}>{active ? 'Active · dues paid' : 'Expired'}</span></div></div>}
    <div className="grid g2">{db.plans.map(p => (
      <div key={p.id} className="card"><h2>{p.name}</h2><div style={{ fontSize: 30, margin: '8px 0' }}>{money(p.price)}<span className="mut sans" style={{ fontSize: 13 }}> / year</span></div>
        <ul className="sans" style={{ paddingLeft: 18 }}>{p.perks.map(x => <li key={x}>{x}</li>)}</ul>
        <button className="pri" onClick={() => startPay({ title: `${p.name} membership – 1 year`, amount: p.price, onSuccess: () => buyMembership(p.id) })}>{myMembership ? (active ? 'Renew / switch' : 'Renew') : 'Join'} for {money(p.price)}</button></div>))}</div>
  </>);
}
