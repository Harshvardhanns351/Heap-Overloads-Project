import React, { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import zxcvbn from 'zxcvbn';
import { api } from '../api';

const labels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];
const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6'];

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const score = useMemo(() => (password ? zxcvbn(password).score : 0), [password]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      const data = await api.auth.resetPassword(token, password);
      setMessage(data.message || 'Password updated');
      setTimeout(() => navigate('/login', { replace: true }), 1200);
    } catch (err) {
      setMessage(err.message || 'Could not reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#07111f] text-white grid place-items-center p-6">
      <form onSubmit={handleSubmit} className="premium-card p-8 w-full max-w-md">
        <h1 className="text-3xl font-space font-bold mb-4">Reset Password</h1>
        <input className="input-premium" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Choose a new password" required />
        <div className="mt-3 h-2 rounded-full bg-white/10 overflow-hidden">
          <div className="h-full" style={{ width: `${(score + 1) * 20}%`, background: colors[score] }} />
        </div>
        <div className="text-xs mt-2" style={{ color: colors[score] }}>Strength: {labels[score]}</div>
        <button className="btn-premium w-full h-[50px] mt-5" style={{ background: 'linear-gradient(135deg, #22c55e, #0ea5e9)' }} disabled={loading || !token}>
          {loading ? 'Saving...' : 'Save New Password'}
        </button>
        {message && <div className="mt-4 text-sm text-slate-200">{message}</div>}
        {!token && <div className="mt-4 text-sm text-red-300">Reset token missing.</div>}
      </form>
    </div>
  );
}
