import React, { useMemo, useState } from 'react';
import zxcvbn from 'zxcvbn';
import useAppStore from '../store';
import { buildApiUrl, api } from '../api';
import { Brain, Eye, EyeOff, Mail, KeyRound, ShieldCheck } from 'lucide-react';

const passwordLevels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];
const strengthColors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6'];

export default function Login() {
  const login = useAppStore((s) => s.login);
  const [mode, setMode] = useState('login');
  const [showPass, setShowPass] = useState(false);
  const [email, setEmail] = useState('rahul@college.edu');
  const [password, setPassword] = useState('password');
  const [name, setName] = useState('');
  const [magicEmail, setMagicEmail] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const passwordScore = useMemo(() => {
    if (mode !== 'signup' || !password) return null;
    return zxcvbn(password).score;
  }, [mode, password]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      if (mode === 'login') {
        await login(email, password);
      } else if (mode === 'signup') {
        const data = await api.auth.signup(name, email, password);
        setMessage(data.message || 'Verification email sent');
        setMode('login');
      } else if (mode === 'magic') {
        const data = await api.auth.sendMagicLink(magicEmail);
        setMessage(data.message || 'Magic link sent');
      } else if (mode === 'forgot') {
        const data = await api.auth.forgotPassword(resetEmail);
        setMessage(data.message || 'Reset email sent');
      }
    } catch (err) {
      setMessage(err.message || 'Request failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = () => {
    window.location.href = buildApiUrl('/auth/google');
  };

  return (
    <div className="min-h-screen bg-[#07111f] text-white flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.18),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(34,197,94,0.14),transparent_28%)]" />
      <div className="absolute inset-0 bg-[url('/noise.svg')] opacity-20 mix-blend-soft-light" />

      <div className="w-full max-w-md premium-card p-8 relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-3 px-5 py-3 rounded-2xl bg-white/5 border border-white/10">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-emerald-400 flex items-center justify-center">
              <Brain size={22} />
            </div>
            <span className="text-3xl font-space font-bold">EduPulse</span>
          </div>
          <p className="text-slate-300 text-sm">Modern auth upgrade: Google first, magic link second, password flow polished.</p>
        </div>

        <div className="grid grid-cols-4 gap-2 mb-6 text-xs">
          {[
            ['login', 'Sign In'],
            ['signup', 'Sign Up'],
            ['magic', 'Email Link'],
            ['forgot', 'Reset'],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                setMode(key);
                setMessage('');
              }}
              className={`rounded-xl px-3 py-2 border transition ${mode === key ? 'bg-white text-slate-900 border-white' : 'bg-white/5 border-white/10 text-slate-300'}`}
            >
              {label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={handleGoogle}
          className="w-full rounded-2xl border border-white/10 bg-white text-slate-900 font-semibold h-12 flex items-center justify-center gap-3 mb-4"
        >
          <ShieldCheck size={18} />
          Continue With Google
        </button>

        <div className="text-center text-xs text-slate-400 mb-4">or use another sign-in path</div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {mode === 'signup' && (
            <input className="input-premium" placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} required />
          )}

          {(mode === 'login' || mode === 'signup') && (
            <>
              <div>
                <label className="text-xs uppercase tracking-wider text-slate-400 mb-2 block">Email</label>
                <input className="input-premium" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div>
                <label className="text-xs uppercase tracking-wider text-slate-400 mb-2 block">Password</label>
                <div className="relative">
                  <input
                    className="input-premium pr-12"
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button type="button" onClick={() => setShowPass((v) => !v)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                    {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {mode === 'signup' && passwordScore !== null && (
                  <div className="mt-3">
                    <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                      <div className="h-full transition-all" style={{ width: `${(passwordScore + 1) * 20}%`, background: strengthColors[passwordScore] }} />
                    </div>
                    <div className="text-xs mt-2" style={{ color: strengthColors[passwordScore] }}>
                      Password strength: {passwordLevels[passwordScore]}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {mode === 'magic' && (
            <input className="input-premium" type="email" placeholder="Enter email for a magic link" value={magicEmail} onChange={(e) => setMagicEmail(e.target.value)} required />
          )}

          {mode === 'forgot' && (
            <input className="input-premium" type="email" placeholder="Enter email to reset password" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} required />
          )}

          <button className="btn-premium h-[52px] mt-2" type="submit" disabled={loading} style={{ background: 'linear-gradient(135deg, #0ea5e9, #22c55e)' }}>
            {loading ? 'Working...' : mode === 'login' ? 'Sign In' : mode === 'signup' ? 'Create Account' : mode === 'magic' ? 'Send Magic Link' : 'Send Reset Link'}
          </button>
        </form>

        {message && (
          <div className="mt-4 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200">
            {message}
          </div>
        )}

        <div className="mt-6 text-xs text-slate-400 flex items-center gap-2">
          <Mail size={14} /> Email verification and reset links use backend mail config.
        </div>
        <div className="mt-2 text-xs text-slate-500 flex items-center gap-2">
          <KeyRound size={14} /> Demo sign-in still works for seeded accounts after backend restart.
        </div>
      </div>
    </div>
  );
}
