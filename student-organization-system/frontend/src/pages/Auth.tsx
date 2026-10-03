import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../store/store';

export function Login() {
  const { login } = useApp(); const nav = useNavigate();
  const [e, setE] = useState(''); const [p, setP] = useState(''); const [err, setErr] = useState('');
  const go = (em: string, pw: string) => { const r = login(em, pw); if (!r.ok) setErr(r.msg); else nav('/'); };
  return (
    <div className="auth"><div className="card">
      <h1>Skyline</h1><p className="mut">Student Association — sign in to continue</p>
      <label>Email</label><input value={e} onChange={x => setE(x.target.value)} placeholder="you@skyline.edu" />
      <label>Password</label><input type="password" value={p} onChange={x => setP(x.target.value)} onKeyDown={k => k.key === 'Enter' && go(e, p)} />
      {err && <div className="err">{err}</div>}
      <button className="pri" style={{ width: '100%', marginTop: 18 }} onClick={() => go(e, p)}>Sign in</button>
      <p className="sans" style={{ fontSize: 13 }}>New here? <Link to="/register">Join the club</Link></p>
      <div className="card sans" style={{ background: 'var(--soft)', fontSize: 13, marginTop: 14 }}>
        <b>Demo accounts</b>
        <div className="row sp" style={{ marginTop: 8 }}><span>Admin / Treasurer</span><button className="sm" onClick={() => go('admin@skyline.edu', 'admin123')}>Use</button></div>
        <div className="row sp" style={{ marginTop: 6 }}><span>Member (Riya)</span><button className="sm" onClick={() => go('riya@skyline.edu', 'member123')}>Use</button></div>
      </div>
    </div></div>
  );
}

export function Register() {
  const { register } = useApp(); const nav = useNavigate();
  const [f, setF] = useState({ name: '', email: '', password: '', studentId: '', phone: '' }); const [err, setErr] = useState('');
  const set = (k: string, v: string) => setF({ ...f, [k]: v });
  const go = () => {
    if (!f.name.trim()) return setErr('Please enter your full name.');
    if (!/^\S+@\S+\.\S+$/.test(f.email)) return setErr('Please enter a valid email.');
    if (f.password.length < 6) return setErr('Password must be at least 6 characters.');
    const r = register(f); if (!r.ok) setErr(r.msg); else nav('/membership');
  };
  return (
    <div className="auth"><div className="card">
      <h1>Join Skyline</h1><p className="mut">Create your account, then pick a membership.</p>
      <label>Full name</label><input value={f.name} onChange={e => set('name', e.target.value)} />
      <label>College email</label><input value={f.email} onChange={e => set('email', e.target.value)} />
      <label>Student ID (optional)</label><input value={f.studentId} onChange={e => set('studentId', e.target.value)} />
      <label>Phone</label><input value={f.phone} onChange={e => set('phone', e.target.value)} />
      <label>Password</label><input type="password" value={f.password} onChange={e => set('password', e.target.value)} />
      {err && <div className="err">{err}</div>}
      <button className="pri" style={{ width: '100%', marginTop: 18 }} onClick={go}>Create account</button>
      <p className="sans" style={{ fontSize: 13 }}>Already a member? <Link to="/login">Sign in</Link></p>
    </div></div>
  );
}
