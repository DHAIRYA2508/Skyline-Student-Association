import { useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../store/store';

// ─── Validation helpers ──────────────────────────────────────────────────────

const EMAIL_RE = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;

function validateEmail(v: string): string {
  if (!v.trim()) return 'Email is required.';
  if (!EMAIL_RE.test(v.trim())) return 'Enter a valid email address (e.g. you@skyline.edu).';
  return '';
}

function validatePassword(v: string, minLen = 8): string {
  if (!v) return 'Password is required.';
  if (v.length < minLen) return `Password must be at least ${minLen} characters.`;
  if (v.length > 128) return 'Password must not exceed 128 characters.';
  if (!/[A-Za-z]/.test(v)) return 'Password must contain at least one letter.';
  if (!/\d/.test(v)) return 'Password must contain at least one number.';
  return '';
}

function validateName(v: string): string {
  if (!v.trim()) return 'Full name is required.';
  if (v.trim().length < 2) return 'Name must be at least 2 characters.';
  if (v.trim().length > 100) return 'Name must not exceed 100 characters.';
  if (!/^[a-zA-Z\s'\-.]+$/.test(v.trim())) return "Name may only contain letters, spaces, hyphens, or apostrophes.";
  return '';
}

function validatePhone(v: string): string {
  if (!v.trim()) return ''; // optional
  const stripped = v.replace(/[\s\-().+]/g, '');
  if (!/^\d{7,15}$/.test(stripped)) return 'Enter a valid phone number (7–15 digits).';
  return '';
}

function validateStudentId(v: string): string {
  if (!v.trim()) return ''; // optional
  if (v.trim().length < 2) return 'Student ID must be at least 2 characters.';
  if (v.trim().length > 50) return 'Student ID must not exceed 50 characters.';
  return '';
}

// ─── FieldError component ────────────────────────────────────────────────────

function FieldError({ msg }: { msg: string }) {
  if (!msg) return null;
  return (
    <div
      role="alert"
      style={{
        color: 'var(--bad)',
        fontSize: 12,
        marginTop: 4,
        fontFamily: 'Arial, sans-serif',
        display: 'flex',
        alignItems: 'center',
        gap: 5,
      }}
    >
      <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
        <circle cx="8" cy="8" r="7.5" stroke="currentColor" />
        <path d="M8 4.5v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="8" cy="11" r=".75" fill="currentColor" />
      </svg>
      {msg}
    </div>
  );
}

// ─── Styled input with validation coloring ───────────────────────────────────

interface StyledInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  touched?: boolean;
}

function StyledInput({ error, touched, style, ...rest }: StyledInputProps) {
  const hasError = touched && !!error;
  const isOk = touched && !error && !!(rest.value as string)?.trim();
  return (
    <input
      {...rest}
      aria-invalid={hasError ? 'true' : undefined}
      style={{
        ...style,
        borderColor: hasError ? 'var(--bad)' : isOk ? 'var(--ok)' : undefined,
        outline: hasError ? '2px solid #f3dcd4' : isOk ? '2px solid #d9ead9' : undefined,
      }}
    />
  );
}

// ─── Show/hide password toggle ───────────────────────────────────────────────

function PwdToggle({ show, onToggle }: { show: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      aria-label={show ? 'Hide password' : 'Show password'}
      onClick={onToggle}
      style={{
        position: 'absolute', right: 9, top: '50%', transform: 'translateY(-50%)',
        border: 'none', background: 'transparent', padding: '2px 4px',
        cursor: 'pointer', color: 'var(--mute)', fontSize: 13, lineHeight: 1,
      }}
    >
      {show ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
          <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
          <line x1="1" y1="1" x2="23" y2="23" />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      )}
    </button>
  );
}

// ─── Server error banner ─────────────────────────────────────────────────────

function ServerErrorBanner({ msg }: { msg: string }) {
  if (!msg) return null;
  return (
    <div
      role="alert"
      className="res bad"
      style={{ marginBottom: 16, fontSize: 13, display: 'flex', alignItems: 'center', gap: 7 }}
    >
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
        <circle cx="8" cy="8" r="7.5" stroke="currentColor" />
        <path d="M5.5 5.5l5 5M10.5 5.5l-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      {msg}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOGIN
// ═══════════════════════════════════════════════════════════════════════════════

export function Login() {
  const { login } = useApp();
  const nav = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [touched, setTouched] = useState({ email: false, password: false });
  const [serverErr, setServerErr] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  const errors = {
    email: validateEmail(email),
    password: password.trim() ? '' : 'Password is required.',
  };

  const touch = (field: keyof typeof touched) => setTouched(t => ({ ...t, [field]: true }));
  const touchAll = () => setTouched({ email: true, password: true });

  const handleSubmit = useCallback(async () => {
    touchAll();
    setServerErr('');
    if (errors.email || errors.password) return;
    setLoading(true);
    try {
      await login(email.trim(), password);
      nav('/');
    } catch (e: unknown) {
      setServerErr(e instanceof Error ? e.message : 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [email, password, errors, login, nav]);

  const quickLogin = async (em: string, pw: string) => {
    setServerErr('');
    setLoading(true);
    try {
      await login(em, pw);
      nav('/');
    } catch (e: unknown) {
      setServerErr(e instanceof Error ? e.message : 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth">
      <div className="card" style={{ width: '100%', maxWidth: 420, padding: 32 }}>
        <h1 style={{ marginBottom: 4 }}>Skyline</h1>
        <p className="mut" style={{ marginBottom: 24 }}>Student Association — sign in to continue</p>

        <ServerErrorBanner msg={serverErr} />

        {/* Email */}
        <label htmlFor="login-email">Email</label>
        <StyledInput
          id="login-email"
          type="email"
          autoComplete="email"
          placeholder="you@skyline.edu"
          value={email}
          onChange={e => { setEmail(e.target.value); setServerErr(''); }}
          onBlur={() => touch('email')}
          error={errors.email}
          touched={touched.email}
        />
        <FieldError msg={touched.email ? errors.email : ''} />

        {/* Password */}
        <label htmlFor="login-password" style={{ marginTop: 14 }}>Password</label>
        <div style={{ position: 'relative' }}>
          <StyledInput
            id="login-password"
            type={showPwd ? 'text' : 'password'}
            autoComplete="current-password"
            placeholder="Your password"
            value={password}
            onChange={e => { setPassword(e.target.value); setServerErr(''); }}
            onBlur={() => touch('password')}
            onKeyDown={k => k.key === 'Enter' && handleSubmit()}
            error={errors.password}
            touched={touched.password}
            style={{ paddingRight: 38 }}
          />
          <PwdToggle show={showPwd} onToggle={() => setShowPwd(s => !s)} />
        </div>
        <FieldError msg={touched.password ? errors.password : ''} />

        {/* Submit */}
        <button
          id="login-submit"
          className="pri"
          style={{ width: '100%', marginTop: 22 }}
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </button>

        <p className="sans" style={{ fontSize: 13, marginTop: 14 }}>
          New here? <Link to="/register">Join the club</Link>
        </p>

        {/* Demo accounts */}
        <div className="card sans" style={{ background: 'var(--soft)', fontSize: 13, marginTop: 14 }}>
          <b>Demo accounts</b>
          <div className="row sp" style={{ marginTop: 8 }}>
            <span>Admin / Treasurer</span>
            <button className="sm" onClick={() => quickLogin('admin@skyline.edu', 'admin123')}>Use</button>
          </div>
          <div className="row sp" style={{ marginTop: 6 }}>
            <span>Member (Riya)</span>
            <button className="sm" onClick={() => quickLogin('riya@skyline.edu', 'member123')}>Use</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// REGISTER
// ═══════════════════════════════════════════════════════════════════════════════

interface RegForm {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  studentId: string;
  phone: string;
}

type RegTouched = Record<keyof RegForm, boolean>;

const INITIAL_FORM: RegForm = { name: '', email: '', password: '', confirmPassword: '', studentId: '', phone: '' };
const INITIAL_TOUCHED: RegTouched = { name: false, email: false, password: false, confirmPassword: false, studentId: false, phone: false };

function pwdStrength(p: string) {
  if (!p) return null;
  let score = 0;
  if (p.length >= 8) score++;
  if (p.length >= 12) score++;
  if (/[A-Z]/.test(p)) score++;
  if (/\d/.test(p)) score++;
  if (/[^A-Za-z0-9]/.test(p)) score++;
  if (score <= 1) return { label: 'Weak', color: 'var(--bad)', width: '25%' };
  if (score <= 2) return { label: 'Fair', color: 'var(--warn)', width: '50%' };
  if (score <= 3) return { label: 'Good', color: '#7dbb6e', width: '75%' };
  return { label: 'Strong', color: 'var(--ok)', width: '100%' };
}

export function Register() {
  const { register } = useApp();
  const nav = useNavigate();

  const [form, setForm] = useState<RegForm>(INITIAL_FORM);
  const [touched, setTouched] = useState<RegTouched>(INITIAL_TOUCHED);
  const [serverErr, setServerErr] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const set = (k: keyof RegForm, v: string) => { setForm(f => ({ ...f, [k]: v })); setServerErr(''); };
  const touch = (k: keyof RegTouched) => setTouched(t => ({ ...t, [k]: true }));
  const touchAll = () =>
    setTouched({ name: true, email: true, password: true, confirmPassword: true, studentId: true, phone: true });

  const errors: Record<keyof RegForm, string> = {
    name: validateName(form.name),
    email: validateEmail(form.email),
    password: validatePassword(form.password, 8),
    confirmPassword: !form.confirmPassword
      ? 'Please confirm your password.'
      : form.confirmPassword !== form.password
        ? 'Passwords do not match.'
        : '',
    studentId: validateStudentId(form.studentId),
    phone: validatePhone(form.phone),
  };

  const isFormValid = Object.values(errors).every(e => !e);
  const strength = pwdStrength(form.password);

  const handleSubmit = useCallback(async () => {
    touchAll();
    setServerErr('');
    if (!isFormValid) return;
    setLoading(true);
    try {
      await register({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        studentId: form.studentId.trim(),
        phone: form.phone.trim(),
      });
      nav('/membership');
    } catch (e: unknown) {
      setServerErr(e instanceof Error ? e.message : 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [form, isFormValid, register, nav]);


  return (
    <div className="auth" style={{ alignItems: 'flex-start', paddingTop: 40, paddingBottom: 40 }}>
      <div className="card" style={{ width: '100%', maxWidth: 440, padding: 32 }}>
        <h1 style={{ marginBottom: 4 }}>Join Skyline</h1>
        <p className="mut" style={{ marginBottom: 24 }}>Create your account, then pick a membership.</p>

        <ServerErrorBanner msg={serverErr} />

        {/* Full name */}
        <label htmlFor="reg-name">
          Full name <span style={{ color: 'var(--bad)' }}>*</span>
        </label>
        <StyledInput
          id="reg-name"
          type="text"
          autoComplete="name"
          placeholder="e.g. Aarav Mehta"
          value={form.name}
          onChange={e => set('name', e.target.value)}
          onBlur={() => touch('name')}
          error={errors.name}
          touched={touched.name}
        />
        <FieldError msg={touched.name ? errors.name : ''} />

        {/* College email */}
        <label htmlFor="reg-email" style={{ marginTop: 14 }}>
          College email <span style={{ color: 'var(--bad)' }}>*</span>
        </label>
        <StyledInput
          id="reg-email"
          type="email"
          autoComplete="email"
          placeholder="you@skyline.edu"
          value={form.email}
          onChange={e => set('email', e.target.value)}
          onBlur={() => touch('email')}
          error={errors.email}
          touched={touched.email}
        />
        <FieldError msg={touched.email ? errors.email : ''} />

        {/* Student ID */}
        <label htmlFor="reg-student-id" style={{ marginTop: 14 }}>
          Student ID{' '}
          <span style={{ color: 'var(--mute)', fontWeight: 400, fontSize: 11 }}>(optional)</span>
        </label>
        <StyledInput
          id="reg-student-id"
          type="text"
          autoComplete="off"
          placeholder="e.g. SKY-1042"
          value={form.studentId}
          onChange={e => set('studentId', e.target.value)}
          onBlur={() => touch('studentId')}
          error={errors.studentId}
          touched={touched.studentId}
        />
        <FieldError msg={touched.studentId ? errors.studentId : ''} />

        {/* Phone */}
        <label htmlFor="reg-phone" style={{ marginTop: 14 }}>
          Phone{' '}
          <span style={{ color: 'var(--mute)', fontWeight: 400, fontSize: 11 }}>(optional)</span>
        </label>
        <StyledInput
          id="reg-phone"
          type="tel"
          autoComplete="tel"
          placeholder="e.g. +91 98000 00000"
          value={form.phone}
          onChange={e => set('phone', e.target.value)}
          onBlur={() => touch('phone')}
          error={errors.phone}
          touched={touched.phone}
        />
        <FieldError msg={touched.phone ? errors.phone : ''} />

        {/* Password */}
        <label htmlFor="reg-password" style={{ marginTop: 14 }}>
          Password <span style={{ color: 'var(--bad)' }}>*</span>
        </label>
        <div style={{ position: 'relative' }}>
          <StyledInput
            id="reg-password"
            type={showPwd ? 'text' : 'password'}
            autoComplete="new-password"
            placeholder="Min. 8 chars with a number"
            value={form.password}
            onChange={e => set('password', e.target.value)}
            onBlur={() => touch('password')}
            error={errors.password}
            touched={touched.password}
            style={{ paddingRight: 38 }}
          />
          <PwdToggle show={showPwd} onToggle={() => setShowPwd(s => !s)} />
        </div>
        <FieldError msg={touched.password ? errors.password : ''} />

        {/* Password strength bar */}
        {form.password && strength && (
          <div style={{ marginTop: 6 }}>
            <div style={{ height: 5, borderRadius: 9, background: 'var(--soft)', overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  width: strength.width,
                  background: strength.color,
                  transition: 'width 0.3s ease, background 0.3s ease',
                  borderRadius: 9,
                }}
              />
            </div>
            <span style={{ fontSize: 11, color: strength.color, fontFamily: 'Arial', marginTop: 2, display: 'block' }}>
              {strength.label} password
            </span>
          </div>
        )}

        {/* Confirm Password */}
        <label htmlFor="reg-confirm-password" style={{ marginTop: 14 }}>
          Confirm password <span style={{ color: 'var(--bad)' }}>*</span>
        </label>
        <div style={{ position: 'relative' }}>
          <StyledInput
            id="reg-confirm-password"
            type={showConfirm ? 'text' : 'password'}
            autoComplete="new-password"
            placeholder="Re-enter your password"
            value={form.confirmPassword}
            onChange={e => set('confirmPassword', e.target.value)}
            onBlur={() => touch('confirmPassword')}
            onKeyDown={k => k.key === 'Enter' && handleSubmit()}
            error={errors.confirmPassword}
            touched={touched.confirmPassword}
            style={{ paddingRight: 38 }}
          />
          <PwdToggle show={showConfirm} onToggle={() => setShowConfirm(s => !s)} />
        </div>
        <FieldError msg={touched.confirmPassword ? errors.confirmPassword : ''} />

        {/* Submit */}
        <button
          id="reg-submit"
          className="pri"
          style={{ width: '100%', marginTop: 24 }}
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? 'Creating account…' : 'Create account'}
        </button>

        <p className="sans" style={{ fontSize: 13, marginTop: 14 }}>
          Already a member? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
