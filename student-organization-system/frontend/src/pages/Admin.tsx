import { useEffect, useState } from 'react';
import { useApp, money, fdate } from '../store/store';
import { Head, Stat } from '../store/ui';
import { api } from '../services/api';
import type { Expense, Member, Transaction, FinanceSummary, MembershipPlan } from '../services/api';

export function Expenses() {
  const { me, notify, refreshKey, bump } = useApp();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [f, setF] = useState({
    title: '',
    category: 'SUPPLIES',
    amount: '',
    date: new Date().toISOString().split('T')[0],
  });
  const [submitting, setSubmitting] = useState(false);

  const canApprove = me?.permissions.includes('expenses.approve') ?? false;
  const canReimburse = me?.permissions.includes('reimbursements.process') ?? false;

  useEffect(() => {
    setLoading(true);
    api.get<Expense[]>('/expenses')
      .then(res => setExpenses(Array.isArray(res) ? res : []))
      .catch(err => notify(err.message))
      .finally(() => setLoading(false));
  }, [refreshKey, notify]);

  const handleSubmit = async () => {
    if (!f.title.trim() || !(+f.amount > 0)) {
      return notify('Please enter a description and a valid amount');
    }
    try {
      setSubmitting(true);
      await api.post('/expenses', {
        category: f.category,
        description: f.title.trim(),
        amount: +f.amount,
        expense_date: f.date,
        receipts: [],
      });
      setF({ title: '', category: 'SUPPLIES', amount: '', date: new Date().toISOString().split('T')[0] });
      notify('Expense submitted for review');
      bump();
    } catch (e: any) {
      notify(e.message || 'Failed to submit expense');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReview = async (id: string, action: 'APPROVE' | 'REJECT') => {
    try {
      await api.post(`/expenses/${id}/review`, { action });
      notify(`Expense ${action === 'APPROVE' ? 'approved' : 'rejected'}`);
      bump();
    } catch (e: any) {
      notify(e.message || 'Review action failed');
    }
  };

  const handleReimburse = async (id: string) => {
    try {
      await api.post(`/expenses/${id}/reimburse`, {
        payment_method: 'BANK_TRANSFER',
        payment_reference: `BT-${Date.now().toString().slice(-6)}`,
      });
      notify('Expense marked reimbursed and posted to ledger');
      bump();
    } catch (e: any) {
      notify(e.message || 'Reimbursement failed');
    }
  };

  const badgeClass = (s: string) => {
    switch (s) {
      case 'REIMBURSED': return 'b-ok';
      case 'APPROVED': return 'b-ok';
      case 'REJECTED': return 'b-bad';
      case 'SUBMITTED':
      case 'PENDING': return 'b-warn';
      default: return '';
    }
  };

  const filteredExpenses = expenses.filter(e => {
    const q = search.toLowerCase();
    return (
      e.description.toLowerCase().includes(q) ||
      (e.submitted_by_name || (e as any).submitter || '').toLowerCase().includes(q) ||
      e.category.toLowerCase().includes(q) ||
      e.status.toLowerCase().includes(q)
    );
  });

  const formatCat = (cat: string) => {
    return (cat || '').replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  };

  const formatStatus = (s: string) => {
    return s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : '';
  };

  return (
    <>
      <Head title="Expenses & Reimbursements" sub="Submit expense claims; leadership reviews and processes reimbursements." />

      <div className="card" style={{ marginBottom: 18 }}>
        <h2>Submit an Expense Claim</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr 1fr 1.2fr auto', gap: 12, alignItems: 'flex-end', marginTop: 8 }}>
          <div>
            <label style={{ margin: '0 0 6px' }}>Description / Purpose</label>
            <input
              value={f.title}
              onChange={e => setF({ ...f, title: e.target.value })}
              placeholder="e.g. Sound equipment rental, pizza for volunteer meeting"
            />
          </div>
          <div>
            <label style={{ margin: '0 0 6px' }}>Category</label>
            <select value={f.category} onChange={e => setF({ ...f, category: e.target.value })}>
              <option value="SUPPLIES">Supplies</option>
              <option value="EVENT_EXPENSE">Event Expense</option>
              <option value="MARKETING">Marketing</option>
              <option value="MERCHANDISE">Merchandise</option>
              <option value="TRAVEL">Travel</option>
              <option value="OTHER_EXPENSE">Other Expense</option>
            </select>
          </div>
          <div>
            <label style={{ margin: '0 0 6px' }}>Amount (₹)</label>
            <input
              type="number"
              value={f.amount}
              onChange={e => setF({ ...f, amount: e.target.value })}
              placeholder="0.00"
            />
          </div>
          <div>
            <label style={{ margin: '0 0 6px' }}>Expense Date</label>
            <input
              type="date"
              value={f.date}
              onChange={e => setF({ ...f, date: e.target.value })}
            />
          </div>
          <div>
            <button className="pri" style={{ height: 38, whiteSpace: 'nowrap', padding: '0 18px' }} disabled={submitting} onClick={handleSubmit}>
              {submitting ? 'Submitting…' : 'Submit Claim'}
            </button>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="row sp" style={{ marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
          <h2>Expense Claims ({expenses.length})</h2>
          <input
            type="search"
            placeholder="Search expenses by item, submitter, category…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ maxWidth: 320 }}
          />
        </div>

        {loading ? (
          <div className="mut sans" style={{ padding: '12px 0' }}>Loading claims…</div>
        ) : (
          <table style={{ width: '100%', tableLayout: 'auto' }}>
            <thead>
              <tr>
                <th style={{ width: 110, textAlign: 'left' }}>Date</th>
                <th style={{ width: 140, textAlign: 'left' }}>Submitted by</th>
                <th style={{ textAlign: 'left' }}>Description</th>
                <th style={{ width: 140, textAlign: 'left' }}>Category</th>
                <th style={{ width: 120, textAlign: 'right' }}>Amount</th>
                <th style={{ width: 120, textAlign: 'center' }}>Status</th>
                {(canApprove || canReimburse) && <th style={{ width: 160, textAlign: 'right' }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filteredExpenses.length === 0 ? (
                <tr><td colSpan={7} className="mut" style={{ textAlign: 'center', padding: '20px 0' }}>No expense claims match your search.</td></tr>
              ) : (
                filteredExpenses.map(e => (
                  <tr key={e.id}>
                    <td style={{ verticalAlign: 'middle' }}>{fdate(e.expense_date)}</td>
                    <td style={{ verticalAlign: 'middle' }}><b>{e.submitted_by_name || (e as any).submitter || 'Member'}</b></td>
                    <td style={{ verticalAlign: 'middle' }}>{e.description}</td>
                    <td style={{ verticalAlign: 'middle' }}><span className="badge">{formatCat(e.category)}</span></td>
                    <td style={{ textAlign: 'right', verticalAlign: 'middle', fontWeight: 600 }}>{money(e.amount)}</td>
                    <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                      <span className={'badge ' + badgeClass(e.status)}>{formatStatus(e.status)}</span>
                    </td>
                    {(canApprove || canReimburse) && (
                      <td style={{ textAlign: 'right', verticalAlign: 'middle' }}>
                        <div style={{ display: 'inline-flex', gap: 6, justifyContent: 'flex-end' }}>
                          {e.status === 'SUBMITTED' && canApprove && (
                            <>
                              <button className="sm pri" onClick={() => handleReview(e.id, 'APPROVE')}>Approve</button>
                              <button className="sm" onClick={() => handleReview(e.id, 'REJECT')}>Reject</button>
                            </>
                          )}
                          {e.status === 'APPROVED' && canReimburse && (
                            <button className="sm pri" onClick={() => handleReimburse(e.id)}>Reimburse</button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

export function Members() {
  const { startPay, notify, refreshKey, bump } = useApp();
  const [members, setMembers] = useState<Member[]>([]);
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');

  useEffect(() => {
    setLoading(true);
    const searchParam = q.trim() ? `?search=${encodeURIComponent(q.trim())}&page_size=100` : '?page_size=100';
    Promise.all([
      api.get<{ items: Member[] }>(`/members${searchParam}`),
      api.get<MembershipPlan[]>('/memberships/plans'),
    ])
      .then(([mRes, pRes]) => {
        setMembers(mRes.items || []);
        setPlans(Array.isArray(pRes) ? pRes : []);
      })
      .catch(err => notify(err.message))
      .finally(() => setLoading(false));
  }, [q, refreshKey, notify]);

  const handleCollectDues = (m: Member) => {
    const defaultPlan = plans.find(p => p.is_active) || plans[0];
    if (!defaultPlan) return notify('No membership plan available');

    startPay({
      title: `Membership Dues (${defaultPlan.name}) – ${m.first_name} ${m.last_name}`,
      amount: defaultPlan.price,
      onSuccess: async () => {
        try {
          await api.post('/memberships/join', {
            plan_id: defaultPlan.id,
            payment_method: 'CARD',
            member_id: m.id,
          });
          notify(`Dues recorded for ${m.first_name}!`);
          bump();
        } catch (e: any) {
          notify(e.message || 'Failed to record membership');
        }
      },
    });
  };

  return (
    <>
      <Head title="Members Directory" sub="Browse all registered students, verify dues status, and manage rosters." />

      <div className="row sp" style={{ marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
        <input
          type="search"
          placeholder="Search by name, student ID or email…"
          value={q}
          onChange={e => setQ(e.target.value)}
          style={{ maxWidth: 380 }}
        />
        <div className="mut sans" style={{ fontSize: 13, alignSelf: 'center' }}>
          Showing {members.length} registered member(s)
        </div>
      </div>

      <div className="card">
        {loading ? (
          <div className="mut sans" style={{ padding: '12px 0' }}>Loading member directory…</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th style={{ width: 160 }}>Name</th>
                <th style={{ width: 120 }}>Student ID</th>
                <th>Email</th>
                <th style={{ width: 130 }}>Plan Tier</th>
                <th style={{ width: 120 }}>Valid Until</th>
                <th style={{ width: 130, textAlign: 'center' }}>Dues Status</th>
                <th style={{ width: 120, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {members.length === 0 ? (
                <tr><td colSpan={7} className="mut" style={{ textAlign: 'center', padding: '20px 0' }}>No members matching search query.</td></tr>
              ) : (
                members.map(u => (
                  <tr key={u.id}>
                    <td style={{ verticalAlign: 'middle' }}><b>{u.first_name} {u.last_name}</b></td>
                    <td style={{ verticalAlign: 'middle' }}><code>{u.student_id || '—'}</code></td>
                    <td style={{ verticalAlign: 'middle' }}>{u.email}</td>
                    <td style={{ verticalAlign: 'middle' }}>{u.plan_name || '—'}</td>
                    <td style={{ verticalAlign: 'middle' }}>{fdate(u.end_date)}</td>
                    <td style={{ verticalAlign: 'middle', textAlign: 'center' }}>
                      <span className={'badge ' + (u.is_active_member ? 'b-ok' : u.membership_state === 'EXPIRED' ? 'b-bad' : 'b-warn')}>
                        {u.is_active_member ? 'Active · Paid' : u.membership_state || 'Unpaid'}
                      </span>
                    </td>
                    <td style={{ verticalAlign: 'middle', textAlign: 'right' }}>
                      {!u.is_active_member && (
                        <button className="sm pri" onClick={() => handleCollectDues(u)}>
                          Collect Dues
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

export function CheckIn() {
  const { notify } = useApp();
  const [code, setCode] = useState('');
  const [ticketResult, setTicketResult] = useState<{
    status: 'ok' | 'used' | 'missing' | 'error';
    message?: string;
    data?: any;
  } | null>(null);

  const [q, setQ] = useState('');
  const [memberResult, setMemberResult] = useState<any>(null);
  const [checkingMember, setCheckingMember] = useState(false);

  // Door Ticket Check-in with strict one-time enforcement
  const handleTicketCheckIn = async () => {
    if (!code.trim()) return;
    setTicketResult(null);
    const cleanCode = code.trim();
    try {
      const res = await api.post<any>('/tickets/check-in', {
        code: cleanCode,
        method: 'MANUAL',
      });
      setTicketResult({
        status: 'ok',
        data: res,
      });
      setCode('');
    } catch (e: any) {
      // If backend returns 409 or already used
      if (e.status === 409 || e.message?.toLowerCase().includes('already')) {
        setTicketResult({
          status: 'used',
          message: e.message || 'Ticket has already been checked in. One-time entrance only.',
        });
      } else if (e.status === 404 || e.message?.toLowerCase().includes('not found')) {
        setTicketResult({
          status: 'missing',
          message: `Ticket code "${cleanCode}" not found in registry.`,
        });
      } else {
        setTicketResult({
          status: 'error',
          message: e.message || 'Check-in failed.',
        });
      }
    }
  };

  const handleMemberVerify = async () => {
    if (!q.trim() || q.trim().length < 2) {
      setMemberResult(null);
      return;
    }
    setCheckingMember(true);
    try {
      const res = await api.get<any>(`/members/verify?query=${encodeURIComponent(q.trim())}`);
      setMemberResult(res);
    } catch (e: any) {
      notify(e.message || 'Verification failed');
    } finally {
      setCheckingMember(false);
    }
  };

  return (
    <>
      <Head
        title="Door Check-in & Verification"
        sub="Strict one-time entrance check-in: QR / ticket codes cannot be reused. Verify active membership eligibility at the door."
      />

      <div className="grid g2">
        {/* Ticket check-in card */}
        <div className="card">
          <h2>One-Time Ticket Check-in</h2>
          <label>Scan QR or Enter Ticket Code</label>
          <input
            autoFocus
            placeholder="e.g. TKT-ABC12345"
            value={code}
            onChange={e => setCode(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleTicketCheckIn()}
          />
          <button className="pri mt" onClick={handleTicketCheckIn}>
            Verify & Check In
          </button>

          {/* Result Banners */}
          {ticketResult?.status === 'ok' && (
            <div
              className="res ok"
              style={{
                marginTop: 16,
                padding: '16px',
                border: '2px solid var(--ok)',
                borderRadius: 8,
              }}
            >
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--ok)' }}>
                ✓ ACCESS GRANTED — TICKET VALID
              </div>
              <div style={{ fontSize: 14, marginTop: 4 }}>
                Attendee: <b>{ticketResult.data?.buyer_name || 'Member'}</b>
              </div>
              <div style={{ fontSize: 13, marginTop: 2 }}>
                Event: <b>{ticketResult.data?.event_name}</b>
              </div>
              <div className="mut sans" style={{ fontSize: 12, marginTop: 6 }}>
                Code: <code>{ticketResult.data?.ticket_code}</code> · Status: <b>CHECKED IN (USED)</b>
              </div>
            </div>
          )}

          {ticketResult?.status === 'used' && (
            <div
              className="res bad"
              style={{
                marginTop: 16,
                padding: '16px',
                border: '2px solid var(--bad)',
                borderRadius: 8,
                background: '#fff3f0',
              }}
            >
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--bad)' }}>
                ⛔ ENTRANCE DENIED — TICKET ALREADY USED
              </div>
              <div style={{ fontSize: 13.5, marginTop: 6, color: '#333' }}>
                {ticketResult.message}
              </div>
              <div className="mut sans" style={{ fontSize: 12, marginTop: 6 }}>
                ⚠️ This ticket has already been used for admission. Duplicate entry is strictly prohibited.
              </div>
            </div>
          )}

          {ticketResult?.status === 'missing' && (
            <div
              className="res bad"
              style={{
                marginTop: 16,
                padding: '16px',
                border: '2px solid var(--bad)',
                borderRadius: 8,
              }}
            >
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--bad)' }}>
                ❌ INVALID TICKET
              </div>
              <div style={{ fontSize: 13, marginTop: 4 }}>
                {ticketResult.message}
              </div>
            </div>
          )}

          {ticketResult?.status === 'error' && (
            <div className="res bad" style={{ marginTop: 16, padding: 14 }}>
              <b>Error:</b> {ticketResult.message}
            </div>
          )}
        </div>

        {/* Member verification card */}
        <div className="card">
          <h2>Verify Member Status at Door</h2>
          <label>Search Student ID or Email</label>
          <div className="row" style={{ gap: 8 }}>
            <input
              placeholder="e.g. SKY-00002 or alex@skyline.edu"
              value={q}
              onChange={e => setQ(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleMemberVerify()}
            />
            <button onClick={handleMemberVerify}>Verify</button>
          </div>

          {checkingMember && <div className="mut sans mt">Verifying member record…</div>}

          {memberResult && (
            <div style={{ marginTop: 16 }}>
              {memberResult.found ? (
                <div
                  className={'res ' + (memberResult.membership?.is_active ? 'ok' : 'bad')}
                  style={{ padding: 14, borderRadius: 8 }}
                >
                  <div style={{ fontSize: 16, fontWeight: 700 }}>
                    {memberResult.member.first_name} {memberResult.member.last_name}
                  </div>
                  <div className="mut sans" style={{ fontSize: 13, margin: '3px 0' }}>
                    Student ID: <code>{memberResult.member.student_id}</code> · {memberResult.member.email}
                  </div>
                  <div style={{ fontWeight: 600, marginTop: 6 }}>
                    {memberResult.membership?.is_active
                      ? `✓ Active Member (${memberResult.membership?.plan_name}) — Dues Paid`
                      : `✗ Inactive / Unpaid (${memberResult.membership?.state || 'No Active Plan'})`}
                  </div>
                </div>
              ) : (
                <div className="res bad" style={{ padding: 14 }}>
                  No student profile found for &quot;{memberResult.query}&quot;.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export function Finance() {
  const { notify, refreshKey, bump } = useApp();
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [newTx, setNewTx] = useState({
    type: 'INCOME',
    category: 'MEMBERSHIP_DUES',
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
  });
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get<FinanceSummary>('/finance/summary'),
      api.get<{ items: Transaction[] }>('/finance/transactions?page_size=200'),
    ])
      .then(([sum, txRes]) => {
        setSummary(sum);
        setTransactions(txRes.items || []);
      })
      .catch(err => notify(err.message))
      .finally(() => setLoading(false));
  }, [refreshKey, notify]);

  const handleCreateTx = async () => {
    if (!newTx.description.trim() || !(+newTx.amount > 0)) {
      return notify('Please provide a description and amount');
    }
    try {
      await api.post('/finance/transactions', {
        transaction_type: newTx.type,
        category: newTx.category,
        amount: +newTx.amount,
        description: newTx.description.trim(),
        transaction_date: newTx.date,
      });
      setNewTx({
        type: 'INCOME',
        category: 'MEMBERSHIP_DUES',
        amount: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
      });
      setShowAdd(false);
      notify('Ledger transaction recorded');
      bump();
    } catch (e: any) {
      notify(e.message || 'Failed to record transaction');
    }
  };

  const handleReverse = async (txId: string) => {
    const reason = window.prompt('Reason for reversing this transaction:');
    if (!reason) return;
    try {
      await api.post(`/finance/transactions/${txId}/reverse`, { reason });
      notify('Offsetting reversal recorded');
      bump();
    } catch (e: any) {
      notify(e.message || 'Reversal failed');
    }
  };

  const incomeCategories = ['MEMBERSHIP_DUES', 'TICKET_SALES', 'MERCHANDISE_SALES', 'FUNDRAISER', 'SPONSORSHIP', 'OTHER_INCOME'];
  const expenseCategories = ['EVENT_EXPENSE', 'MERCHANDISE_PRODUCTION', 'SUPPLIES', 'MARKETING', 'REIMBURSEMENT', 'OTHER_EXPENSE'];

  const filteredTransactions = transactions.filter(t => {
    const q = search.toLowerCase();
    return (
      t.description.toLowerCase().includes(q) ||
      t.category.toLowerCase().includes(q) ||
      t.type.toLowerCase().includes(q) ||
      (t.id || '').toLowerCase().includes(q)
    );
  });

  return (
    <>
      <Head title="Finance & Ledger" sub="Real-time balance, double-entry audit trail, and income breakdowns." />

      {loading && !summary ? (
        <div className="card mut sans">Loading financial ledger…</div>
      ) : (
        <>
          <div className="grid g4">
            <Stat l="Total Income" v={money(summary?.total_income ?? 0)} />
            <Stat l="Total Expenses" v={money((summary as any)?.total_expenses ?? summary?.total_expense ?? 0)} />
            <Stat l="Current Balance" v={money(summary?.balance ?? 0)} />
            <Stat l="Total Transactions" v={transactions.length} />
          </div>

          <div className="card mt">
            <div className="row sp">
              <h2>Add Ledger Entry</h2>
              <button onClick={() => setShowAdd(!showAdd)}>{showAdd ? 'Close' : '+ Record Entry'}</button>
            </div>

            {showAdd && (
              <div className="mt" style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr 2fr 1fr 1.2fr auto', gap: 12, alignItems: 'flex-end' }}>
                <div>
                  <label style={{ margin: '0 0 6px' }}>Type</label>
                  <select
                    value={newTx.type}
                    onChange={e => {
                      const t = e.target.value;
                      setNewTx({
                        ...newTx,
                        type: t,
                        category: t === 'INCOME' ? 'MEMBERSHIP_DUES' : 'EVENT_EXPENSE',
                      });
                    }}
                  >
                    <option value="INCOME">Income (+)</option>
                    <option value="EXPENSE">Expense (−)</option>
                  </select>
                </div>
                <div>
                  <label style={{ margin: '0 0 6px' }}>Category</label>
                  <select value={newTx.category} onChange={e => setNewTx({ ...newTx, category: e.target.value })}>
                    {(newTx.type === 'INCOME' ? incomeCategories : expenseCategories).map(c => (
                      <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ margin: '0 0 6px' }}>Description</label>
                  <input
                    value={newTx.description}
                    onChange={e => setNewTx({ ...newTx, description: e.target.value })}
                    placeholder="e.g. Sponsor donation, venue fee"
                  />
                </div>
                <div>
                  <label style={{ margin: '0 0 6px' }}>Amount (₹)</label>
                  <input
                    type="number"
                    value={newTx.amount}
                    onChange={e => setNewTx({ ...newTx, amount: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label style={{ margin: '0 0 6px' }}>Date</label>
                  <input
                    type="date"
                    value={newTx.date}
                    onChange={e => setNewTx({ ...newTx, date: e.target.value })}
                  />
                </div>
                <div>
                  <button className="pri" style={{ height: 38, whiteSpace: 'nowrap' }} onClick={handleCreateTx}>Post Entry</button>
                </div>
              </div>
            )}
          </div>

          <div className="card mt">
            <div className="row sp" style={{ marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
              <h2>Transaction Ledger ({transactions.length})</h2>
              <input
                type="search"
                placeholder="Search transactions by description, category, type…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ maxWidth: 360 }}
              />
            </div>

            <table>
              <thead>
                <tr>
                  <th style={{ width: 110 }}>Date</th>
                  <th style={{ width: 150 }}>Category</th>
                  <th>Description</th>
                  <th style={{ width: 110, textAlign: 'center' }}>Type</th>
                  <th style={{ width: 120, textAlign: 'right' }}>Amount</th>
                  <th style={{ width: 90, textAlign: 'right' }}></th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.length === 0 ? (
                  <tr><td colSpan={6} className="mut" style={{ textAlign: 'center', padding: '20px 0' }}>No transactions match your search.</td></tr>
                ) : (
                  filteredTransactions.map(t => {
                    const isInc = t.type === 'INCOME';
                    return (
                      <tr key={t.id} style={{ opacity: t.reversed ? 0.4 : 1 }}>
                        <td style={{ verticalAlign: 'middle' }}>{fdate(t.date)}</td>
                        <td style={{ verticalAlign: 'middle' }}><span className="badge">{t.category?.replace(/_/g, ' ')}</span></td>
                        <td style={{ verticalAlign: 'middle' }}>
                          {t.description}
                          {t.is_reversal && <span className="mut sans" style={{ fontSize: 11, marginLeft: 6 }}>(Reversal)</span>}
                          {t.reversed && <span className="mut sans" style={{ fontSize: 11, marginLeft: 6 }}>(Reversed)</span>}
                        </td>
                        <td style={{ verticalAlign: 'middle', textAlign: 'center' }}>
                          <span className={'badge ' + (isInc ? 'b-ok' : 'b-bad')}>
                            {t.type}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right', verticalAlign: 'middle', fontWeight: 600, color: isInc ? 'var(--ok)' : 'var(--bad)' }}>
                          {isInc ? '+' : '−'}{money(t.amount)}
                        </td>
                        <td style={{ textAlign: 'right', verticalAlign: 'middle' }}>
                          {!t.is_reversal && !t.reversed && (
                            <button className="sm" onClick={() => handleReverse(t.id)}>
                              Reverse
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}
