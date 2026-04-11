/**
 * Handles the redirect from Google OAuth.
 * URL: /auth/callback?token=...&user_id=...&name=...&email=...&role=...&avatar=...
 */
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useAppStore from '../store';

export default function AuthCallback() {
  const navigate = useNavigate();
  const setAuth = useAppStore(s => s.setAuth);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token  = params.get('token');
    const role   = params.get('role');
    const user   = {
      id:     params.get('user_id'),
      name:   decodeURIComponent(params.get('name') || ''),
      email:  params.get('email'),
      role,
      avatar: params.get('avatar') || '?',
    };

    if (token && role) {
      setAuth(user, token);
      // Redirect to the right dashboard
      const dest = role === 'teacher' ? '/teacher/classes'
                 : role === 'admin'   ? '/admin/analytics'
                 : '/dashboard';
      navigate(dest, { replace: true });
    } else {
      navigate('/login', { replace: true });
    }
  }, []);

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0a0a0a', color: 'rgba(255,255,255,0.5)', fontSize: '14px' }}>
      Signing you in…
    </div>
  );
}
