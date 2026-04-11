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
  const login = useAppStore(s => s.login);
  const { signIn, isLoaded: clerkLoaded } = useSignIn();

  const [email,       setEmail]       = useState('rahul@college.edu');
  const [password,    setPassword]    = useState('password');
  const [showPass,    setShowPass]    = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error,       setError]       = useState('');

  useEffect(() => {
    fetch(`${API}/auth/seed-demo`, { method: 'POST' }).catch(() => {});
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try { await login(email, password); } 
    catch (err) { setError(err.message || 'Invalid email or password'); } 
    finally { setLoading(true); } // Keep loading while redirecting
  };

  const handleGoogle = async () => {
    if (!clerkLoaded || !signIn) return;
    setGoogleLoading(true);
    setError('');
    try {
      await signIn.authenticateWithRedirect({
        strategy:          'oauth_google',
        redirectUrl:       `${window.location.origin}/sso-callback`,
        redirectUrlComplete: `${window.location.origin}/sso-callback`,
      });
    } catch (err) {
      setError('Google sign-in failed.');
      setGoogleLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#0a0a0a] font-inter text-white">
      {/* ── Left Form Panel ── */}
      <div className="w-full lg:w-[500px] shrink-0 flex flex-col justify-center px-8 sm:px-16 relative bg-[#0a0a0a] z-10" style={{ borderRight: '1px solid var(--border)' }}>
        <div className="absolute top-10 left-8 sm:left-16 flex items-center gap-2.5">
          <img src={logo} alt="Veloris" className="w-[30px] h-[30px] object-contain logo-float" />
          <span className="text-xl font-bold font-space tracking-tight text-white drop-shadow-[0_0_12px_rgba(91,91,214,0.4)]">Veloris</span>
        </div>

        <div className="w-full mt-16 sm:mt-0 fade-in-up">
          <h1 className="text-[32px] font-black font-space text-white mb-1 tracking-tight">Sign in</h1>
          <p className="text-white/40 text-sm mb-10">Advanced Student Analytics Platform</p>

          <button type="button" onClick={handleGoogle} disabled={googleLoading || !clerkLoaded}
            className="w-full flex items-center justify-center gap-3 h-[48px] rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all text-white text-sm font-semibold mb-6 disabled:opacity-40">
            {googleLoading ? <Loader2 size={16} className="animate-spin" /> : <GoogleIcon />}
            Continue with Google
          </button>

          <div className="flex items-center gap-4 mb-8">
            <div className="flex-1 h-px bg-white/5" />
            <span className="text-white/20 text-[10px] uppercase tracking-widest font-black">or security hash</span>
            <div className="flex-1 h-px bg-white/5" />
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="flex gap-2 p-1.5 rounded-xl bg-white/5 border border-white/5 mb-2">
              {DEMO.map(d => (
                <button key={d.label} type="button" onClick={() => { setEmail(d.email); setPassword('password'); setError(''); }}
                  className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all ${email === d.email ? 'bg-white/10 text-white shadow-lg' : 'text-white/30 hover:text-white/50'}`}>
                  {d.label}
                </button>
              ))}
            </div>

            <div className="space-y-1.5">
              <label className="text-white/50 font-bold text-[11px] uppercase tracking-wider ml-1">Email Authority</label>
              <input type="email" value={email} onChange={e => { setEmail(e.target.value); setError(''); }} required
                className="input h-[48px] rounded-xl" placeholder="authority@veloris.edu" />
            </div>

            <div className="space-y-1.5">
              <label className="text-white/50 font-bold text-[11px] uppercase tracking-wider ml-1">Secure Key</label>
              <div className="relative">
                <input type={showPass ? 'text' : 'password'} value={password} onChange={e => { setPassword(e.target.value); setError(''); }} required
                  className="input h-[48px] rounded-xl pr-12" placeholder="••••••••" />
                <button type="button" onClick={() => setShowPass(v => !v)} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/50 transition-colors">
                  {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && <div className="text-[11px] font-bold text-red-400 bg-red-400/10 border border-red-400/20 px-4 py-3 rounded-xl">{error}</div>}

            <button type="submit" disabled={loading}
              className="btn-primary h-[50px] rounded-xl text-black font-black text-[13px] tracking-wide mt-3 w-full">
              {loading ? <><Loader2 size={16} className="animate-spin" /> Authenticating…</> : 'Access Dashboard'}
            </button>
          </form>

          <p className="text-white/20 text-[11px] mt-10 text-center font-medium">Demo Access Code: <span className="text-white/40 font-mono">password</span></p>
        </div>
      </div>

      {/* ── Right Panel ── */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden bg-[#030303] flex-col justify-center p-24">
        <div className="absolute inset-0 pointer-events-none z-0"
          style={{
            backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.05) 1px, transparent 0)',
            backgroundSize: '32px 32px',
            maskImage: 'radial-gradient(circle at center, black 0%, transparent 80%)',
          }} />
        <div className="relative z-10 max-w-xl fade-in-up">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold uppercase tracking-widest text-[#5B5BD6] mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-[#5B5BD6] animate-pulse" />
            Neural Analytics v2.4
          </div>
          <h2 className="text-[54px] font-black font-space text-white mb-6 leading-[1.05] tracking-tighter">Personalized Trajectories,<br />Unprecedented Outcomes.</h2>
          <p className="text-lg text-white/40 mb-12 leading-relaxed max-w-md">Deploy AI-powered mentors and dynamic learning roadmaps that adapt in real-time to student performance signals.</p>
          <div className="grid grid-cols-2 gap-10 border-l border-white/10 pl-8">
            <div>
              <div className="text-[32px] font-space font-black text-white mb-1">98%</div>
              <div className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Prediction Engine Accuracy</div>
            </div>
            <div>
              <div className="text-[32px] font-space font-black text-white mb-1">&lt;24h</div>
              <div className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Risk Detection Cycle</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
