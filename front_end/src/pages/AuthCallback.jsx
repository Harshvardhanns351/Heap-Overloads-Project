import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import useAppStore from '../store';

export default function AuthCallback() {
  const hydrateAuthFromToken = useAppStore((s) => s.hydrateAuthFromToken);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [message, setMessage] = useState('Finalizing sign-in...');

  useEffect(() => {
    const token = searchParams.get('token');
    const error = searchParams.get('error');
    const next = searchParams.get('next');

    if (error) {
      setMessage(error);
      return;
    }
    if (!token) {
      setMessage('Missing auth token');
      return;
    }

    hydrateAuthFromToken(token)
      .then((user) => {
        navigate(next || (user.role === 'teacher' ? '/teacher/classes' : user.role === 'admin' ? '/admin/analytics' : user.role ? '/dashboard' : '/select-role'), { replace: true });
      })
      .catch((err) => setMessage(err.message || 'Could not finish sign-in'));
  }, [searchParams, hydrateAuthFromToken, navigate]);

  return <div className="min-h-screen bg-[#07111f] text-white grid place-items-center">{message}</div>;
}
