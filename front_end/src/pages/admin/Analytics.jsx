import React, { useEffect, useState } from 'react';
import { useAppStore } from '../../store';
import { PageHeader, StatCard } from '../../components/UI';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, AreaChart, Area } from 'recharts';
import { Users, TrendingUp, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';

const CustomPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
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
  const { students, fetchStudents, alerts, fetchAlerts, disputes, fetchDisputes } = useAppStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      await Promise.all([fetchStudents(), fetchAlerts(), fetchDisputes()]);
      setLoading(false);
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
      </div>
    );
  }

  const studentsList = students.filter(s => s.role === 'student');
  const totalStudents = studentsList.length;
  
  const riskCounts = { green: 0, yellow: 0, red: 0 };
  studentsList.forEach(s => {
    const studentAlerts = alerts.filter(a => a.student_id === s.id && a.severity === 'red');
    if (studentAlerts.length > 0) riskCounts.red++;
    else riskCounts.yellow++;
  });

  const riskDist = [
    { name: 'Low Risk', value: totalStudents - riskCounts.red - riskCounts.yellow || 0, color: '#22c55e' },
    { name: 'At Watch', value: riskCounts.yellow, color: '#f59e0b' },
    { name: 'At Risk', value: riskCounts.red, color: '#ef4444' },
  ].filter(d => d.value > 0);

  const openDisputes = disputes.filter(d => d.status === 'OPEN' || d.status === 'IN_REVIEW').length;

  const attendanceTrend = [
    { month: 'Nov', avg: 88 }, { month: 'Dec', avg: 85 }, { month: 'Jan', avg: 82 },
    { month: 'Feb', avg: 79 }, { month: 'Mar', avg: 76 },
  ];

  const branchData = [
    { branch: 'CSE-A', avg: 74, students: studentsList.filter(s => s.class_id === 'CSE-A').length },
    { branch: 'CSE-B', avg: 91, students: studentsList.filter(s => s.class_id === 'CSE-B').length },
  ];

  return (
    <div className="fade-in-up">
      <PageHeader title="Organization Analytics" subtitle="Platform-wide academic intelligence · refreshed every 24h" />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <StatCard label="Total Students" value={totalStudents} sub="Active this semester" color="#4f8ef7" icon={Users} />
        <StatCard label="Average Attendance" value="82%" sub="Across all classes" color="#8b5cf6" icon={TrendingUp} trend={-4} />
        <StatCard label="At-Risk Students" value={riskCounts.red} sub="Risk score > 70" color="#ef4444" icon={AlertTriangle} />
        <StatCard label="Open Disputes" value={openDisputes} sub="Pending admin action" color="#f59e0b" icon={CheckCircle2} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '20px', marginBottom: '24px' }}>
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>Risk Distribution</div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '12px' }}>All active students</div>
          {riskDist.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={riskDist} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" labelLine={false} label={<CustomPieLabel />}>
                  {riskDist.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={{ background: 'rgba(15,15,20,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '12px', backdropFilter: 'blur(8px)' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[180px] text-slate-500">No data</div>
          )}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '8px' }}>
            {riskDist.map((d) => (
              <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: d.color }} />
                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{d.name} ({d.value})</span>
              </div>
            ))}
          </div>
        </div>

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
              <Tooltip contentStyle={{ background: 'rgba(15,15,20,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '12px', backdropFilter: 'blur(8px)' }} />
              <Area type="monotone" dataKey="avg" stroke="#4f8ef7" fill="url(#attGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card" style={{ padding: '20px' }}>
        <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '16px' }}>Attendance by Section</div>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={branchData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="branch" tick={{ fill: '#8b8ba0', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#8b8ba0', fontSize: 10 }} axisLine={false} tickLine={false} domain={[60, 100]} />
            <Tooltip contentStyle={{ background: 'rgba(15,15,20,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '12px', backdropFilter: 'blur(8px)' }} />
            <Bar dataKey="avg" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}