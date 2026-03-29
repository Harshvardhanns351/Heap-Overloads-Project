import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MOCK_STUDENTS } from '../../store';
import { PageHeader, RiskBadge, ProgressBar } from '../../components/UI';
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { Activity, Code2, Clock, AlertTriangle, ArrowLeft } from 'lucide-react';

export default function StudentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const student = MOCK_STUDENTS.find((s) => s.id === +id);

  if (!student) return <div style={{ color: 'var(--text-muted)', padding: '40px' }}>Student not found.</div>;

  const radarData = Object.entries(student.marks).map(([subject, score]) => ({ subject, score }));
  const trendData = student.marksHistory.flatMap((h) =>
    Object.entries(h).filter(([k]) => k !== 'test').map(([sub, val]) => ({ test: h.test, subject: sub, score: val }))
  );

  const SIGNALS = [
    { label: 'Days since last activity', value: student.lastActive, weight: 'High', flag: student.lastActive.includes('5') },
    { label: 'Attendance this month', value: `${student.attendance}%`, weight: 'High', flag: student.attendance < 75 },
    { label: 'Marks trend (last 2 tests)', value: 'Declining 8%', weight: 'Medium', flag: false },
    { label: 'Late-night submissions', value: '3 this week', weight: 'Low', flag: true },
    { label: 'Coding activity', value: `${student.codingStats.streak} day streak`, weight: 'Low', flag: student.codingStats.streak === 0 },
  ];

  return (
    <div className="fade-in-up">
      <button className="btn btn-ghost" onClick={() => navigate(-1)} style={{ marginBottom: '16px', fontSize: '12px' }}>
        <ArrowLeft size={13} /> Back to Class
      </button>

      {/* Header */}
      <div className="card" style={{ padding: '20px', marginBottom: '20px', display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
        <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: student.riskLevel === 'red' ? 'rgba(239,68,68,0.15)' : student.riskLevel === 'yellow' ? 'rgba(245,158,11,0.15)' : 'rgba(34,197,94,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: '700', color: student.riskLevel === 'red' ? '#ef4444' : student.riskLevel === 'yellow' ? '#f59e0b' : '#22c55e', flexShrink: 0 }}>
          {student.name.split(' ').map(n => n[0]).join('')}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '6px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '700', fontFamily: 'Space Grotesk, sans-serif' }}>{student.name}</h2>
            <RiskBadge level={student.riskLevel} score={student.riskScore} />
          </div>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            {[student.rollNo, `Sem ${student.semester}`, `${student.branch}-${student.section}`, `Last active: ${student.lastActive}`].map((t, i) => (
              <span key={i} style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{t}</span>
            ))}
          </div>
          <div style={{ marginTop: '8px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {student.tags.map((tag, i) => (
              <span key={i} className={tag === 'Top Performer' ? 'badge-green' : 'badge-yellow'} style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '99px', fontWeight: '600' }}>{tag}</span>
            ))}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '36px', fontWeight: '800', fontFamily: 'Space Grotesk, sans-serif', color: student.riskLevel === 'red' ? '#ef4444' : student.riskLevel === 'yellow' ? '#f59e0b' : '#22c55e' }}>{student.riskScore}</div>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Risk Score</div>
        </div>
      </div>

      {/* Wellbeing signals */}
      <div className="card" style={{ padding: '20px', marginBottom: '20px' }}>
        <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertTriangle size={14} color="#f59e0b" /> Behavioral Signals
          <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '400' }}>— inferred, not self-reported</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {SIGNALS.map((sig, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '9px 12px', background: 'var(--bg-elevated)', borderRadius: '8px', border: `1px solid ${sig.flag ? 'rgba(239,68,68,0.18)' : 'var(--border-soft)'}` }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: sig.flag ? '#ef4444' : 'rgba(255,255,255,0.15)', flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: '12px', color: 'var(--text-secondary)' }}>{sig.label}</span>
              <span style={{ fontSize: '12px', fontWeight: '600', color: sig.flag ? '#ef4444' : 'var(--text-primary)' }}>{sig.value}</span>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)', padding: '2px 7px', background: 'rgba(255,255,255,0.04)', borderRadius: '99px' }}>{sig.weight}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '16px' }}>Subject Performance</div>
          <ResponsiveContainer width="100%" height={200}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="rgba(255,255,255,0.05)" />
              <PolarAngleAxis dataKey="subject" tick={{ fill: '#8b8ba0', fontSize: 10 }} />
              <Radar dataKey="score" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.15} strokeWidth={2} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>Marks Trend</div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '16px' }}>Across 2 unit tests</div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={student.marksHistory}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="test" tick={{ fill: '#8b8ba0', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#8b8ba0', fontSize: 10 }} axisLine={false} tickLine={false} domain={[40, 100]} />
              <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '11px' }} />
              {Object.keys(student.marks).map((sub, i) => (
                <Line key={sub} type="monotone" dataKey={sub} stroke={['#4f8ef7', '#8b5cf6', '#14b8a6', '#f59e0b', '#ef4444'][i % 5]} strokeWidth={2} dot={{ r: 3 }} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
        <div className="stat-card">
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '8px' }}>Attendance</div>
          <div style={{ fontSize: '24px', fontWeight: '700', fontFamily: 'Space Grotesk', color: student.attendance < 75 ? '#ef4444' : '#22c55e' }}>{student.attendance}%</div>
          <ProgressBar value={student.attendance} color={student.attendance < 75 ? '#ef4444' : '#22c55e'} height={4} />
          {student.attendance < 75 && <div style={{ fontSize: '10px', color: '#ef4444', marginTop: '6px' }}>Defaulter threshold breach</div>}
        </div>
        <div className="stat-card">
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '8px' }}>LeetCode Solved</div>
          <div style={{ fontSize: '24px', fontWeight: '700', fontFamily: 'Space Grotesk' }}>{student.codingStats.solved}</div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>Streak: {student.codingStats.streak} days</div>
        </div>
        <div className="stat-card">
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '8px' }}>LeetCode Profile</div>
          <div style={{ fontSize: '14px', fontWeight: '600', color: '#4f8ef7' }}>{student.codingStats.leetcode}</div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
            {[{ l: 'E', v: student.codingStats.easy, c: '#22c55e' }, { l: 'M', v: student.codingStats.medium, c: '#f59e0b' }, { l: 'H', v: student.codingStats.hard, c: '#ef4444' }].map(({ l, v, c }) => (
              <span key={l} style={{ fontSize: '11px', padding: '2px 8px', background: `${c}12`, color: c, borderRadius: '99px' }}>{l}: {v}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
