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
    merchandise_discount_percentage?: number;
    event_discount_percentage?: number;
    benefits?: string[];
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
  const [search, setSearch] = useState('');

  // Admin plan creation form state
  const [showAddPlan, setShowAddPlan] = useState(false);
  const [np, setNp] = useState({
    name: '',
    description: '',
    price: '20',
    duration_months: '12',
    event_discount_percentage: '15',
    merchandise_discount_percentage: '10',
    benefits: 'Member ticket discounts, 10% off merchandise, Vote at AGM',
  });
  const [savingPlan, setSavingPlan] = useState(false);

  const isStaff = me?.is_staff ?? false;

  const reload = () => {
    setLoading(true);
    Promise.all([
      api.get<MembershipPlan[]>('/memberships/plans'),
      !isStaff && me?.member_id ? api.get<MyMembershipData>('/memberships/me') : Promise.resolve(null),
    ])
      .then(([ps, md]) => {
        setPlans(Array.isArray(ps) ? ps : []);
        setMyData(md);
      })
      .catch(e => notify(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { reload(); }, [me?.member_id, isStaff]);

  const summary = myData?.summary;
  const active = summary?.is_active ?? false;

  const handleJoin = (plan: MembershipPlan) => {
    if (isStaff) return; // Admins are sole owners and do not purchase memberships
    const price = typeof plan.price === 'number' ? plan.price : parseFloat(plan.price as unknown as string);
    startPay({
      title: `${plan.name} Membership`,
      amount: price,
      onSuccess: async () => {
        try {
          await api.post('/memberships/join', { plan_id: plan.id, payment_method: 'CARD' });
          notify('Membership activated successfully!');
          bump();
          reload();
        } catch (e: unknown) {
          notify(e instanceof Error ? e.message : 'Failed to activate membership');
        }
      },
    });
  };

  const handleCreatePlan = async () => {
    if (!np.name.trim()) return notify('Plan name is required');
    try {
      setSavingPlan(true);
      const perks = np.benefits.split(',').map(b => b.trim()).filter(Boolean);
      await api.post('/memberships/plans', {
        name: np.name.trim(),
        description: np.description.trim() || 'Club membership tier',
        price: +np.price || 0,
        duration_months: +np.duration_months || 12,
        event_discount_percentage: +np.event_discount_percentage || 0,
        merchandise_discount_percentage: +np.merchandise_discount_percentage || 0,
        benefits: perks,
        is_active: true,
      });
      notify('New membership plan created!');
      setNp({
        name: '',
        description: '',
        price: '20',
        duration_months: '12',
        event_discount_percentage: '15',
        merchandise_discount_percentage: '10',
        benefits: 'Member ticket discounts, 10% off merchandise, Vote at AGM',
      });
      setShowAddPlan(false);
      reload();
      bump();
    } catch (e: any) {
      notify(e.message || 'Failed to create plan');
    } finally {
      setSavingPlan(false);
    }
  };

  const filteredPlans = plans.filter(p => {
    const q = search.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      (p.description || '').toLowerCase().includes(q) ||
      (p.benefits || []).some(b => b.toLowerCase().includes(q))
    );
  });

  if (loading) {
    return (
      <>
        <Head title={isStaff ? 'Membership Plans' : 'My Membership'} />
        <div className="card mut sans">Loading membership details…</div>
      </>
    );
  }

  return (
    <>
      <Head
        title={isStaff ? 'Membership Plans & Tiers' : 'My Membership'}
        sub={
          isStaff
            ? 'Administrator View — Manage club tiers, discounts, perks, and dues structure.'
            : 'Unlock exclusive member pricing on events and merchandise, voting rights, and more.'
        }
      />

      {/* Admin Information Card */}
      {isStaff && (
        <div className="card" style={{ marginBottom: 18, borderLeft: '4px solid var(--pri)' }}>
          <div className="row sp">
            <div>
              <h2>Organization Owner / Administrator</h2>
              <p className="mut" style={{ margin: '4px 0 0' }}>
                You have full administrative control over all membership tiers, discounts, and dues collection.
              </p>
            </div>
            <button className="pri" onClick={() => setShowAddPlan(!showAddPlan)}>
              {showAddPlan ? 'Close Form' : '+ Add New Plan Tier'}
            </button>
          </div>
        </div>
      )}

      {/* Admin Add Plan Form */}
      {isStaff && showAddPlan && (
        <div className="card" style={{ marginBottom: 18 }}>
          <h2>Create New Membership Plan</h2>
          <div className="row mt" style={{ gap: 12, flexWrap: 'wrap' }}>
            <div style={{ flex: 2, minWidth: 200 }}>
              <label>Plan Name</label>
              <input
                value={np.name}
                onChange={e => setNp({ ...np, name: e.target.value })}
                placeholder="e.g. Platinum Annual, VIP Student"
              />
            </div>
            <div style={{ flex: 1, minWidth: 120 }}>
              <label>Price (₹)</label>
              <input
                type="number"
                value={np.price}
                onChange={e => setNp({ ...np, price: e.target.value })}
              />
            </div>
            <div style={{ flex: 1, minWidth: 120 }}>
              <label>Duration (Months)</label>
              <input
                type="number"
                value={np.duration_months}
                onChange={e => setNp({ ...np, duration_months: e.target.value })}
              />
            </div>
          </div>

          <div className="row mt" style={{ gap: 12, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 140 }}>
              <label>Event Discount (%)</label>
              <input
                type="number"
                min={0}
                max={100}
                value={np.event_discount_percentage}
                onChange={e => setNp({ ...np, event_discount_percentage: e.target.value })}
              />
            </div>
            <div style={{ flex: 1, minWidth: 140 }}>
              <label>Merchandise Discount (%)</label>
              <input
                type="number"
                min={0}
                max={100}
                value={np.merchandise_discount_percentage}
                onChange={e => setNp({ ...np, merchandise_discount_percentage: e.target.value })}
              />
            </div>
            <div style={{ flex: 2, minWidth: 200 }}>
              <label>Description</label>
              <input
                value={np.description}
                onChange={e => setNp({ ...np, description: e.target.value })}
                placeholder="Short summary of this tier"
              />
            </div>
          </div>

          <label className="mt">Perks & Benefits (comma separated)</label>
          <input
            value={np.benefits}
            onChange={e => setNp({ ...np, benefits: e.target.value })}
            placeholder="Priority seating, Free tote bag, Voting rights"
          />

          <button className="pri mt" disabled={savingPlan} onClick={handleCreatePlan}>
            {savingPlan ? 'Saving Plan…' : 'Save & Publish Plan'}
          </button>
        </div>
      )}

      {/* Member Active Card (Non-Admin users only) */}
      {!isStaff && summary && summary.plan_name && (
        <div className="card" style={{ marginBottom: 18 }}>
          <div className="row sp">
            <div>
              <h2>{summary.plan_name} Plan</h2>
              <div className="mut sans" style={{ fontSize: 13 }}>
                Valid: {fdate(summary.start_date)} → {fdate(summary.end_date)}
              </div>
            </div>
            <span className={'badge ' + (active ? 'b-ok' : 'b-bad')}>
              {active ? 'Active · Dues Paid' : 'Expired'}
            </span>
          </div>

          <div className="row mt" style={{ gap: 16, flexWrap: 'wrap' }}>
            <div className="mut sans" style={{ fontSize: 13 }}>
              🎟️ Event Discount: <b>{summary.event_discount_percentage ?? summary.event_discount ?? 0}% off</b>
            </div>
            <div className="mut sans" style={{ fontSize: 13 }}>
              🛍️ Merch Discount: <b>{summary.merchandise_discount_percentage ?? summary.merch_discount ?? 0}% off</b>
            </div>
          </div>

          {active && summary.days_until_expiry !== undefined && summary.days_until_expiry <= 60 && (
            <div className="banner" style={{ marginTop: 12 }}>
              Your membership expires in {summary.days_until_expiry} day(s). Renew below to preserve discounts.
            </div>
          )}
        </div>
      )}

      {/* Search Bar for Plans */}
      <div className="row sp" style={{ marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
        <input
          type="search"
          placeholder="Search membership plans, perks, discounts…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ maxWidth: 360 }}
        />
        <div className="mut sans" style={{ fontSize: 13, alignSelf: 'center' }}>
          Showing {filteredPlans.length} plan(s)
        </div>
      </div>

      {/* Plans List Grid */}
      <div className="grid g2">
        {filteredPlans.length === 0 ? (
          <div className="card mut sans">No membership plans match your search.</div>
        ) : (
          filteredPlans.map(p => {
            const price = typeof p.price === 'number' ? p.price : parseFloat(p.price as unknown as string);
            const isMyCurrent = summary?.plan_id === p.id && active;

            return (
              <div key={p.id} className="card" style={{ border: isMyCurrent ? '2px solid var(--pri)' : undefined }}>
                <div className="row sp">
                  <h2>{p.name}</h2>
                  {isMyCurrent && <span className="badge b-ok">Current Plan</span>}
                </div>

                <div style={{ fontSize: 28, margin: '8px 0', fontWeight: 600 }}>
                  {money(price)}
                  <span className="mut sans" style={{ fontSize: 13, fontWeight: 400 }}> / {p.duration_months} months</span>
                </div>

                {p.description && <p className="mut" style={{ fontSize: 13 }}>{p.description}</p>}

                <div className="row mt" style={{ gap: 8, flexWrap: 'wrap' }}>
                  <span className="badge">🎟️ {p.event_discount_percentage}% off events</span>
                  <span className="badge">🛍️ {p.merchandise_discount_percentage}% off merch</span>
                </div>

                <ul className="sans" style={{ paddingLeft: 18, marginTop: 12 }}>
                  {(p.benefits ?? []).map((b: string) => <li key={b}>{b}</li>)}
                </ul>

                {/* Non-admins see Join / Renew buttons. Admins do not have purchase options. */}
                {!isStaff && (
                  <button
                    className="pri"
                    style={{ marginTop: 16, width: '100%' }}
                    onClick={() => handleJoin(p)}
                  >
                    {isMyCurrent ? 'Renew Plan' : summary ? 'Switch to this Plan' : 'Join Plan'} · {money(price)}
                  </button>
                )}

                {isStaff && (
                  <div className="mut sans" style={{ marginTop: 14, fontSize: 12, borderTop: '1px solid #eee', paddingTop: 8 }}>
                    Active Plan Tier · Available to all students
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Membership history for students */}
      {!isStaff && myData?.history && myData.history.length > 0 && (
        <div className="card mt">
          <h2>My Membership History</h2>
          <table>
            <thead>
              <tr>
                <th>Plan</th>
                <th>From</th>
                <th>To</th>
                <th>Status</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {myData.history.map(h => (
                <tr key={h.id}>
                  <td><b>{h.plan_name}</b></td>
                  <td>{fdate(h.start_date)}</td>
                  <td>{fdate(h.end_date)}</td>
                  <td>
                    <span className={'badge ' + (h.status === 'ACTIVE' ? 'b-ok' : 'b-bad')}>
                      {h.status}
                    </span>
                  </td>
                  <td>{money(parseFloat(h.amount) || 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
