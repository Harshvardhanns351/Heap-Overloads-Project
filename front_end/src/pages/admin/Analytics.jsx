import React from 'react';
import { MOCK_STUDENTS } from '../../store';
import { PageHeader, StatCard } from '../../components/UI';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, AreaChart, Area } from 'recharts';
import { Users, TrendingUp, AlertTriangle, CheckCircle2 } from 'lucide-react';

const riskDist = [
  { name: 'Low Risk', value: 2, color: '#22c55e' },
  { name: 'At Watch', value: 2, color: '#f59e0b' },
  { name: 'At Risk', value: 1, color: '#ef4444' },
];

const attendanceTrend = [
  { month: 'Nov', avg: 88 }, { month: 'Dec', avg: 85 }, { month: 'Jan', avg: 82 },
  { month: 'Feb', avg: 79 }, { month: 'Mar', avg: 76 },
];

const branchData = [
  { branch: 'CSE-A', avg: 74, students: 4 },
  { branch: 'CSE-B', avg: 91, students: 1 },
  { branch: 'ECE-A', avg: 82, students: 0 },
  { branch: 'MECH-A', avg: 79, students: 0 },
];

const CustomPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }) => {
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={600}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

export default function AdminAnalytics() {
  const totalStudents = 5;
  const avgAttendance = Math.round(MOCK_STUDENTS.reduce((s, st) => s + st.attendance, 0) / MOCK_STUDENTS.length);
  const atRiskCount = MOCK_STUDENTS.filter(s => s.riskLevel === 'red').length;

  return (
    <div className="fade-in-up">
      <PageHeader title="Organization Analytics" subtitle="Platform-wide academic intelligence · refreshed every 24h" />

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <StatCard label="Total Students" value={totalStudents} sub="Active this semester" color="#4f8ef7" icon={Users} />
        <StatCard label="Average Attendance" value={`${avgAttendance}%`} sub="Across all classes" color="#8b5cf6" icon={TrendingUp} trend={-4} />
        <StatCard label="At-Risk Students" value={atRiskCount} sub="Risk score > 70" color="#ef4444" icon={AlertTriangle} />
        <StatCard label="Open Disputes" value={2} sub="Pending admin action" color="#f59e0b" icon={CheckCircle2} />
      </div>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '20px', marginBottom: '24px' }}>
        {/* Pie chart */}
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>Risk Distribution</div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '12px' }}>All active students</div>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={riskDist} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" labelLine={false} label={<CustomPieLabel />}>
                {riskDist.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '12px' }} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '8px' }}>
            {riskDist.map((d) => (
              <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: d.color }} />
                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{d.name} ({d.value})</span>
              </div>
            ))}
          </div>
        </div>

        {/* Attendance trend */}
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>Attendance Trend</div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '16px' }}>Average % over last 5 months</div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={attendanceTrend}>
              <defs>
                <linearGradient id="attGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4f8ef7" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#4f8ef7" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="month" tick={{ fill: '#8b8ba0', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#8b8ba0', fontSize: 10 }} axisLine={false} tickLine={false} domain={[60, 100]} />
              <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '12px' }} />
              <Area type="monotone" dataKey="avg" stroke="#4f8ef7" fill="url(#attGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Branch performance */}
      <div className="card" style={{ padding: '20px' }}>
        <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '16px' }}>Attendance by Section</div>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={branchData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="branch" tick={{ fill: '#8b8ba0', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#8b8ba0', fontSize: 10 }} axisLine={false} tickLine={false} domain={[60, 100]} />
            <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '12px' }} />
            <Bar dataKey="avg" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
