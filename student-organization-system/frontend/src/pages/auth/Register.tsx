import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { Sparkles, Ticket, ShoppingBag, ArrowRight } from 'lucide-react';

interface MembershipPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  duration_months: number;
  event_discount_percentage: number;
  merchandise_discount_percentage: number;
}

export const Register: React.FC = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    studentId: '',
    phone: '',
    password: '',
    duesPaid: true,
  });

  const [error, setError] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    api.get('/auth/plans')
      .then((res) => {
        setPlans(res.data);
        if (res.data.length > 0) {
          setSelectedPlanId(res.data[0].id);
        }
      })
      .catch(() => {
        // Fallback plans if backend loading delay
        setPlans([
          {
            id: '1',
            name: 'Gold Annual Membership',
            description: 'Full annual access with priority seating & maximum discounts',
            price: 25.0,
            duration_months: 12,
            event_discount_percentage: 20,
            merchandise_discount_percentage: 15,
          },
          {
            id: '2',
            name: 'Silver Standard Membership',
            description: 'Standard access with 10% event & 5% merch discounts',
            price: 15.0,
            duration_months: 12,
            event_discount_percentage: 10,
            merchandise_discount_percentage: 5,
          },
          {
            id: '3',
            name: 'Junior Discounted Membership',
            description: 'Under 18 student discount with 15% event discount',
            price: 10.0,
            duration_months: 12,
            event_discount_percentage: 15,
            merchandise_discount_percentage: 10,
          },
        ]);
      });
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.email || !formData.password || !formData.firstName || !formData.studentId) {
      setError('Please fill out all required student fields.');
      return;
    }

    setSubmitting(true);
    try {
      await register({
        email: formData.email,
        password: formData.password,
        first_name: formData.firstName,
        last_name: formData.lastName,
        student_id: formData.studentId,
        phone: formData.phone,
        membership_plan_id: selectedPlanId,
        dues_paid: formData.duesPaid,
      });
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Registration failed. Please check details.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <div style={styles.iconCircle}>
            <Sparkles size={28} color="#3b82f6" />
          </div>
          <h2 style={styles.title}>Campus Table Sign-Up</h2>
          <p style={styles.subtitle}>Register new student & activate association membership</p>
        </div>

        {error && <div style={styles.errorBox}>{error}</div>}

        <form onSubmit={handleSubmit} style={styles.form}>
          <h3 style={styles.sectionTitle}>1. Student Identification</h3>
          <div style={styles.row}>
            <div style={styles.field}>
              <label style={styles.label}>First Name *</label>
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                placeholder="e.g. Alex"
                required
                style={styles.input}
              />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Last Name *</label>
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                placeholder="e.g. Rivera"
                required
                style={styles.input}
              />
            </div>
          </div>

          <div style={styles.row}>
            <div style={styles.field}>
              <label style={styles.label}>Student ID Number *</label>
              <input
                type="text"
                name="studentId"
                value={formData.studentId}
                onChange={handleChange}
                placeholder="e.g. SKY-89201"
                required
                style={styles.input}
              />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Phone Number</label>
              <input
                type="text"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="+1-555-019-2831"
                style={styles.input}
              />
            </div>
          </div>

          <div style={styles.row}>
            <div style={styles.field}>
              <label style={styles.label}>Campus Email *</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="student@skyline.edu"
                required
                style={styles.input}
              />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Account Password *</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Minimum 6 characters"
                required
                style={styles.input}
              />
            </div>
          </div>

          <h3 style={styles.sectionTitle}>2. Choose Membership Tier</h3>
          <div style={styles.planGrid}>
            {plans.map((p) => {
              const isSelected = selectedPlanId === p.id;
              return (
                <div
                  key={p.id}
                  onClick={() => setSelectedPlanId(p.id)}
                  style={{
                    ...styles.planCard,
                    borderColor: isSelected ? '#3b82f6' : '#334155',
                    backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.1)' : '#1e293b',
                  }}
                >
                  <div style={styles.planHeader}>
                    <h4 style={styles.planName}>{p.name}</h4>
                    <span style={styles.planPrice}>${p.price.toFixed(2)}/yr</span>
                  </div>
                  <p style={styles.planDesc}>{p.description}</p>
                  <div style={styles.benefits}>
                    <div style={styles.benefitItem}>
                      <Ticket size={14} color="#10b981" />
                      <span>{p.event_discount_percentage}% Ticket Discount</span>
                    </div>
                    <div style={styles.benefitItem}>
                      <ShoppingBag size={14} color="#10b981" />
                      <span>{p.merchandise_discount_percentage}% Merch Discount</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <h3 style={styles.sectionTitle}>3. Dues & Payment Status</h3>
          <div style={styles.duesBox}>
            <label style={styles.checkboxLabel}>
              <input
                type="checkbox"
                name="duesPaid"
                checked={formData.duesPaid}
                onChange={handleChange}
                style={styles.checkbox}
              />
              <span style={{ fontWeight: 600 }}>Dues Paid at Campus Table</span> (Mark as Active immediately)
            </label>
          </div>

          <button type="submit" disabled={submitting} style={styles.submitBtn}>
            {submitting ? 'Registering...' : 'Complete Sign-Up & Activate Membership'} <ArrowRight size={18} />
          </button>

          <p style={styles.footerText}>
            Already registered? <Link to="/login" style={styles.loginLink}>Login to Profile</Link>
          </p>
        </form>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    padding: '2rem 1rem',
    minHeight: '90vh',
    backgroundColor: '#0f172a',
    color: '#ffffff',
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: '12px',
    padding: '2rem',
    width: '100%',
    maxWidth: '750px',
    boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3)',
    border: '1px solid #334155',
  },
  header: {
    textAlign: 'center',
    marginBottom: '2rem',
  },
  iconCircle: {
    display: 'inline-flex',
    padding: '0.75rem',
    borderRadius: '50%',
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    marginBottom: '0.5rem',
  },
  title: {
    fontSize: '1.75rem',
    fontWeight: 'bold',
    margin: '0.25rem 0',
  },
  subtitle: {
    color: '#94a3b8',
    margin: 0,
  },
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    border: '1px solid #ef4444',
    color: '#f87171',
    padding: '0.75rem',
    borderRadius: '6px',
    marginBottom: '1.5rem',
    fontSize: '0.9rem',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
  },
  sectionTitle: {
    fontSize: '1.1rem',
    color: '#38bdf8',
    borderBottom: '1px solid #334155',
    paddingBottom: '0.4rem',
    marginTop: '0.5rem',
  },
  row: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '1rem',
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
  input: {
    backgroundColor: '#0f172a',
    border: '1px solid #334155',
    color: '#ffffff',
    padding: '0.65rem 0.85rem',
    borderRadius: '6px',
    fontSize: '0.95rem',
    outline: 'none',
  },
  planGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
    gap: '1rem',
  },
  planCard: {
    padding: '1rem',
    borderRadius: '8px',
    border: '2px solid #334155',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  planHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.4rem',
  },
  planName: {
    fontSize: '0.95rem',
    fontWeight: 'bold',
    margin: 0,
  },
  planPrice: {
    fontSize: '0.9rem',
    fontWeight: 'bold',
    color: '#10b981',
  },
  planDesc: {
    fontSize: '0.8rem',
    color: '#94a3b8',
    margin: '0 0 0.5rem 0',
  },
  benefits: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.2rem',
  },
  benefitItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    fontSize: '0.75rem',
    color: '#cbd5e1',
  },
  duesBox: {
    backgroundColor: '#0f172a',
    padding: '0.75rem 1rem',
    borderRadius: '6px',
    border: '1px solid #334155',
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.9rem',
    color: '#e2e8f0',
    cursor: 'pointer',
  },
  checkbox: {
    width: '18px',
    height: '18px',
    cursor: 'pointer',
  },
  submitBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    backgroundColor: '#3b82f6',
    color: '#ffffff',
    border: 'none',
    padding: '0.85rem',
    borderRadius: '6px',
    fontSize: '1rem',
    fontWeight: 'bold',
    cursor: 'pointer',
    marginTop: '1rem',
  },
  footerText: {
    textAlign: 'center',
    fontSize: '0.9rem',
    color: '#94a3b8',
  },
  loginLink: {
    color: '#38bdf8',
    textDecoration: 'none',
    fontWeight: '600',
  },
};
