import { useEffect, useState } from 'react';
import { useApp, money, fdate } from '../store/store';
import { Head, Stat } from '../store/ui';
import { api } from '../services/api';
import type { Expense, Member, Transaction, FinanceSummary, MembershipPlan } from '../services/api';

export function Expenses() {
  const { me, notify, refreshKey, bump } = useApp();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <>
      <Head title="Expenses & Reimbursements" sub="Submit expense claims; leadership reviews and processes reimbursements." />

      <div className="card" style={{ marginBottom: 18 }}>
        <h2>Submit an expense claim</h2>
        <div className="row" style={{ alignItems: 'flex-end', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ flex: 2, minWidth: 200 }}>
            <label>Description / purpose</label>
            <input
              value={f.title}
              onChange={e => setF({ ...f, title: e.target.value })}
              placeholder="e.g. Sound equipment rental, pizza"
            />
          </div>
          <div style={{ flex: 1, minWidth: 140 }}>
            <label>Category</label>
            <select value={f.category} onChange={e => setF({ ...f, category: e.target.value })}>
              <option value="SUPPLIES">Supplies</option>
              <option value="EVENT_EXPENSE">Event Expense</option>
              <option value="MARKETING">Marketing</option>
              <option value="MERCHANDISE">Merchandise</option>
              <option value="TRAVEL">Travel</option>
              <option value="OTHER_EXPENSE">Other</option>
            </select>
          </div>
          <div style={{ flex: 1, minWidth: 100 }}>
            <label>Amount (₹)</label>
            <input
              type="number"
              value={f.amount}
              onChange={e => setF({ ...f, amount: e.target.value })}
              placeholder="0.00"
            />
          </div>
          <div style={{ flex: 1, minWidth: 130 }}>
            <label>Expense Date</label>
            <input
              type="date"
              value={f.date}
              onChange={e => setF({ ...f, date: e.target.value })}
            />
          </div>
          <button className="pri" disabled={submitting} onClick={handleSubmit}>
            {submitting ? 'Submitting…' : 'Submit'}
          </button>
        </div>
      </div>

      <div className="card">
        <h2>Expense Claims</h2>
        {loading ? (
          <div className="mut sans" style={{ padding: '12px 0' }}>Loading claims…</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Submitted by</th>
                <th>Description</th>
                <th>Category</th>
                <th>Amount</th>
                <th>Status</th>
                {(canApprove || canReimburse) && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {expenses.length === 0 ? (
                <tr><td colSpan={7} className="mut">No expense claims found.</td></tr>
              ) : (
                expenses.map(e => (
                  <tr key={e.id}>
                    <td>{fdate(e.expense_date)}</td>
                    <td>{e.submitted_by_name || (e as any).submitter || 'Member'}</td>
                    <td>{e.description}</td>
                    <td><span className="badge">{e.category}</span></td>
                    <td>{money(e.amount)}</td>
                    <td><span className={'badge ' + badgeClass(e.status)}>{e.status}</span></td>
                    {(canApprove || canReimburse) && (
                      <td className="row" style={{ gap: 6 }}>
                        {e.status === 'SUBMITTED' && canApprove && (
                          <>
                            <button className="sm pri" onClick={() => handleReview(e.id, 'APPROVE')}>Approve</button>
                            <button className="sm" onClick={() => handleReview(e.id, 'REJECT')}>Reject</button>
                          </>
                        )}
                        {e.status === 'APPROVED' && canReimburse && (
                          <button className="sm pri" onClick={() => handleReimburse(e.id)}>Reimburse</button>
                        )}
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
      <Head title="Members" sub="Browse all registered students, verify status, and collect dues." />

      <input
        placeholder="Search by name, student ID or email…"
        value={q}
        onChange={e => setQ(e.target.value)}
        style={{ maxWidth: 380, marginBottom: 14 }}
      />

      <div className="card">
        {loading ? (
          <div className="mut sans" style={{ padding: '12px 0' }}>Loading member directory…</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Student ID</th>
                <th>Email</th>
                <th>Plan</th>
                <th>Valid Until</th>
                <th>Membership</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {members.length === 0 ? (
                <tr><td colSpan={7} className="mut">No members matching search query.</td></tr>
              ) : (
                members.map(u => (
                  <tr key={u.id}>
                    <td><b>{u.first_name} {u.last_name}</b></td>
                    <td><code>{u.student_id || '—'}</code></td>
                    <td>{u.email}</td>
                    <td>{u.plan_name || '—'}</td>
                    <td>{fdate(u.end_date)}</td>
                    <td>
                      <span className={'badge ' + (u.is_active_member ? 'b-ok' : u.membership_state === 'EXPIRED' ? 'b-bad' : 'b-warn')}>
                        {u.is_active_member ? 'Active' : u.membership_state || 'Unpaid'}
                      </span>
                    </td>
                    <td>
                      {!u.is_active_member && (
                        <button className="sm" onClick={() => handleCollectDues(u)}>
                          Collect dues
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
  const [ticketResult, setTicketResult] = useState<{ status: 'ok' | 'used' | 'missing' | 'error'; message?: string; data?: any } | null>(null);

  const [q, setQ] = useState('');
  const [memberResult, setMemberResult] = useState<any>(null);
  const [checkingMember, setCheckingMember] = useState(false);

  const handleTicketCheckIn = async () => {
    if (!code.trim()) return;
    setTicketResult(null);
    try {
      const res = await api.post<any>('/tickets/check-in', {
        code: code.trim(),
        method: 'MANUAL',
      });
      setTicketResult({
        status: 'ok',
        data: res,
      });
      setCode('');
    } catch (e: any) {
      if (e.status === 409 || e.message?.toLowerCase().includes('already')) {
        setTicketResult({ status: 'used', message: e.message || 'Ticket was already checked in.' });
      } else if (e.status === 404 || e.message?.toLowerCase().includes('not found')) {
        setTicketResult({ status: 'missing', message: 'Ticket code not found.' });
      } else {
        setTicketResult({ status: 'error', message: e.message });
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
      <Head title="Door Check-in" sub="Scan ticket codes or verify membership eligibility at the venue entrance." />

      <div className="grid g2">
        {/* Ticket check-in card */}
        <div className="card">
          <h2>Ticket Check-in</h2>
          <label>Ticket code</label>
          <input
            autoFocus
            placeholder="e.g. SKY-001 or scan QR"
            value={code}
            onChange={e => setCode(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleTicketCheckIn()}
          />
          <button className="pri mt" onClick={handleTicketCheckIn}>Check in</button>

          {ticketResult?.status === 'ok' && (
            <div className="res ok" style={{ marginTop: 14 }}>
              <b>✓ Valid Ticket — Access Granted</b>
              <div>{ticketResult.data?.buyer_name || 'Attendee'} · {ticketResult.data?.event_name}</div>
              <div className="mut sans" style={{ fontSize: 12 }}>Code: {ticketResult.data?.ticket_code}</div>
            </div>
          )}
          {ticketResult?.status === 'used' && (
            <div className="res warn" style={{ marginTop: 14 }}>
              <b>Already Used</b>
              <div>{ticketResult.message}</div>
            </div>
          )}
          {ticketResult?.status === 'missing' && (
            <div className="res bad" style={{ marginTop: 14 }}>
              <b>Invalid Ticket Code</b>
              <div>Please check the code or verify attendee identity.</div>
            </div>
          )}
          {ticketResult?.status === 'error' && (
            <div className="res bad" style={{ marginTop: 14 }}>
              <b>Error:</b> {ticketResult.message}
            </div>
          )}
        </div>

        {/* Member verification card */}
        <div className="card">
          <h2>Verify Member at Door</h2>
          <label>Student ID or Email</label>
          <div className="row" style={{ gap: 8 }}>
            <input
              placeholder="e.g. SKY-10010 or student@skyline.edu"
              value={q}
              onChange={e => setQ(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleMemberVerify()}
            />
            <button onClick={handleMemberVerify}>Verify</button>
          </div>

          {checkingMember && <div className="mut sans mt">Verifying…</div>}

          {memberResult && (
            <div style={{ marginTop: 14 }}>
              {memberResult.found ? (
                <div className={'res ' + (memberResult.membership?.is_active ? 'ok' : 'bad')}>
                  <b>{memberResult.member.first_name} {memberResult.member.last_name}</b> · {memberResult.member.student_id}
                  <div>
                    {memberResult.membership?.is_active
                      ? `Active Member (${memberResult.membership?.plan_name}) — Dues Paid`
                      : `Not an active member (${memberResult.membership?.state || 'Unpaid'})`}
                  </div>
                </div>
              ) : (
                <div className="res bad">No student profile found for &quot;{memberResult.query}&quot;.</div>
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
      api.get<{ items: Transaction[] }>('/finance/transactions?page_size=100'),
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
              <div className="row mt" style={{ alignItems: 'flex-end', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 110 }}>
                  <label>Type</label>
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
                <div style={{ flex: 1, minWidth: 160 }}>
                  <label>Category</label>
                  <select value={newTx.category} onChange={e => setNewTx({ ...newTx, category: e.target.value })}>
                    {(newTx.type === 'INCOME' ? incomeCategories : expenseCategories).map(c => (
                      <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>
                    ))}
                  </select>
                </div>
                <div style={{ flex: 2, minWidth: 180 }}>
                  <label>Description</label>
                  <input
                    value={newTx.description}
                    onChange={e => setNewTx({ ...newTx, description: e.target.value })}
                    placeholder="e.g. Sponsor donation, venue fee"
                  />
                </div>
                <div style={{ flex: 1, minWidth: 100 }}>
                  <label>Amount (₹)</label>
                  <input
                    type="number"
                    value={newTx.amount}
                    onChange={e => setNewTx({ ...newTx, amount: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
                <div style={{ flex: 1, minWidth: 130 }}>
                  <label>Date</label>
                  <input
                    type="date"
                    value={newTx.date}
                    onChange={e => setNewTx({ ...newTx, date: e.target.value })}
                  />
                </div>
                <button className="pri" onClick={handleCreateTx}>Post Entry</button>
              </div>
            )}
          </div>

          <div className="card mt">
            <h2>Transaction Ledger</h2>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Category</th>
                  <th>Description</th>
                  <th>Type</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {transactions.length === 0 ? (
                  <tr><td colSpan={6} className="mut">No transactions recorded.</td></tr>
                ) : (
                  transactions.map(t => {
                    const isInc = t.type === 'INCOME';
                    return (
                      <tr key={t.id} style={{ opacity: t.reversed ? 0.4 : 1 }}>
                        <td>{fdate(t.date)}</td>
                        <td><span className="badge">{t.category}</span></td>
                        <td>
                          {t.description}
                          {t.is_reversal && <span className="mut sans" style={{ fontSize: 11, marginLeft: 6 }}>(Reversal)</span>}
                          {t.reversed && <span className="mut sans" style={{ fontSize: 11, marginLeft: 6 }}>(Reversed)</span>}
                        </td>
                        <td>
                          <span className={'badge ' + (isInc ? 'b-ok' : 'b-bad')}>
                            {t.type}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 600, color: isInc ? 'var(--ok)' : 'var(--bad)' }}>
                          {isInc ? '+' : '−'}{money(t.amount)}
                        </td>
                        <td style={{ textAlign: 'right' }}>
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
