import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAppStore from '../store';

export default function RoleSelection() {
  const selectRole = useAppStore((s) => s.selectRole);
  const [loading, setLoading] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSelect = async (role) => {
    setLoading(role);
    setError('');
    try {
      await selectRole(role);
      navigate(role === 'teacher' ? '/teacher/classes' : '/dashboard', { replace: true });
    } catch (err) {
      setError(err.message || 'Could not save role');
    } finally {
      setLoading('');
    }
  };

  return (
    <div className="min-h-screen bg-[#07111f] text-white grid place-items-center p-6">
      <div className="premium-card p-8 w-full max-w-xl">
        <h1 className="text-3xl font-space font-bold mb-2">Choose Your Role</h1>
        <p className="text-slate-300 mb-6">Admin access is not available here. Pick the role that matches your portal.</p>
        <div className="grid md:grid-cols-2 gap-4">
          <button className="rounded-2xl p-6 border border-sky-400/30 bg-sky-400/10 text-left" onClick={() => handleSelect('student')} disabled={!!loading}>
            <div className="font-semibold text-lg mb-2">Student</div>
            <div className="text-sm text-slate-300">{loading === 'student' ? 'Saving...' : 'Roadmap, mentor, coding, documents'}</div>
          </button>
          <button className="rounded-2xl p-6 border border-emerald-400/30 bg-emerald-400/10 text-left" onClick={() => handleSelect('teacher')} disabled={!!loading}>
            <div className="font-semibold text-lg mb-2">Teacher</div>
            <div className="text-sm text-slate-300">{loading === 'teacher' ? 'Saving...' : 'Classes, attendance, alerts, assignments'}</div>
          </button>
        </div>
        {error && <div className="mt-4 text-sm text-red-300">{error}</div>}
      </div>
    </div>
  );
}
