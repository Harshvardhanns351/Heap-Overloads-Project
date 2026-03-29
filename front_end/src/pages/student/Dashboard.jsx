import React from 'react';
import useAppStore, { MOCK_STUDENTS } from '../../store';
import { StatCard, PageHeader, RiskBadge, ProgressBar } from '../../components/UI';
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid
} from 'recharts';
import { Activity, BookOpen, Code2, Bell, Zap, TrendingUp } from 'lucide-react';

const student = MOCK_STUDENTS[0];

const radarData = [
  { subject: 'DSA', score: 72 },
  { subject: 'OS', score: 58 },
  { subject: 'DBMS', score: 81 },
  { subject: 'CN', score: 63 },
  { subject: 'ML', score: 45 },
];

const activityData = [
  { day: 'Mon', events: 8 },
  { day: 'Tue', events: 12 },
  { day: 'Wed', events: 3 },
  { day: 'Thu', events: 0 },
  { day: 'Fri', events: 0 },
  { day: 'Sat', events: 2 },
  { day: 'Sun', events: 5 },
];

const CustomTooltip = ({ active, payload }) => {
  if (active && payload?.length) {
    return (
      <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px 12px', fontSize: '12px' }}>
        <div style={{ color: 'var(--text-primary)', fontWeight: '600' }}>{payload[0].value} events</div>
      </div>
    );
  }
  return null;
};

export default function StudentDashboard() {
  return (
    <div className="fade-in-up">
      <PageHeader
        title={`Good morning, ${student.name.split(' ')[0]} 👋`}
        subtitle="Here's your academic snapshot for today."
      />

      {/* Nudge card */}
      {student.nudge && (
        <div className="nudge-card" style={{ padding: '14px 18px', marginBottom: '24px', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
          <div style={{ width: '32px', height: '32px', background: 'rgba(79,142,247,0.15)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Zap size={15} color="#4f8ef7" />
          </div>
          <div>
            <div style={{ fontSize: '11px', fontWeight: '600', color: '#4f8ef7', marginBottom: '2px' }}>Personal nudge</div>
            <div style={{ fontSize: '13px', color: 'var(--text-primary)', lineHeight: '1.5' }}>{student.nudge}</div>
          </div>
        </div>
      )}

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <StatCard label="Attendance" value={`${student.attendance}%`} sub="This semester" color={student.attendance < 75 ? '#ef4444' : '#22c55e'} icon={Activity} trend={-8} />
        <StatCard label="Roadmap Progress" value="2/6" sub="Nodes completed" color="#8b5cf6" icon={TrendingUp} />
        <StatCard label="LeetCode Problems" value={student.codingStats.solved} sub={`Streak: ${student.codingStats.streak} days`} color="#f59e0b" icon={Code2} />
        <StatCard label="Pending Assignments" value="2" sub="1 overdue" color="#ef4444" icon={BookOpen} />
      </div>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
        {/* Radar chart */}
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>Subject Performance</div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '16px' }}>Unit 2 marks · out of 100</div>
          <ResponsiveContainer width="100%" height={200}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="rgba(255,255,255,0.05)" />
              <PolarAngleAxis dataKey="subject" tick={{ fill: '#8b8ba0', fontSize: 11 }} />
              <Radar dataKey="score" stroke="#4f8ef7" fill="#4f8ef7" fillOpacity={0.15} strokeWidth={2} dot={{ fill: '#4f8ef7', r: 3 }} />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Activity chart */}
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>Weekly Activity</div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '16px' }}>Platform events this week</div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={activityData}>
              <defs>
                <linearGradient id="actGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="day" tick={{ fill: '#8b8ba0', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#8b8ba0', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="events" stroke="#8b5cf6" fill="url(#actGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* Subject bars */}
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '16px' }}>Subject Breakdown</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {Object.entries(student.marks).map(([sub, score]) => (
              <div key={sub}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontSize: '12px', fontWeight: '500' }}>{sub}</span>
                  <span style={{ fontSize: '12px', color: score < 60 ? '#ef4444' : score < 75 ? '#f59e0b' : '#22c55e', fontWeight: '600' }}>{score}%</span>
                </div>
                <ProgressBar value={score} color={score < 60 ? '#ef4444' : score < 75 ? '#f59e0b' : '#22c55e'} height={5} />
              </div>
            ))}
          </div>
        </div>

        {/* Assignments */}
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '16px' }}>Recent Assignments</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[
              { title: 'Graph Traversal Problems', subject: 'DSA', deadline: 'Apr 1', status: 'pending' },
              { title: 'ER Diagram — Hospital DB', subject: 'DBMS', deadline: 'Mar 30', status: 'submitted' },
              { title: 'Process Scheduling Sim', subject: 'OS', deadline: 'Mar 28', status: 'late' },
            ].map((a, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', background: 'var(--bg-elevated)', borderRadius: '8px' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '12px', fontWeight: '500', marginBottom: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.title}</div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{a.subject} · Due {a.deadline}</div>
                </div>
                <span className={a.status === 'submitted' ? 'badge-green' : a.status === 'late' ? 'badge-red' : 'badge-yellow'} style={{ padding: '2px 8px', borderRadius: '99px', fontSize: '10px', fontWeight: '600', whiteSpace: 'nowrap' }}>
                  {a.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
