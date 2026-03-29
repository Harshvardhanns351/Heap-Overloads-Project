import React, { useState } from 'react';
import { PageHeader, ProgressBar } from '../../components/UI';
import { Code2, TrendingUp, Zap, Award, ExternalLink, Check, RefreshCw } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const SKILL_DATA = [
  { tag: 'Arrays', solved: 47, color: '#22c55e', level: 'Strong' },
  { tag: 'Strings', solved: 38, color: '#22c55e', level: 'Strong' },
  { tag: 'Linked Lists', solved: 22, color: '#4f8ef7', level: 'Good' },
  { tag: 'Trees', solved: 14, color: '#f59e0b', level: 'Building' },
  { tag: 'Dynamic Programming', solved: 8, color: '#f59e0b', level: 'Weak' },
  { tag: 'Graphs', solved: 3, color: '#ef4444', level: 'Not Started' },
  { tag: 'Backtracking', solved: 2, color: '#ef4444', level: 'Not Started' },
];

const RECENT_SUBS = [
  { title: 'Two Sum', difficulty: 'Easy', status: 'Accepted', date: '4 days ago', time: '2am' },
  { title: 'Linked List Cycle', difficulty: 'Easy', status: 'Accepted', date: '4 days ago', time: '1:45am' },
  { title: 'Binary Tree Inorder', difficulty: 'Easy', status: 'Wrong Answer', date: '5 days ago', time: '11pm' },
  { title: 'LRU Cache', difficulty: 'Medium', status: 'Time Limit', date: '6 days ago', time: '10pm' },
];

const DIFF_COLOR = { Easy: '#22c55e', Medium: '#f59e0b', Hard: '#ef4444' };
const STAT_COLOR = { Accepted: '#22c55e', 'Wrong Answer': '#ef4444', 'Time Limit': '#f59e0b' };

export default function CodingProfile() {
  const [linked, setLinked] = useState(true);
  const [username, setUsername] = useState('rahul_sharma_dev');
  const [loading, setLoading] = useState(false);

  const refetch = async () => {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1200));
    setLoading(false);
  };

  return (
    <div className="fade-in-up">
      <PageHeader
        title="Coding Profile"
        subtitle="Linked with LeetCode — skill badges auto-computed from your submissions"
        action={
          <button className="btn btn-ghost" onClick={refetch} style={{ fontSize: '12px', gap: '6px' }}>
            <RefreshCw size={12} className={loading ? 'spin' : ''} /> Sync
          </button>
        }
      />

      {/* Linked account bar */}
      <div style={{ marginBottom: '20px', padding: '14px 18px', background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.18)', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ width: '32px', height: '32px', background: 'rgba(34,197,94,0.15)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Check size={16} color="#22c55e" />
        </div>
        <div>
          <div style={{ fontSize: '13px', fontWeight: '600' }}>LeetCode linked · <span style={{ color: '#4f8ef7' }}>{username}</span></div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Last synced: 4 days ago</div>
        </div>
        <a href={`https://leetcode.com/${username}`} target="_blank" rel="noreferrer" style={{ marginLeft: 'auto', color: 'var(--text-muted)' }}>
          <ExternalLink size={14} />
        </a>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '20px' }}>
        {[
          { label: 'Total Solved', value: 87, color: '#4f8ef7', icon: Code2 },
          { label: 'Easy', value: 52, color: '#22c55e', icon: Zap },
          { label: 'Medium', value: 30, color: '#f59e0b', icon: TrendingUp },
          { label: 'Hard', value: 5, color: '#ef4444', icon: Award },
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

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
        {/* Skill badges */}
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '16px' }}>Skill Breakdown</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {SKILL_DATA.map(({ tag, solved, color, level }) => (
              <div key={tag}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                  <span style={{ fontSize: '12px', fontWeight: '500' }}>{tag}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{solved} solved</span>
                    <span style={{ fontSize: '10px', fontWeight: '600', color, padding: '1px 7px', background: `${color}15`, borderRadius: '99px' }}>{level}</span>
                  </div>
                </div>
                <ProgressBar value={solved} max={50} color={color} height={4} />
              </div>
            ))}
          </div>
        </div>

        {/* Bar chart */}
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>Problems by Topic</div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '16px' }}>Count per tag</div>
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={SKILL_DATA} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
              <XAxis type="number" tick={{ fill: '#8b8ba0', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="tag" tick={{ fill: '#8b8ba0', fontSize: 10 }} axisLine={false} tickLine={false} width={80} />
              <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '12px' }} />
              <Bar dataKey="solved" fill="#4f8ef7" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent submissions */}
      <div className="card" style={{ padding: '20px' }}>
        <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '16px' }}>Recent Submissions</div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {RECENT_SUBS.map((s, i) => (
            <div key={i} className="table-row" style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '10px 0' }}>
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: '12px', fontWeight: '500' }}>{s.title}</span>
              </div>
              <span style={{ fontSize: '11px', color: DIFF_COLOR[s.difficulty], fontWeight: '600', minWidth: '45px' }}>{s.difficulty}</span>
              <span style={{ fontSize: '11px', color: STAT_COLOR[s.status], fontWeight: '500', minWidth: '90px' }}>{s.status}</span>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', minWidth: '80px' }}>{s.date}</span>
              <span style={{ fontSize: '10px', color: s.time.includes('am') ? '#ef4444' : 'var(--text-muted)', fontWeight: s.time.includes('am') ? '600' : '400' }}>
                {s.time} {s.time.includes('am') && '🌙'}
              </span>
            </div>
          ))}
        </div>
        <div style={{ marginTop: '12px', fontSize: '11px', padding: '8px 12px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: '7px', color: '#ef4444' }}>
          ⚠️ 3 submissions after midnight this week — flagged as late-night activity signal
        </div>
      </div>

      <style>{`.spin { animation: spin 1s linear infinite; } @keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
