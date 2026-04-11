/**
 * /sso-exchange — Clerk session is now active.
 * Exchange it for a backend JWT and redirect to dashboard.
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser, useClerk } from '@clerk/react';
import useAppStore from '../store';

const API = 'http://localhost:8000/api';

export default function SSOExchange() {
  const navigate    = useNavigate();
  const { setAuth } = useAppStore();
  const { user, isLoaded, isSignedIn } = useUser();
  const { signOut } = useClerk();
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isLoaded) return;

    if (!isSignedIn || !user) {
      navigate('/login', { replace: true });
      return;
    }

    const email = user.primaryEmailAddress?.emailAddress;
    const name  = user.fullName || email || 'User';

    fetch(`${API}/auth/google-sso`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email, name }),
    })
      .then(r => {
        if (!r.ok) return r.json().then(e => { throw new Error(e.detail || 'SSO failed'); });
        return r.json();
      })
      .then(data => {
        const u = {
          ...data.user,
          avatar: (data.user.name || '?').split(' ').map(w => w[0]).join('').toUpperCase(),
        };
        setAuth(u, data.access_token);
        // Sign out of Clerk — only needed it for the OAuth handshake
        signOut().catch(() => {});
        const dest = u.role === 'teacher' ? '/teacher/classes'
                   : u.role === 'admin'   ? '/admin/analytics'
                   : '/dashboard';
        navigate(dest, { replace: true });
      })
      .catch(err => setError(err.message));
  }, [isLoaded, isSignedIn, user]);

  if (error) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0a0a0a', gap: '16px' }}>
      <div style={{ color: '#ef4444', fontSize: '13px' }}>{error}</div>
      <button onClick={() => navigate('/login')} style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', background: 'none', border: '1px solid rgba(255,255,255,0.1)', padding: '8px 16px', cursor: 'pointer' }}>
        Back to Login
      </button>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0a0a0a', color: 'rgba(255,255,255,0.5)', gap: '12px' }}>
      <div style={{ width: '24px', height: '24px', border: '2px solid rgba(255,255,255,0.1)', borderTopColor: 'rgba(255,255,255,0.6)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <div style={{ fontSize: '13px' }}>Completing sign-in…</div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
