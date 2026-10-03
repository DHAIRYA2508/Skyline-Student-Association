import { useEffect, useState } from 'react';
import { useApp, money, fdate } from '../store/store';
import { Head } from '../store/ui';
import { api } from '../services/api';
import type { MembershipPlan } from '../services/api';

interface MyMembershipData {
  summary: {
    state: string;
    is_active: boolean;
    plan_name?: string;
    plan_id?: string;
    start_date?: string;
    end_date?: string;
    days_until_expiry?: number;
    merch_discount?: number;
    event_discount?: number;
  };
  history: {
    id: string;
    plan_name: string;
    start_date: string;
    end_date: string;
    status: string;
    payment_status: string;
    amount: string;
  }[];
}

export function Membership() {
  const { me, startPay, notify, bump } = useApp();
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [myData, setMyData] = useState<MyMembershipData | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = () => {
    setLoading(true);
    Promise.all([
      api.get<MembershipPlan[]>('/memberships/plans'),
      me?.member_id ? api.get<MyMembershipData>('/memberships/me') : Promise.resolve(null),
    ])
      .then(([ps, md]) => {
        setPlans(ps);
        setMyData(md);
      })
      .catch(e => notify(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { reload(); }, [me?.member_id]);

  const summary = myData?.summary;
  const active = summary?.is_active ?? false;

  const handleJoin = (plan: MembershipPlan) => {
    startPay({
      title: `${plan.name} membership`,
      amount: typeof plan.price === 'number' ? plan.price : parseFloat(plan.price as unknown as string),
      onSuccess: async () => {
        try {
          await api.post('/memberships/join', { plan_id: plan.id, payment_method: 'CARD' });
          notify('Membership activated!');
          bump();
          reload();
        } catch (e: unknown) {
          notify(e instanceof Error ? e.message : 'Failed to activate membership');
        }
      },
    });
  };

  if (loading) return <><Head title="My Membership" /><div className="mut sans">Loading…</div></>;

  return (<>
    <Head title="My Membership" sub="Pick a plan for member prices on tickets and merchandise." />

    {/* Current membership */}
    {summary && summary.plan_name && (
      <div className="card" style={{ marginBottom: 18 }}>
        <div className="row sp">
          <div>
            <h2>{summary.plan_name} plan</h2>
            <div className="mut sans">{fdate(summary.start_date)} → {fdate(summary.end_date)}</div>
          </div>
          <span className={'badge ' + (active ? 'b-ok' : 'b-bad')}>{active ? 'Active · dues paid' : 'Expired'}</span>
        </div>
        {active && summary.days_until_expiry !== undefined && summary.days_until_expiry <= 60 && (
          <div className="banner" style={{ marginTop: 10 }}>Expires in {summary.days_until_expiry} days.</div>
        )}
      </div>
    )}

    {/* Plans */}
    <div className="grid g2">
      {plans.map(p => {
        const price = typeof p.price === 'number' ? p.price : parseFloat(p.price as unknown as string);
        return (
          <div key={p.id} className="card">
            <h2>{p.name}</h2>
            <div style={{ fontSize: 30, margin: '8px 0' }}>
              {money(price)}<span className="mut sans" style={{ fontSize: 13 }}> / {p.duration_months} months</span>
            </div>
            {p.description && <p className="mut" style={{ fontSize: 13 }}>{p.description}</p>}
            <ul className="sans" style={{ paddingLeft: 18, marginTop: 8 }}>
              {(p.benefits ?? []).map((b: string) => <li key={b}>{b}</li>)}
            </ul>
            <button
              className="pri"
              style={{ marginTop: 14, width: '100%' }}
              onClick={() => handleJoin(p)}
            >
              {summary?.plan_id === p.id && active ? 'Renew' : summary ? 'Switch plan' : 'Join'} · {money(price)}
            </button>
          </div>
        );
      })}
    </div>

    {/* Membership history */}
    {myData?.history && myData.history.length > 0 && (
      <div className="card mt">
        <h2>Membership history</h2>
        <table><thead><tr><th>Plan</th><th>From</th><th>To</th><th>Status</th><th>Paid</th></tr></thead>
          <tbody>
            {myData.history.map(h => (
              <tr key={h.id}>
                <td>{h.plan_name}</td>
                <td>{fdate(h.start_date)}</td>
                <td>{fdate(h.end_date)}</td>
                <td><span className={'badge ' + (h.status === 'ACTIVE' ? 'b-ok' : 'b-bad')}>{h.status}</span></td>
                <td>{h.amount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </>);
}
