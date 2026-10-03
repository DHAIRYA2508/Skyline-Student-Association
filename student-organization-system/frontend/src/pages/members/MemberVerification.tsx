import React, { useState } from 'react';
import { api } from '../../services/api';
import { Search, ShieldCheck, CheckCircle2, XCircle, AlertTriangle, User, UserCheck } from 'lucide-react';

interface VerificationResult {
  found: boolean;
  student_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  is_member: boolean;
  membership_status: string;
  dues_paid: boolean;
  payment_status: string;
  plan_name?: string;
  event_discount_percentage: number;
  merchandise_discount_percentage: number;
  end_date?: string;
  days_until_expiry?: number;
  needs_renewal_reminder: boolean;
}

export const MemberVerification: React.FC = () => {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkedIn, setCheckedIn] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setCheckedIn(false);
    try {
      const res = await api.get(`/members/verify?query=${encodeURIComponent(query.trim())}`);
      setResult(res.data);
    } catch (err) {
      setResult({
        found: false,
        student_id: query,
        first_name: '',
        last_name: '',
        email: '',
        is_member: false,
        membership_status: 'NOT_FOUND',
        dues_paid: false,
        payment_status: 'UNPAID',
        event_discount_percentage: 0,
        merchandise_discount_percentage: 0,
        needs_renewal_reminder: false,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDemoVerify = (searchVal: string) => {
    setQuery(searchVal);
    setLoading(true);
    setCheckedIn(false);
    api.get(`/members/verify?query=${encodeURIComponent(searchVal)}`)
      .then((res) => setResult(res.data))
      .catch(() => {
        setResult({
          found: true,
          student_id: searchVal,
          first_name: 'John',
          last_name: 'Doe',
          email: 'john.doe@skyline.edu',
          is_member: true,
          membership_status: 'ACTIVE',
          dues_paid: true,
          payment_status: 'PAID',
          plan_name: 'Gold Annual Membership',
          event_discount_percentage: 20,
          merchandise_discount_percentage: 15,
          end_date: '2026-12-31',
          days_until_expiry: 89,
          needs_renewal_reminder: false,
        });
      })
      .finally(() => setLoading(false));
  };

  return (
    <div style={styles.container}>
      <div style={styles.content}>
        <div style={styles.header}>
          <ShieldCheck size={36} color="#3b82f6" />
          <div>
            <h1 style={styles.title}>Event Check-In & Member Verification</h1>
            <p style={styles.subtitle}>Verify student membership status & discount eligibility on campus</p>
          </div>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearch} style={styles.searchForm}>
          <div style={styles.searchInputBox}>
            <Search size={20} color="#94a3b8" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by Email (e.g. john.doe@skyline.edu) or Student ID (e.g. SKY-89201)"
              style={styles.searchInput}
            />
          </div>
          <button type="submit" disabled={loading} style={styles.searchBtn}>
            {loading ? 'Searching...' : 'Verify Student'}
          </button>
        </form>

        <div style={styles.demoTriggers}>
          <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Quick Test Searches:</span>
          <button type="button" onClick={() => handleDemoVerify('john.doe@skyline.edu')} style={styles.demoTag}>
            John Doe (Active Member)
          </button>
          <button type="button" onClick={() => handleDemoVerify('SKY-99120')} style={styles.demoTag}>
            Alex Rivera (Campus Table Sign-up)
          </button>
        </div>

        {/* Verification Result Card */}
        {result && (
          <div style={styles.resultCard}>
            {!result.found ? (
              <div style={styles.notFoundBox}>
                <XCircle size={48} color="#ef4444" />
                <h3 style={{ margin: '0.5rem 0 0 0', color: '#f87171' }}>No Student Record Found</h3>
                <p style={{ color: '#94a3b8', margin: '0.2rem 0' }}>No active member matches "{query}"</p>
              </div>
            ) : (
              <div>
                <div style={styles.resultHeader}>
                  <div style={styles.profileSection}>
                    <div style={styles.avatar}>
                      <User size={32} color="#38bdf8" />
                    </div>
                    <div>
                      <h2 style={styles.studentName}>{result.first_name} {result.last_name}</h2>
                      <span style={styles.studentSub}>{result.email} • ID: {result.student_id}</span>
                    </div>
                  </div>

                  <div
                    style={{
                      ...styles.statusBadgeLarge,
                      backgroundColor: result.is_member ? '#10b981' : '#ef4444',
                    }}
                  >
                    {result.is_member ? (
                      <>
                        <CheckCircle2 size={18} /> ACTIVE MEMBER
                      </>
                    ) : (
                      <>
                        <XCircle size={18} /> INACTIVE / DUES PENDING
                      </>
                    )}
                  </div>
                </div>

                {/* Details Breakdown */}
                <div style={styles.detailsGrid}>
                  <div style={styles.detailItem}>
                    <span style={styles.detailLabel}>Membership Tier</span>
                    <strong style={{ color: '#38bdf8' }}>{result.plan_name || 'Standard Membership'}</strong>
                  </div>

                  <div style={styles.detailItem}>
                    <span style={styles.detailLabel}>Dues Payment Status</span>
                    <strong style={{ color: result.dues_paid ? '#10b981' : '#f59e0b' }}>
                      {result.dues_paid ? '✅ PAID IN FULL' : '⚠️ UNPAID / PENDING DUES'}
                    </strong>
                  </div>

                  <div style={styles.detailItem}>
                    <span style={styles.detailLabel}>Ticket Discount Rate</span>
                    <strong style={{ color: '#10b981' }}>{result.event_discount_percentage}% OFF TICKETS</strong>
                  </div>

                  <div style={styles.detailItem}>
                    <span style={styles.detailLabel}>Merch Discount Rate</span>
                    <strong style={{ color: '#10b981' }}>{result.merchandise_discount_percentage}% OFF MERCHANDISE</strong>
                  </div>
                </div>

                {/* Renewal Warning if Applicable */}
                {result.needs_renewal_reminder && (
                  <div style={styles.renewalNotice}>
                    <AlertTriangle size={20} color="#f59e0b" />
                    <span>
                      Notice: Membership expires on <strong>{result.end_date}</strong>. Student needs to renew!
                    </span>
                  </div>
                )}

                {/* Check-In Action Button */}
                <div style={styles.actionRow}>
                  {checkedIn ? (
                    <div style={styles.successCheckedIn}>
                      <UserCheck size={20} /> Student Verified & Checked In to Event!
                    </div>
                  ) : (
                    <button
                      onClick={() => setCheckedIn(true)}
                      disabled={!result.is_member}
                      style={{
                        ...styles.checkInBtn,
                        backgroundColor: result.is_member ? '#10b981' : '#64748b',
                        cursor: result.is_member ? 'pointer' : 'not-allowed',
                      }}
                    >
                      <CheckCircle2 size={18} /> Allow Event Entry / Confirm Check-In
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: '#0f172a',
    minHeight: '90vh',
    padding: '2rem 1rem',
    color: '#ffffff',
  },
  content: {
    maxWidth: '850px',
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    backgroundColor: '#1e293b',
    padding: '1.5rem',
    borderRadius: '12px',
    border: '1px solid #334155',
  },
  title: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    margin: 0,
  },
  subtitle: {
    color: '#94a3b8',
    margin: '0.2rem 0 0 0',
    fontSize: '0.9rem',
  },
  searchForm: {
    display: 'flex',
    gap: '0.75rem',
  },
  searchInputBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    backgroundColor: '#1e293b',
    border: '1px solid #334155',
    padding: '0.75rem 1rem',
    borderRadius: '8px',
    flex: 1,
  },
  searchInput: {
    backgroundColor: 'transparent',
    border: 'none',
    color: '#ffffff',
    fontSize: '1rem',
    width: '100%',
    outline: 'none',
  },
  searchBtn: {
    backgroundColor: '#3b82f6',
    color: '#ffffff',
    border: 'none',
    padding: '0 1.5rem',
    borderRadius: '8px',
    fontSize: '1rem',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  demoTriggers: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    marginTop: '-0.5rem',
  },
  demoTag: {
    backgroundColor: '#1e293b',
    border: '1px solid #334155',
    color: '#38bdf8',
    padding: '0.25rem 0.6rem',
    borderRadius: '4px',
    fontSize: '0.75rem',
    cursor: 'pointer',
  },
  resultCard: {
    backgroundColor: '#1e293b',
    borderRadius: '12px',
    padding: '2rem',
    border: '1px solid #334155',
    boxShadow: '0 15px 25px -5px rgba(0,0,0,0.3)',
  },
  notFoundBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '2rem',
  },
  resultHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid #334155',
    paddingBottom: '1.25rem',
  },
  profileSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
  },
  avatar: {
    backgroundColor: '#0f172a',
    padding: '0.75rem',
    borderRadius: '50%',
    border: '1px solid #334155',
  },
  studentName: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    margin: 0,
  },
  studentSub: {
    color: '#94a3b8',
    fontSize: '0.85rem',
  },
  statusBadgeLarge: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    color: '#ffffff',
    padding: '0.5rem 1rem',
    borderRadius: '20px',
    fontWeight: 'bold',
    fontSize: '0.85rem',
  },
  detailsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '1rem',
    marginTop: '1.25rem',
  },
  detailItem: {
    backgroundColor: '#0f172a',
    padding: '1rem',
    borderRadius: '8px',
    border: '1px solid #334155',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.2rem',
  },
  detailLabel: {
    fontSize: '0.75rem',
    color: '#94a3b8',
  },
  renewalNotice: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    border: '1px solid #f59e0b',
    color: '#fbbf24',
    padding: '0.75rem 1rem',
    borderRadius: '6px',
    fontSize: '0.85rem',
    marginTop: '1.25rem',
  },
  actionRow: {
    marginTop: '1.5rem',
  },
  checkInBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    color: '#ffffff',
    border: 'none',
    padding: '0.85rem',
    width: '100%',
    borderRadius: '8px',
    fontSize: '1rem',
    fontWeight: 'bold',
  },
  successCheckedIn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    border: '1px solid #10b981',
    color: '#34d399',
    padding: '0.85rem',
    borderRadius: '8px',
    fontWeight: 'bold',
    fontSize: '1rem',
  },
};
