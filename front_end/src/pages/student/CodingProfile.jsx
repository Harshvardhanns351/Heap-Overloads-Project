import React, { useState, useEffect } from 'react';
import { PageHeader, ProgressBar } from '../../components/UI';
import { Code2, TrendingUp, Zap, Award, ExternalLink, Check, RefreshCw, Loader2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import useAppStore from '../../store';

export default function CodingProfile() {
  const { currentUser } = useAppStore();
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const token = () => localStorage.getItem('token');

  const fetchProfiles = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/coding/me', {
        headers: { Authorization: `Bearer ${token()}` },
      });
      const data = await res.json();
      setProfiles(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch coding profiles', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProfiles(); }, []);

  const handleSync = async () => {
    const lc = profiles.find(p => p.platform === 'leetcode');
    if (!lc) return;
    setSyncing(true);
    try {
      await fetch(`http://localhost:8000/api/coding/leetcode/${lc.username}`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      await fetchProfiles();
    } catch (err) {
      console.error('Sync failed', err);
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
      </div>
    );
  }

  const lc = profiles.find(p => p.platform === 'leetcode');

  if (!lc) {
    return (
      <div className="fade-in-up">
        <PageHeader title="Coding Profile" subtitle="Link your LeetCode account to track your progress" />
        <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
          <Code2 size={40} style={{ margin: '0 auto 16px', opacity: 0.4 }} />
          <div style={{ fontSize: '15px', fontWeight: '600', marginBottom: '8px' }}>No coding profile linked yet</div>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Ask your admin to link your LeetCode account.</div>
        </div>
      </div>
    );
  }

  const skillData = [
    { tag: 'Easy', solved: lc.easy, color: '#22c55e' },
    { tag: 'Medium', solved: lc.medium, color: '#f59e0b' },
    { tag: 'Hard', solved: lc.hard, color: '#ef4444' },
  ];

  return (
    <div className="fade-in-up">
      <PageHeader
        title="Coding Profile"
        subtitle="Linked with LeetCode · stats synced from your account"
        action={
          <button className="btn btn-ghost" onClick={handleSync} style={{ fontSize: '12px', gap: '6px' }} disabled={syncing}>
            <RefreshCw size={12} className={syncing ? 'spin' : ''} /> {syncing ? 'Syncing...' : 'Sync'}
          </button>
        }
      />

      <div style={{ marginBottom: '20px', padding: '14px 18px', background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.18)', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ width: '32px', height: '32px', background: 'rgba(34,197,94,0.15)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Check size={16} color="#22c55e" />
        </div>
        <div>
          <div style={{ fontSize: '13px', fontWeight: '600' }}>LeetCode linked · <span style={{ color: '#4f8ef7' }}>{lc.username}</span></div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Last synced: {lc.last_synced_at ? new Date(lc.last_synced_at).toLocaleDateString() : 'Never'}</div>
        </div>
        <a href={`https://leetcode.com/${lc.username}`} target="_blank" rel="noreferrer" style={{ marginLeft: 'auto', color: 'var(--text-muted)' }}>
          <ExternalLink size={14} />
        </a>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '20px' }}>
        {[
          { label: 'Total Solved', value: lc.solved_total, color: '#4f8ef7', icon: Code2 },
          { label: 'Easy', value: lc.easy, color: '#22c55e', icon: Zap },
          { label: 'Medium', value: lc.medium, color: '#f59e0b', icon: TrendingUp },
          { label: 'Hard', value: lc.hard, color: '#ef4444', icon: Award },
        ].map(({ label, value, color, icon: Icon }) => (
          <div key={label} className="stat-card" style={{ textAlign: 'center', padding: '16px' }}>
            <div style={{ width: '28px', height: '28px', background: `${color}18`, borderRadius: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px' }}>
              <Icon size={13} color={color} />
            </div>
            <div style={{ fontSize: '22px', fontWeight: '700', fontFamily: 'Space Grotesk, sans-serif' }}>{value}</div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>{label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '16px' }}>Difficulty Breakdown</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {skillData.map(({ tag, solved, color }) => (
              <div key={tag}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                  <span style={{ fontSize: '12px', fontWeight: '500' }}>{tag}</span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{solved} solved</span>
                </div>
                <ProgressBar value={solved} max={Math.max(lc.solved_total, 1)} color={color} height={4} />
              </div>
            ))}
          </div>
        </div>

        <div className="card" style={{ padding: '20px' }}>
          <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>Problems by Difficulty</div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '16px' }}>Count per level</div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={skillData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="tag" tick={{ fill: '#8b8ba0', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#8b8ba0', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '12px' }} />
              <Bar dataKey="solved" fill="#4f8ef7" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <style>{`.spin { animation: spin 1s linear infinite; } @keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
