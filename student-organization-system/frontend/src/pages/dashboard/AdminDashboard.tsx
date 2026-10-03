import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  Users,
  DollarSign,
  Ticket,
  ShoppingBag,
  Megaphone,
  CheckCircle,
  AlertCircle,
  Search,
  UserCheck,
  TrendingUp,
  FileText,
  Calendar,
  Layers,
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const [memberSearch, setMemberSearch] = useState('');
  const [selectedTab, setSelectedTab] = useState<'roster' | 'events' | 'finance'>('roster');

  // Sample live roster for demo management
  const [members, setMembers] = useState([
    { id: '1', name: 'John Doe', student_id: 'SKY-89201', email: 'john.doe@skyline.edu', plan: 'Gold Annual', status: 'ACTIVE', duesPaid: true, joinDate: '2026-01-15' },
    { id: '2', name: 'Taylor Smith', student_id: 'S10293848', email: 'taylor.smith@skyline.edu', plan: 'Gold Annual', status: 'PENDING', duesPaid: false, joinDate: '2026-02-01' },
    { id: '3', name: 'Alex Administrator', student_id: 'S10293847', email: 'admin@skyline-sa.org', plan: 'Gold Annual', status: 'ACTIVE', duesPaid: true, joinDate: '2026-01-10' },
    { id: '4', name: 'Sarah Jenkins', student_id: 'SKY-44102', email: 'sarah.j@skyline.edu', plan: 'Silver Semester', status: 'ACTIVE', duesPaid: true, joinDate: '2026-02-12' },
  ]);

  const handleToggleDues = (id: string) => {
    setMembers((prev) =>
      prev.map((m) => (m.id === id ? { ...m, duesPaid: !m.duesPaid, status: !m.duesPaid ? 'ACTIVE' : 'PENDING' } : m))
    );
  };

  const filteredMembers = members.filter(
    (m) =>
      m.name.toLowerCase().includes(memberSearch.toLowerCase()) ||
      m.email.toLowerCase().includes(memberSearch.toLowerCase()) ||
      m.student_id.toLowerCase().includes(memberSearch.toLowerCase())
  );

  return (
    <div style={styles.container}>
      <div style={styles.content}>
        {/* Admin Header */}
        <div style={styles.header}>
          <div>
            <div style={styles.badgeGroup}>
              <span style={styles.adminBadge}>
                <ShieldCheck size={14} /> LEADERSHIP PORTAL
              </span>
              <span style={styles.orgBadge}>Skyline Student Association</span>
            </div>
            <h1 style={styles.title}>Executive Admin Dashboard 🏛️</h1>
            <p style={styles.subtitle}>Welcome back, {user?.first_name || 'Admin'}! Real-time club control center.</p>
          </div>
          <div style={styles.headerActions}>
            <Link to="/verify" style={styles.doorVerifyBtn}>
              <UserCheck size={18} /> Door Check-In Tool
            </Link>
          </div>
        </div>

        {/* Executive Metrics Overview */}
        <div style={styles.metricsGrid}>
          <div style={styles.metricCard}>
            <div style={styles.metricHeader}>
              <span style={styles.metricLabel}>Total Members</span>
              <div style={{ ...styles.iconBox, backgroundColor: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' }}>
                <Users size={20} />
              </div>
            </div>
            <div style={styles.metricValue}>142</div>
            <div style={styles.metricSub}>
              <span style={{ color: '#10b981', fontWeight: 'bold' }}>130 Active</span> • 12 Dues Pending
            </div>
          </div>

          <div style={styles.metricCard}>
            <div style={styles.metricHeader}>
              <span style={styles.metricLabel}>Semester Revenue</span>
              <div style={{ ...styles.iconBox, backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
                <DollarSign size={20} />
              </div>
            </div>
            <div style={styles.metricValue}>$3,850.00</div>
            <div style={styles.metricSub}>
              <span style={{ color: '#10b981', fontWeight: 'bold' }}>+18%</span> vs previous semester
            </div>
          </div>

          <div style={styles.metricCard}>
            <div style={styles.metricHeader}>
              <span style={styles.metricLabel}>Spring Gala Tickets</span>
              <div style={{ ...styles.iconBox, backgroundColor: 'rgba(139, 92, 246, 0.15)', color: '#8b5cf6' }}>
                <Ticket size={20} />
              </div>
            </div>
            <div style={styles.metricValue}>85 / 150</div>
            <div style={styles.metricSub}>
              <span style={{ color: '#38bdf8', fontWeight: 'bold' }}>56% Reserved</span> • Door verification ready
            </div>
          </div>

          <div style={styles.metricCard}>
            <div style={styles.metricHeader}>
              <span style={styles.metricLabel}>Pending Receipts</span>
              <div style={{ ...styles.iconBox, backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>
                <AlertCircle size={20} />
              </div>
            </div>
            <div style={styles.metricValue}>$145.00</div>
            <div style={styles.metricSub}>3 volunteer reimbursement claims pending</div>
          </div>
        </div>

        {/* Module Quick Jump Grid */}
        <div style={styles.quickModulesGrid}>
          <div style={styles.moduleCard}>
            <Calendar size={22} color="#38bdf8" />
            <div>
              <h4 style={styles.moduleTitle}>Spring Gala Event</h4>
              <p style={styles.moduleDesc}>Manage tickets, door check-in, and guest list</p>
            </div>
          </div>

          <div style={styles.moduleCard}>
            <Megaphone size={22} color="#10b981" />
            <div>
              <h4 style={styles.moduleTitle}>Announcements</h4>
              <p style={styles.moduleDesc}>Send broadcast message to all club members</p>
            </div>
          </div>

          <div style={styles.moduleCard}>
            <ShoppingBag size={22} color="#ec4899" />
            <div>
              <h4 style={styles.moduleTitle}>Hoodie Inventory</h4>
              <p style={styles.moduleDesc}>Stock levels: S (12), M (24), L (18), XL (8)</p>
            </div>
          </div>

          <div style={styles.moduleCard}>
            <TrendingUp size={22} color="#f59e0b" />
            <div>
              <h4 style={styles.moduleTitle}>Bake Sale Fundraiser</h4>
              <p style={styles.moduleDesc}>Volunteer tasks split & progress tracker</p>
            </div>
          </div>
        </div>

        {/* Tab Navigation & Detailed Management Panel */}
        <div style={styles.panelCard}>
          <div style={styles.panelHeader}>
            <div style={styles.tabList}>
              <button
                style={{ ...styles.tabBtn, ...(selectedTab === 'roster' ? styles.activeTabBtn : {}) }}
                onClick={() => setSelectedTab('roster')}
              >
                <Users size={16} /> Campus Member Sign-ups
              </button>
              <button
                style={{ ...styles.tabBtn, ...(selectedTab === 'events' ? styles.activeTabBtn : {}) }}
                onClick={() => setSelectedTab('events')}
              >
                <Ticket size={16} /> Events & Check-In
              </button>
              <button
                style={{ ...styles.tabBtn, ...(selectedTab === 'finance' ? styles.activeTabBtn : {}) }}
                onClick={() => setSelectedTab('finance')}
              >
                <FileText size={16} /> Treasurer Bookkeeping
              </button>
            </div>

            {selectedTab === 'roster' && (
              <div style={styles.searchWrapper}>
                <Search size={16} color="#94a3b8" />
                <input
                  type="text"
                  placeholder="Filter by name, ID or email..."
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  style={styles.searchInput}
                />
              </div>
            )}
          </div>

          {/* Roster View */}
          {selectedTab === 'roster' && (
            <div style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Student Name</th>
                    <th style={styles.th}>Student ID</th>
                    <th style={styles.th}>Email</th>
                    <th style={styles.th}>Membership Tier</th>
                    <th style={styles.th}>Dues Status</th>
                    <th style={styles.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMembers.map((m) => (
                    <tr key={m.id} style={styles.tr}>
                      <td style={styles.td}>
                        <strong>{m.name}</strong>
                      </td>
                      <td style={styles.td}>
                        <span style={styles.codeBadge}>{m.student_id}</span>
                      </td>
                      <td style={styles.td}>{m.email}</td>
                      <td style={styles.td}>{m.plan}</td>
                      <td style={styles.td}>
                        <span
                          style={{
                            ...styles.statusTag,
                            backgroundColor: m.duesPaid ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                            color: m.duesPaid ? '#34d399' : '#fbbf24',
                            border: `1px solid ${m.duesPaid ? '#10b981' : '#f59e0b'}`,
                          }}
                        >
                          {m.duesPaid ? '✅ PAID' : '⚠️ PENDING DUES'}
                        </span>
                      </td>
                      <td style={styles.td}>
                        <button onClick={() => handleToggleDues(m.id)} style={styles.actionBtn}>
                          {m.duesPaid ? 'Mark Unpaid' : 'Mark Dues Paid'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Events View */}
          {selectedTab === 'events' && (
            <div style={styles.tabContent}>
              <h3 style={{ margin: '0 0 1rem 0' }}>Spring Gala 2026 Ticket Management</h3>
              <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
                Online tickets sold: <strong>85</strong> | Door Ticket Price: <strong>$15 Member / $25 Non-Member</strong>
              </p>
              <div style={styles.eventBox}>
                <Link to="/verify" style={styles.doorVerifyBtnLarge}>
                  <UserCheck size={24} /> Launch Fast Door Scanner / Check-in Mode
                </Link>
              </div>
            </div>
          )}

          {/* Treasurer View */}
          {selectedTab === 'finance' && (
            <div style={styles.tabContent}>
              <h3 style={{ margin: '0 0 1rem 0' }}>End-of-Semester Treasurer Ledger</h3>
              <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
                Unified ledger replacing paper notebooks & spreadsheets:
              </p>
              <div style={styles.ledgerSummary}>
                <div style={styles.ledgerRow}>
                  <span>Total Dues Collected</span>
                  <span style={{ color: '#34d399', fontWeight: 'bold' }}>+$3,550.00</span>
                </div>
                <div style={styles.ledgerRow}>
                  <span>Merchandise & Hoodie Sales</span>
                  <span style={{ color: '#34d399', fontWeight: 'bold' }}>+$1,280.00</span>
                </div>
                <div style={styles.ledgerRow}>
                  <span>Volunteer Reimbursements & Expenses</span>
                  <span style={{ color: '#f87171', fontWeight: 'bold' }}>-$980.00</span>
                </div>
                <div style={{ ...styles.ledgerRow, borderTop: '2px solid #334155', paddingTop: '0.75rem' }}>
                  <strong>Net Club Balance Remaining</strong>
                  <strong style={{ color: '#38bdf8', fontSize: '1.1rem' }}>$3,850.00</strong>
                </div>
              </div>
            </div>
          )}
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
    maxWidth: '1100px',
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    padding: '1.75rem 2rem',
    borderRadius: '12px',
    border: '1px solid #334155',
    flexWrap: 'wrap',
    gap: '1rem',
  },
  badgeGroup: {
    display: 'flex',
    gap: '0.5rem',
    marginBottom: '0.5rem',
  },
  adminBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.3rem',
    backgroundColor: '#3b82f6',
    color: '#ffffff',
    padding: '0.2rem 0.6rem',
    borderRadius: '4px',
    fontSize: '0.75rem',
    fontWeight: 'bold',
  },
  orgBadge: {
    backgroundColor: '#334155',
    color: '#94a3b8',
    padding: '0.2rem 0.6rem',
    borderRadius: '4px',
    fontSize: '0.75rem',
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
  headerActions: {
    display: 'flex',
    gap: '0.75rem',
  },
  doorVerifyBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem',
    backgroundColor: '#10b981',
    color: '#ffffff',
    padding: '0.75rem 1.25rem',
    borderRadius: '8px',
    textDecoration: 'none',
    fontWeight: 'bold',
    fontSize: '0.95rem',
    boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.3)',
  },
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '1rem',
  },
  metricCard: {
    backgroundColor: '#1e293b',
    padding: '1.25rem',
    borderRadius: '12px',
    border: '1px solid #334155',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  metricHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metricLabel: {
    color: '#94a3b8',
    fontSize: '0.85rem',
    fontWeight: '600',
  },
  iconBox: {
    padding: '0.5rem',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricValue: {
    fontSize: '1.8rem',
    fontWeight: 'bold',
    margin: '0.5rem 0 0.25rem 0',
  },
  metricSub: {
    fontSize: '0.75rem',
    color: '#cbd5e1',
  },
  quickModulesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '1rem',
  },
  moduleCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    backgroundColor: '#1e293b',
    padding: '1rem 1.25rem',
    borderRadius: '10px',
    border: '1px solid #334155',
  },
  moduleTitle: {
    margin: 0,
    fontSize: '0.95rem',
    fontWeight: 'bold',
  },
  moduleDesc: {
    margin: '0.2rem 0 0 0',
    fontSize: '0.75rem',
    color: '#94a3b8',
  },
  panelCard: {
    backgroundColor: '#1e293b',
    borderRadius: '12px',
    border: '1px solid #334155',
    overflow: 'hidden',
  },
  panelHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1rem 1.5rem',
    borderBottom: '1px solid #334155',
    flexWrap: 'wrap',
    gap: '1rem',
  },
  tabList: {
    display: 'flex',
    gap: '0.5rem',
  },
  tabBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    backgroundColor: 'transparent',
    border: 'none',
    color: '#94a3b8',
    padding: '0.5rem 0.85rem',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '0.85rem',
  },
  activeTabBtn: {
    backgroundColor: '#0f172a',
    color: '#38bdf8',
    border: '1px solid #334155',
  },
  searchWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    backgroundColor: '#0f172a',
    border: '1px solid #334155',
    padding: '0.4rem 0.75rem',
    borderRadius: '6px',
  },
  searchInput: {
    backgroundColor: 'transparent',
    border: 'none',
    color: '#ffffff',
    outline: 'none',
    fontSize: '0.85rem',
    width: '200px',
  },
  tableWrapper: {
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left',
  },
  th: {
    backgroundColor: '#0f172a',
    color: '#94a3b8',
    padding: '0.85rem 1.25rem',
    fontSize: '0.8rem',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  tr: {
    borderBottom: '1px solid #334155',
  },
  td: {
    padding: '1rem 1.25rem',
    fontSize: '0.9rem',
  },
  codeBadge: {
    backgroundColor: '#0f172a',
    color: '#38bdf8',
    padding: '0.2rem 0.5rem',
    borderRadius: '4px',
    fontSize: '0.8rem',
    fontFamily: 'monospace',
    border: '1px solid #334155',
  },
  statusTag: {
    display: 'inline-block',
    padding: '0.2rem 0.5rem',
    borderRadius: '4px',
    fontSize: '0.75rem',
    fontWeight: 'bold',
  },
  actionBtn: {
    backgroundColor: '#334155',
    color: '#cbd5e1',
    border: 'none',
    padding: '0.4rem 0.75rem',
    borderRadius: '4px',
    fontSize: '0.75rem',
    fontWeight: '600',
    cursor: 'pointer',
  },
  tabContent: {
    padding: '1.5rem',
  },
  eventBox: {
    marginTop: '1.5rem',
    textAlign: 'center',
  },
  doorVerifyBtnLarge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.75rem',
    backgroundColor: '#10b981',
    color: '#ffffff',
    padding: '1rem 2rem',
    borderRadius: '10px',
    textDecoration: 'none',
    fontWeight: 'bold',
    fontSize: '1.1rem',
  },
  ledgerSummary: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.85rem',
    backgroundColor: '#0f172a',
    padding: '1.25rem',
    borderRadius: '8px',
    marginTop: '1rem',
  },
  ledgerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.95rem',
  },
};
