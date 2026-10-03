import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ShieldCheck, Lock, Mail, ArrowRight, UserCheck } from 'lucide-react';

export const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Login failed. Please check credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDemoStudent = () => {
    setEmail('john.doe@skyline.edu');
    setPassword('password123');
  };

  const handleDemoAdmin = () => {
    setEmail('contact@skyline-sa.org');
    setPassword('admin123');
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <div style={styles.iconCircle}>
            <ShieldCheck size={32} color="#3b82f6" />
          </div>
          <h2 style={styles.title}>Member & Staff Login</h2>
          <p style={styles.subtitle}>Skyline Student Association Portal</p>
        </div>

        {error && <div style={styles.errorBox}>{error}</div>}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>Email Address</label>
            <div style={styles.inputWrapper}>
              <Mail size={18} color="#94a3b8" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="student@skyline.edu"
                required
                style={styles.input}
              />
            </div>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Password</label>
            <div style={styles.inputWrapper}>
              <Lock size={18} color="#94a3b8" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={styles.input}
              />
            </div>
          </div>

          <button type="submit" disabled={submitting} style={styles.submitBtn}>
            {submitting ? 'Logging in...' : 'Sign In to Portal'} <ArrowRight size={18} />
          </button>
        </form>

        <div style={styles.demoSection}>
          <p style={styles.demoTitle}>Quick Demo Logins:</p>
          <div style={styles.demoBtns}>
            <button onClick={handleDemoStudent} type="button" style={styles.demoBtn}>
              <UserCheck size={14} /> Student Login
            </button>
            <button onClick={handleDemoAdmin} type="button" style={{ ...styles.demoBtn, backgroundColor: '#334155' }}>
              <ShieldCheck size={14} /> Admin / Staff Login
            </button>
          </div>
        </div>

        <p style={styles.footerText}>
          New to campus? <Link to="/register" style={styles.registerLink}>Sign up at Campus Table</Link>
        </p>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '85vh',
    backgroundColor: '#0f172a',
    color: '#ffffff',
    padding: '1rem',
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: '12px',
    padding: '2.5rem',
    width: '100%',
    maxWidth: '420px',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)',
    border: '1px solid #334155',
  },
  header: {
    textAlign: 'center',
    marginBottom: '2rem',
  },
  iconCircle: {
    display: 'inline-flex',
    padding: '0.85rem',
    borderRadius: '50%',
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    marginBottom: '0.5rem',
  },
  title: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    margin: '0.25rem 0',
  },
  subtitle: {
    color: '#94a3b8',
    fontSize: '0.9rem',
    margin: 0,
  },
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    border: '1px solid #ef4444',
    color: '#f87171',
    padding: '0.75rem',
    borderRadius: '6px',
    marginBottom: '1.25rem',
    fontSize: '0.85rem',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.4rem',
  },
  label: {
    fontSize: '0.85rem',
    fontWeight: '600',
    color: '#cbd5e1',
  },
  inputWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    backgroundColor: '#0f172a',
    border: '1px solid #334155',
    padding: '0.65rem 0.85rem',
    borderRadius: '6px',
  },
  input: {
    backgroundColor: 'transparent',
    border: 'none',
    color: '#ffffff',
    fontSize: '0.95rem',
    width: '100%',
    outline: 'none',
  },
  submitBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    backgroundColor: '#3b82f6',
    color: '#ffffff',
    border: 'none',
    padding: '0.8rem',
    borderRadius: '6px',
    fontSize: '1rem',
    fontWeight: 'bold',
    cursor: 'pointer',
    marginTop: '0.5rem',
  },
  demoSection: {
    marginTop: '1.5rem',
    paddingTop: '1rem',
    borderTop: '1px solid #334155',
  },
  demoTitle: {
    fontSize: '0.8rem',
    color: '#94a3b8',
    marginBottom: '0.5rem',
  },
  demoBtns: {
    display: 'flex',
    gap: '0.5rem',
  },
  demoBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.3rem',
    backgroundColor: '#0f172a',
    color: '#cbd5e1',
    border: '1px solid #334155',
    padding: '0.4rem 0.6rem',
    borderRadius: '4px',
    fontSize: '0.75rem',
    cursor: 'pointer',
    flex: 1,
    justifyContent: 'center',
  },
  footerText: {
    textAlign: 'center',
    fontSize: '0.85rem',
    color: '#94a3b8',
    marginTop: '1.5rem',
  },
  registerLink: {
    color: '#38bdf8',
    textDecoration: 'none',
    fontWeight: '600',
  },
};
