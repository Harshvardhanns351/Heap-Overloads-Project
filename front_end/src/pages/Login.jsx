import React, { useState, useEffect } from 'react';
import { useSignIn } from '@clerk/react';
import useAppStore from '../store';
import logo from '../assets/veloris-logo.png';
import { Brain, Map, Eye, EyeOff, Loader2 } from 'lucide-react';

const API = 'http://localhost:8000/api';

const DEMO = [
  { label: 'Student', email: 'rahul@college.edu' },
  { label: 'Faculty', email: 'priya@college.edu' },
  { label: 'Admin',   email: 'admin@college.edu' },
];

// Google icon SVG
function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

export default function Login() {
  const { setAuth } = useAppStore();
  const { signIn, isLoaded: clerkLoaded } = useSignIn();

  const [email,       setEmail]       = useState('rahul@college.edu');
  const [password,    setPassword]    = useState('password');
  const [showPass,    setShowPass]    = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error,       setError]       = useState('');

  // Auto-seed demo users on mount
  useEffect(() => {
    fetch(`${API}/auth/seed-demo`, { method: 'POST' }).catch(() => {});
  }, []);

  // ── Email / Password login (pure JWT) ──────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const resp = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.detail || 'Invalid email or password');
      }
      const data = await resp.json();
      const user = {
        ...data.user,
        avatar: data.user.avatar || data.user.name?.split(' ').map(w => w[0]).join('').toUpperCase() || '?',
      };
      setAuth(user, data.access_token);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Google login via Clerk → then exchange for backend JWT ─────────────────
  const handleGoogle = async () => {
    if (!clerkLoaded || !signIn) return;
    setGoogleLoading(true);
    setError('');
    try {
      // Clerk handles the Google OAuth popup/redirect
      await signIn.authenticateWithRedirect({
        strategy:          'oauth_google',
        redirectUrl:       `${window.location.origin}/sso-callback`,
        redirectUrlComplete: `${window.location.origin}/sso-callback`,
      });
      // After redirect, the SSO callback page will exchange Clerk session → backend JWT
    } catch (err) {
      setError('Google sign-in failed. Try email/password.');
      setGoogleLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#0a0a0a] font-inter">

      {/* ── Left Form Panel ── */}
      <div className="w-full lg:w-[500px] shrink-0 flex flex-col justify-center px-8 sm:px-16 relative bg-[#0a0a0a] z-10 border-r border-white/[0.05]">

        <div className="absolute top-10 left-8 sm:left-16 flex items-center gap-2 cursor-pointer" onClick={() => window.location.href = '/'}>
          <img src={logo} alt="Veloris" className="w-[28px] h-[28px] object-contain opacity-90 filter grayscale" />
          <span className="text-xl font-bold font-space tracking-tight text-white">Veloris</span>
        </div>

        <div className="w-full mt-16 sm:mt-0">
          <h1 className="text-[32px] font-bold font-space text-white mb-1 tracking-tight">Sign in</h1>
          <p className="text-white/50 text-sm mb-8">to continue to Veloris</p>

          {/* Google button */}
          <button
            type="button"
            onClick={handleGoogle}
            disabled={googleLoading || !clerkLoaded}
            className="w-full flex items-center justify-center gap-3 h-[46px] border border-white/10 bg-transparent hover:bg-white/5 transition-colors text-white text-sm font-medium mb-6 disabled:opacity-40"
            style={{ borderRadius: 0 }}
          >
            {googleLoading ? <Loader2 size={15} className="animate-spin" /> : <GoogleIcon />}
            Continue with Google
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-white/30 text-[11px] uppercase tracking-widest font-semibold">or</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          {/* Demo quick-select */}
          <div className="flex gap-2 mb-6">
            {DEMO.map(d => (
              <button key={d.label} type="button"
                onClick={() => { setEmail(d.email); setPassword('password'); setError(''); }}
                className="flex-1 py-2 text-[11px] font-semibold uppercase tracking-widest transition-colors"
                style={{
                  border:     email === d.email ? '1px solid rgba(255,255,255,0.3)' : '1px solid rgba(255,255,255,0.08)',
                  background: email === d.email ? 'rgba(255,255,255,0.06)' : 'transparent',
                  color:      email === d.email ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.3)',
                  borderRadius: 0,
                }}
              >{d.label}</button>
            ))}
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label className="block text-white/70 font-semibold text-[13px] mb-1.5">Email address</label>
              <input type="email" value={email} onChange={e => { setEmail(e.target.value); setError(''); }} required
                className="w-full bg-black border border-white/10 text-white focus:border-white/40 h-[46px] text-sm px-4 outline-none transition-colors"
                style={{ borderRadius: 0 }} placeholder="you@college.edu" />
            </div>

            <div>
              <label className="block text-white/70 font-semibold text-[13px] mb-1.5">Password</label>
              <div className="relative">
                <input type={showPass ? 'text' : 'password'} value={password}
                  onChange={e => { setPassword(e.target.value); setError(''); }} required
                  className="w-full bg-black border border-white/10 text-white focus:border-white/40 h-[46px] text-sm px-4 pr-12 outline-none transition-colors"
                  style={{ borderRadius: 0 }} placeholder="••••••••" />
                <button type="button" onClick={() => setShowPass(v => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors">
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="text-[12px] text-red-400 bg-red-400/10 border border-red-400/20 px-3 py-2">{error}</div>
            )}

            <button type="submit" disabled={loading}
              className="w-full bg-white text-black hover:bg-gray-200 transition-colors h-[46px] font-bold text-sm tracking-wide mt-2 flex items-center justify-center gap-2 disabled:opacity-50"
              style={{ borderRadius: 0 }}>
              {loading ? <><Loader2 size={15} className="animate-spin" /> Signing in…</> : 'Continue'}
            </button>
          </form>

          <p className="text-white/25 text-[11px] mt-8 text-center">
            Demo password: <span className="text-white/50 font-mono">password</span>
          </p>
        </div>
      </div>

      {/* ── Right Panel ── */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden bg-[#030303] flex-col justify-center p-24">
        <div className="absolute inset-0 pointer-events-none z-0 opacity-80"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
            maskImage: 'radial-gradient(circle at center, black 0%, transparent 80%)',
            WebkitMaskImage: 'radial-gradient(circle at center, black 0%, transparent 80%)',
          }} />
        <div className="absolute top-1/4 right-1/4 w-[400px] h-[400px] bg-white/[0.02] border border-white/[0.05] rounded-full pointer-events-none fade-in-up" />
        <div className="absolute bottom-1/4 left-1/4 w-[300px] h-[300px] bg-white/[0.01] border border-white/[0.03] rounded-full pointer-events-none fade-in-up" style={{ animationDelay: '0.1s' }} />
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[20%] right-[10%] opacity-60" style={{ animation: 'float 6s ease-in-out infinite' }}>
            <div className="flex items-center gap-3 px-4 py-2 border border-white/10 bg-[#0a0a0a]/80 backdrop-blur-md">
              <Map size={16} className="text-white/70" />
              <span className="text-[11px] font-space text-white/70 tracking-widest uppercase font-semibold">Dynamic Roadmaps</span>
            </div>
          </div>
          <div className="absolute top-[40%] right-[25%] opacity-40" style={{ animation: 'float 8s ease-in-out infinite 1.5s' }}>
            <div className="flex items-center gap-3 px-4 py-2 border border-white/10 bg-[#0a0a0a]/80 backdrop-blur-md">
              <Brain size={16} className="text-white/70" />
              <span className="text-[11px] font-space text-white/70 tracking-widest uppercase font-semibold">AI Peer Intelligence</span>
            </div>
          </div>
        </div>
        <div className="relative z-10 max-w-xl fade-in-up" style={{ animationDelay: '0.2s' }}>
          <h2 className="text-[44px] lg:text-[56px] font-bold font-space text-white mb-6 leading-[1.05] tracking-tight">
            Personalized Trajectories,<br />Unprecedented Outcomes
          </h2>
          <p className="text-lg text-white/40 mb-10 leading-relaxed max-w-md">
            Deploy AI-powered mentors and dynamic learning roadmaps that adapt in real-time to granular student performance signals.
          </p>
          <div className="grid grid-cols-2 gap-6 max-w-md border-l border-white/10 pl-8">
            <div className="fade-in-up" style={{ animationDelay: '0.4s' }}>
              <div className="text-[32px] font-space font-bold text-white mb-1">98%</div>
              <div className="text-[10px] text-white/40 uppercase tracking-widest font-semibold">Prediction Accuracy</div>
            </div>
            <div className="fade-in-up" style={{ animationDelay: '0.5s' }}>
              <div className="text-[32px] font-space font-bold text-white mb-1">&lt;24h</div>
              <div className="text-[10px] text-white/40 uppercase tracking-widest font-semibold">Risk Detection Cycle</div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-12px)} }
      `}</style>
    </div>
  );
}
