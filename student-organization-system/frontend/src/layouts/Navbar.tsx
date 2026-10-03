import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, User, LogOut, CheckCircle, Search, Sparkles } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav style={styles.nav}>
      <div style={styles.brand}>
        <ShieldCheck size={28} color="#3b82f6" />
        <Link to="/" style={styles.brandTitle}>
          Skyline Association
        </Link>
      </div>

      <div style={styles.menu}>
        {isAuthenticated ? (
          <>
            <Link to="/verify" style={styles.navLink}>
              <Search size={18} /> Event Check-in
            </Link>

            <div style={styles.userInfo}>
              <User size={18} />
              <span>{user?.first_name} {user?.last_name}</span>
              {user?.is_admin ? (
                <span style={styles.adminBadge}>ADMIN</span>
              ) : user?.membership?.dues_paid ? (
                <span style={styles.paidBadge}>
                  <CheckCircle size={14} /> Dues Paid
                </span>
              ) : (
                <span style={styles.pendingBadge}>Pending Dues</span>
              )}
            </div>

            <button onClick={handleLogout} style={styles.logoutBtn}>
              <LogOut size={16} /> Logout
            </button>
          </>
        ) : (
          <>
            <Link to="/verify" style={styles.navLink}>
              <Search size={18} /> Staff Lookup
            </Link>
            <Link to="/login" style={styles.navLink}>
              Login
            </Link>
            <Link to="/register" style={styles.primaryBtn}>
              <Sparkles size={16} /> Campus Sign-Up
            </Link>
          </>
        )}
      </div>
    </nav>
  );
};

const styles: Record<string, React.CSSProperties> = {
  nav: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1rem 2rem',
    backgroundColor: '#1e293b',
    color: '#ffffff',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  },
  brandTitle: {
    fontSize: '1.25rem',
    fontWeight: 'bold',
    color: '#ffffff',
    textDecoration: 'none',
  },
  menu: {
    display: 'flex',
    alignItems: 'center',
    gap: '1.5rem',
  },
  navLink: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    color: '#cbd5e1',
    textDecoration: 'none',
    fontWeight: '500',
    transition: 'color 0.2s',
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    backgroundColor: '#334155',
    padding: '0.4rem 0.8rem',
    borderRadius: '20px',
    fontSize: '0.9rem',
  },
  adminBadge: {
    backgroundColor: '#3b82f6',
    color: '#ffffff',
    padding: '0.1rem 0.5rem',
    borderRadius: '10px',
    fontSize: '0.75rem',
    fontWeight: '600',
  },
  paidBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.2rem',
    backgroundColor: '#10b981',
    color: '#ffffff',
    padding: '0.1rem 0.5rem',
    borderRadius: '10px',
    fontSize: '0.75rem',
    fontWeight: '600',
  },
  pendingBadge: {
    backgroundColor: '#f59e0b',
    color: '#ffffff',
    padding: '0.1rem 0.5rem',
    borderRadius: '10px',
    fontSize: '0.75rem',
    fontWeight: '600',
  },
  logoutBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    backgroundColor: '#ef4444',
    color: '#ffffff',
    border: 'none',
    padding: '0.5rem 1rem',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '600',
  },
  primaryBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    backgroundColor: '#3b82f6',
    color: '#ffffff',
    padding: '0.5rem 1rem',
    borderRadius: '6px',
    textDecoration: 'none',
    fontWeight: '600',
  },
};
