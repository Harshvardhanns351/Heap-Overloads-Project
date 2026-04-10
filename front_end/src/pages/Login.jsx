import React, { useState } from 'react';
import useAppStore from '../store';
import { Brain, GraduationCap, Shield, Eye, EyeOff } from 'lucide-react';

const ROLES = [
  { key: 'student', label: 'Student',  icon: GraduationCap, desc: 'Roadmap, mentor chat, documents' },
  { key: 'teacher', label: 'Faculty',  icon: Brain,          desc: 'Classes, analytics, risk alerts' },
  { key: 'admin',   label: 'Admin',    icon: Shield,         desc: 'Org-wide insights, user management' },
];

const DEMO_EMAILS = { student: 'rahul@college.edu', teacher: 'priya@college.edu', admin: 'admin@college.edu' };

export default function Login() {
  const login = useAppStore(s => s.login);
  const [role, setRole] = useState('student');
  const [email, setEmail] = useState(DEMO_EMAILS.student);
  const [password, setPassword] = useState('password');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRoleSelect = (key) => {
    setRole(key);
    setEmail(DEMO_EMAILS[key]);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try { await login(email, password); }
    catch (err) { alert(err.message || 'Login failed'); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ width: '100%', maxWidth: '400px' }} className="fade-in-up">

        {/* Brand */}
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Brain size={20} style={{ color: '#e0e0e0' }} />
            </div>
            <span style={{ fontSize: '22px', fontWeight: '800', fontFamily: 'Space Grotesk, sans-serif', color: '#f0f0f0' }}>Veloris</span>
          </div>
          <p style={{ fontSize: '13px', color: '#505050', margin: 0 }}>AI-powered Academic Intelligence</p>
        </div>

        {/* Card */}
        <div style={{ background: '#111111', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '28px' }}>
          <h2 style={{ margin: '0 0 4px', fontSize: '18px', fontWeight: '700', color: '#f0f0f0' }}>Sign in</h2>
          <p style={{ margin: '0 0 24px', fontSize: '12px', color: '#505050' }}>Select your role to continue</p>

          {/* Role selector */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
            {ROLES.map(r => {
              const active = role === r.key;
              return (
                <button key={r.key} type="button" onClick={() => handleRoleSelect(r.key)} style={{
                  display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px',
                  borderRadius: '9px', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                  background: active ? 'rgba(255,255,255,0.07)' : 'transparent',
                  border: `1px solid ${active ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.06)'}`,
                  transition: 'all 0.15s',
                }}
                  onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                  onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
                >
                  <div style={{ width: '32px', height: '32px', borderRadius: '7px', background: active ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <r.icon size={16} style={{ color: active ? '#e0e0e0' : '#505050' }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: active ? '#f0f0f0' : '#808080' }}>{r.label}</div>
                    <div style={{ fontSize: '11px', color: '#404040', marginTop: '1px' }}>{r.desc}</div>
                  </div>
                  <div style={{ width: '16px', height: '16px', borderRadius: '50%', border: `2px solid ${active ? '#e0e0e0' : '#303030'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {active && <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#e0e0e0' }} />}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: '600', color: '#505050', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '6px' }}>Email</label>
              <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div>
              <label style={{ fontSize: '11px', fontWeight: '600', color: '#505050', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '6px' }}>Password</label>
              <div style={{ position: 'relative' }}>
                <input className="input" type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required style={{ paddingRight: '40px' }} />
                <button type="button" onClick={() => setShowPass(v => !v)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#505050', display: 'flex' }}>
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', height: '42px', marginTop: '6px', fontSize: '13px' }}>
              {loading
                ? <div style={{ width: '16px', height: '16px', border: '2px solid rgba(0,0,0,0.2)', borderTopColor: '#0a0a0a', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                : 'Sign In'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', fontSize: '11px', color: '#303030', marginTop: '20px' }}>
          Demo credentials pre-filled
        </p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
