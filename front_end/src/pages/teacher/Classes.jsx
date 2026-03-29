import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAppStore, { MOCK_STUDENTS } from '../../store';
import { PageHeader, RiskBadge } from '../../components/UI';
import { Search, ChevronRight, AlertTriangle, Users, TrendingDown } from 'lucide-react';

const CLASSES = [
  { id: 'CSE-A', name: 'CSE Section A', semester: 6, branch: 'CSE', count: 4 },
  { id: 'CSE-B', name: 'CSE Section B', semester: 6, branch: 'CSE', count: 1 },
];

export default function TeacherClasses() {
  const [selectedClass, setSelectedClass] = useState(null);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('risk');
  const navigate = useNavigate();

  const classStudents = MOCK_STUDENTS.filter((s) =>
    !selectedClass || s.section === selectedClass.id.replace('CSE-', '')
  );

  const filtered = classStudents
    .filter((s) => s.name.toLowerCase().includes(search.toLowerCase()) || s.rollNo.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'risk') return b.riskScore - a.riskScore;
      if (sortBy === 'attendance') return a.attendance - b.attendance;
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      return 0;
    });

  const riskCounts = { red: MOCK_STUDENTS.filter(s => s.riskLevel === 'red').length, yellow: MOCK_STUDENTS.filter(s => s.riskLevel === 'yellow').length, green: MOCK_STUDENTS.filter(s => s.riskLevel === 'green').length };

  if (!selectedClass) {
    return (
      <div className="fade-in-up">
        <PageHeader title="My Classes" subtitle="Select a class to view student analytics and risk scores" />
        {/* Summary pills */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
          {[
            { label: 'At Risk', count: riskCounts.red, color: '#ef4444' },
            { label: 'Watching', count: riskCounts.yellow, color: '#f59e0b' },
            { label: 'On Track', count: riskCounts.green, color: '#22c55e' },
          ].map(({ label, count, color }) => (
            <div key={label} style={{ padding: '10px 18px', background: `${color}10`, border: `1px solid ${color}25`, borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '18px', fontWeight: '700', fontFamily: 'Space Grotesk, sans-serif', color }}>{count}</span>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{label}</span>
            </div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
          {CLASSES.map((cls) => {
            const students = MOCK_STUDENTS.filter((s) => s.section === cls.id.replace('CSE-', ''));
            const redCount = students.filter((s) => s.riskLevel === 'red').length;
            return (
              <div key={cls.id} className="card" style={{ padding: '20px', cursor: 'pointer' }} onClick={() => setSelectedClass(cls)}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                  <div style={{ width: '40px', height: '40px', background: 'rgba(79,142,247,0.1)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Users size={18} color="#4f8ef7" />
                  </div>
                  {redCount > 0 && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#ef4444', fontWeight: '600' }}>
                      <AlertTriangle size={11} /> {redCount} at risk
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '15px', fontWeight: '700', marginBottom: '2px' }}>{cls.name}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '14px' }}>Semester {cls.semester} · {cls.count} students</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '12px', color: '#4f8ef7' }}>View class →</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="fade-in-up">
      <PageHeader
        title={selectedClass.name}
        subtitle={`Semester ${selectedClass.semester} · Students sorted by risk score`}
        action={
          <button className="btn btn-ghost" onClick={() => setSelectedClass(null)} style={{ fontSize: '12px' }}>← All Classes</button>
        }
      />

      {/* Controls */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
          <Search size={13} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input className="input" placeholder="Search students..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ paddingLeft: '30px' }} />
        </div>
        <select className="input" value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={{ width: 'auto', minWidth: '140px' }}>
          <option value="risk">Sort: Risk Score</option>
          <option value="attendance">Sort: Attendance ↑</option>
          <option value="name">Sort: Name</option>
        </select>
      </div>

      {/* Student table */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr className="table-header">
              {['Student', 'Roll No', 'Risk Level', 'Attendance', 'Last Active', 'Marks Avg', ''].map((h) => (
                <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((s) => {
              const avgMark = Math.round(Object.values(s.marks).reduce((a, b) => a + b, 0) / Object.values(s.marks).length);
              return (
                <tr key={s.id} className="table-row" style={{ cursor: 'pointer' }} onClick={() => navigate(`/teacher/student/${s.id}`)}>
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: s.riskLevel === 'red' ? 'rgba(239,68,68,0.15)' : s.riskLevel === 'yellow' ? 'rgba(245,158,11,0.15)' : 'rgba(34,197,94,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '700', color: s.riskLevel === 'red' ? '#ef4444' : s.riskLevel === 'yellow' ? '#f59e0b' : '#22c55e', flexShrink: 0 }}>
                        {s.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <span style={{ fontSize: '13px', fontWeight: '500' }}>{s.name}</span>
                    </div>
                  </td>
                  <td style={{ padding: '12px 14px', fontSize: '12px', color: 'var(--text-secondary)' }}>{s.rollNo}</td>
                  <td style={{ padding: '12px 14px' }}><RiskBadge level={s.riskLevel} score={s.riskScore} /></td>
                  <td style={{ padding: '12px 14px', fontSize: '12px', fontWeight: '600', color: s.attendance < 75 ? '#ef4444' : 'var(--text-primary)' }}>{s.attendance}%</td>
                  <td style={{ padding: '12px 14px', fontSize: '12px', color: 'var(--text-muted)' }}>{s.lastActive}</td>
                  <td style={{ padding: '12px 14px', fontSize: '12px', fontWeight: '600', color: avgMark < 60 ? '#ef4444' : avgMark < 75 ? '#f59e0b' : '#22c55e' }}>{avgMark}%</td>
                  <td style={{ padding: '12px 14px' }}><ChevronRight size={14} color="var(--text-muted)" /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
