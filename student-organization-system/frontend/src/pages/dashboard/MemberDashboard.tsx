import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { ShieldCheck, CheckCircle, AlertTriangle, Ticket, ShoppingBag, Calendar, CreditCard, Sparkles, User } from 'lucide-react';

export const MemberDashboard: React.FC = () => {
  const { user } = useAuth();

  if (!user) {
    return (
      <div style={styles.container}>
        <h2>Loading Profile...</h2>
      </div>
    );
  }

  const membership = user.membership;
  const duesPaid = membership?.dues_paid;
  const isExpiringSoon = membership?.needs_renewal_reminder;

  return (
    <div style={styles.container}>
      <div style={styles.content}>
        {/* Welcome Header */}
        <div style={styles.welcomeCard}>
          <div>
            <h1 style={styles.title}>Welcome, {user.first_name}! 👋</h1>
            <p style={styles.subtitle}>Skyline Student Association Member Portal</p>
          </div>
          <div style={styles.studentIdBadge}>
            <User size={16} /> ID: <strong>{user.student_id || 'SKY-2026-MEMBER'}</strong>
          </div>
        </div>

        {/* Expiry Renewal Reminder Banner */}
        {isExpiringSoon && (
          <div style={styles.warningBanner}>
            <AlertTriangle size={24} color="#f59e0b" />
            <div>
              <h4 style={styles.bannerTitle}>Membership Renewal Reminder!</h4>
              <p style={styles.bannerDesc}>
                Your {membership?.plan_name} membership expires on <strong>{membership?.end_date}</strong> (in {membership?.days_until_expiry} days). Please renew at the campus table or online before it lapses!
              </p>
            </div>
            <button style={styles.renewBtn}>Renew Membership</button>
          </div>
        )}

        <div style={styles.grid}>
          {/* Digital Membership Pass Card */}
          <div style={styles.passCard}>
            <div style={styles.passHeader}>
              <div style={styles.passBrand}>
                <ShieldCheck size={28} color="#38bdf8" />
                <span>SKYLINE ASSOCIATION</span>
              </div>
              <div
                style={{
                  ...styles.statusBadge,
                  backgroundColor: duesPaid ? '#10b981' : '#f59e0b',
                }}
              >
                {duesPaid ? (
                  <>
                    <CheckCircle size={14} /> ACTIVE MEMBER
                  </>
                ) : (
                  'DUES PENDING'
                )}
              </div>
            </div>

            <div style={styles.passBody}>
              <h2 style={styles.memberName}>{user.first_name} {user.last_name}</h2>
              <p style={styles.memberPlan}>{membership?.plan_name || 'Gold Annual Membership'}</p>

              <div style={styles.passMeta}>
                <div>
                  <span style={styles.metaLabel}>Dues Paid Status</span>
                  <div style={styles.metaValue}>
                    {duesPaid ? '✅ Dues Paid' : '⚠️ Pending Payment'}
                  </div>
                </div>
                <div>
                  <span style={styles.metaLabel}>Valid Until</span>
                  <div style={styles.metaValue}>
                    <Calendar size={14} /> {membership?.end_date || 'Dec 31, 2026'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Member Benefits & Discounts */}
          <div style={styles.benefitsCard}>
            <h3 style={styles.cardTitle}>
              <Sparkles size={20} color="#38bdf8" /> Your Tier Benefits & Discounts
            </h3>
            <p style={styles.cardDesc}>Included with your {membership?.plan_name}:</p>

            <div style={styles.benefitList}>
              <div style={styles.benefitBox}>
                <div style={styles.benefitIconBox}>
                  <Ticket size={24} color="#10b981" />
                </div>
                <div>
                  <h4 style={styles.benefitName}>{membership?.event_discount_percentage || 20}% Off Event Tickets</h4>
                  <p style={styles.benefitSub}>Applied automatically at ticket checkout</p>
                </div>
              </div>

              <div style={styles.benefitBox}>
                <div style={styles.benefitIconBox}>
                  <ShoppingBag size={24} color="#3b82f6" />
                </div>
                <div>
                  <h4 style={styles.benefitName}>{membership?.merchandise_discount_percentage || 15}% Off Merchandise & Gear</h4>
                  <p style={styles.benefitSub}>Valid at the campus store and online shop</p>
                </div>
              </div>

              <div style={styles.benefitBox}>
                <div style={styles.benefitIconBox}>
                  <CreditCard size={24} color="#8b5cf6" />
                </div>
                <div>
                  <h4 style={styles.benefitName}>Cafeteria & Bar Discounts</h4>
                  <p style={styles.benefitSub}>Member rates applied to food & drinks</p>
                </div>
              </div>
            </div>
          </div>
        </div>
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
    maxWidth: '1000px',
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },
  welcomeCard: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    padding: '1.5rem 2rem',
    borderRadius: '12px',
    border: '1px solid #334155',
  },
  title: {
    fontSize: '1.8rem',
    fontWeight: 'bold',
    margin: 0,
  },
  subtitle: {
    color: '#94a3b8',
    margin: '0.25rem 0 0 0',
  },
  studentIdBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    backgroundColor: '#0f172a',
    padding: '0.5rem 1rem',
    borderRadius: '8px',
    border: '1px solid #334155',
    color: '#38bdf8',
    fontSize: '0.9rem',
  },
  warningBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    border: '1px solid #f59e0b',
    padding: '1rem 1.5rem',
    borderRadius: '8px',
  },
  bannerTitle: {
    margin: 0,
    color: '#fbbf24',
    fontSize: '1rem',
    fontWeight: 'bold',
  },
  bannerDesc: {
    margin: '0.2rem 0 0 0',
    color: '#fde68a',
    fontSize: '0.85rem',
  },
  renewBtn: {
    marginLeft: 'auto',
    backgroundColor: '#f59e0b',
    color: '#0f172a',
    border: 'none',
    padding: '0.5rem 1rem',
    borderRadius: '6px',
    fontWeight: 'bold',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
    gap: '1.5rem',
  },
  passCard: {
    background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
    borderRadius: '16px',
    padding: '1.75rem',
    border: '1px solid #3b82f6',
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  passHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  passBrand: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontWeight: 'bold',
    fontSize: '0.9rem',
    color: '#cbd5e1',
    letterSpacing: '1px',
  },
  statusBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.3rem',
    color: '#ffffff',
    padding: '0.25rem 0.6rem',
    borderRadius: '12px',
    fontSize: '0.75rem',
    fontWeight: 'bold',
  },
  passBody: {
    marginTop: '2rem',
  },
  memberName: {
    fontSize: '1.75rem',
    fontWeight: 'bold',
    margin: 0,
  },
  memberPlan: {
    color: '#38bdf8',
    fontSize: '1.1rem',
    margin: '0.25rem 0 1.5rem 0',
    fontWeight: '600',
  },
  passMeta: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '1rem',
    borderTop: '1px solid #334155',
    paddingTop: '1rem',
  },
  metaLabel: {
    fontSize: '0.75rem',
    color: '#94a3b8',
    display: 'block',
  },
  metaValue: {
    fontSize: '0.9rem',
    fontWeight: '600',
    marginTop: '0.2rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.3rem',
  },
  benefitsCard: {
    backgroundColor: '#1e293b',
    borderRadius: '12px',
    padding: '1.75rem',
    border: '1px solid #334155',
  },
  cardTitle: {
    fontSize: '1.2rem',
    fontWeight: 'bold',
    margin: 0,
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  cardDesc: {
    color: '#94a3b8',
    fontSize: '0.85rem',
    margin: '0.3rem 0 1.25rem 0',
  },
  benefitList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  benefitBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    backgroundColor: '#0f172a',
    padding: '1rem',
    borderRadius: '8px',
    border: '1px solid #334155',
  },
  benefitIconBox: {
    padding: '0.6rem',
    borderRadius: '8px',
    backgroundColor: '#1e293b',
  },
  benefitName: {
    margin: 0,
    fontSize: '0.95rem',
    fontWeight: 'bold',
  },
  benefitSub: {
    margin: '0.2rem 0 0 0',
    fontSize: '0.8rem',
    color: '#94a3b8',
  },
};
