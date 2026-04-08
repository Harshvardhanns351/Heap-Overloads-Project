import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAppStore from '../../store';
import { PageHeader } from '../../components/UI';
import { Search, ChevronRight, AlertTriangle, Users, Loader2 } from 'lucide-react';

const CLASSES = [
  { id: 'CSE-A', name: 'CSE Section A', semester: 6, branch: 'CSE' },
  { id: 'CSE-B', name: 'CSE Section B', semester: 6, branch: 'CSE' },
];

export default function TeacherClasses() {
  const { students, fetchStudents, alerts, fetchAlerts } = useAppStore();
  const [selectedClass, setSelectedClass] = useState(null);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('risk');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      await Promise.all([fetchStudents(), fetchAlerts()]);
      setLoading(false);
    }
    loadData();
  }, []);

  const classStudents = students.filter(s => 
    !selectedClass || s.class_id === selectedClass.id
  );

  const filtered = classStudents
    .filter((s) => s.name?.toLowerCase().includes(search.toLowerCase()) || s.roll_no?.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'name') return (a.name || '').localeCompare(b.name || '');
      return 0;
    });

  const riskCounts = { red: 0, yellow: 0, green: 0 };
  students.forEach(s => {
    const studentAlerts = alerts.filter(a => a.student_id === s.id && a.severity === 'red');
    if (studentAlerts.length > 0) riskCounts.red++;
    else riskCounts.yellow++;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
      </div>
    );
  }

  if (!selectedClass) {
    return (
      <div className="fade-in-up">
        <PageHeader title="My Classes" subtitle="Select a class to view student analytics and risk scores" />
        <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
          {[
            { label: 'At Risk', count: riskCounts.red, color: '#ef4444' },
            { label: 'Watching', count: riskCounts.yellow, color: '#f59e0b' },
            { label: 'On Track', count: students.length - riskCounts.red - riskCounts.yellow, color: '#22c55e' },
          ].map(({ label, count, color }) => (
            <div key={label} style={{ padding: '10px 18px', background: `${color}10`, border: `1px solid ${color}25`, borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '18px', fontWeight: '700', fontFamily: 'Space Grotesk, sans-serif', color }}>{count}</span>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{label}</span>
            </div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
          {CLASSES.map((cls) => {
            const classStu = students.filter(s => s.class_id === cls.id);
            const redCount = classStu.filter(s => alerts.some(a => a.student_id === s.id && a.severity === 'red')).length;
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
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '14px' }}>Semester {cls.semester} · {classStu.length} students</div>
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

      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
          <Search size={13} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input className="input" placeholder="Search students..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ paddingLeft: '30px' }} />
        </div>
        <select className="input" value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={{ width: 'auto', minWidth: '140px' }}>
          <option value="risk">Sort: Risk Score</option>
          <option value="name">Sort: Name</option>
        </select>
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        {filtered.length > 0 ? (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr className="table-header">
                {['Student', 'Roll No', 'Risk Alerts', 'Email', ''].map((h) => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => {
                const studentAlerts = alerts.filter(a => a.student_id === s.id);
                const riskLevel = studentAlerts.some(a => a.severity === 'red') ? 'RED' : studentAlerts.some(a => a.severity === 'yellow') ? 'YELLOW' : 'GREEN';
                return (
                  <tr key={s.id} className="table-row" style={{ cursor: 'pointer' }} onClick={() => navigate(`/teacher/student/${s.id}`)}>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: riskLevel === 'RED' ? 'rgba(239,68,68,0.15)' : riskLevel === 'YELLOW' ? 'rgba(245,158,11,0.15)' : 'rgba(34,197,94,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '700', color: riskLevel === 'RED' ? '#ef4444' : riskLevel === 'YELLOW' ? '#f59e0b' : '#22c55e', flexShrink: 0 }}>
                          {s.name?.split(' ').map(n => n[0]).join('') || '?'}
                        </div>
                        <span style={{ fontSize: '13px', fontWeight: '500' }}>{s.name || 'Unknown'}</span>
                      </div>
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: '12px', color: 'var(--text-secondary)' }}>{s.roll_no || '-'}</td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ 
                        padding: '4px 10px', 
                        borderRadius: '99px', 
                        fontSize: '10px', 
                        fontWeight: '600',
                        background: riskLevel === 'RED' ? '#FCEBEB' : riskLevel === 'YELLOW' ? '#FAEEDA' : '#E1F5EE',
                        color: riskLevel === 'RED' ? '#A32D2D' : riskLevel === 'YELLOW' ? '#854F0B' : '#0F6E56',
                      }}>
                        {studentAlerts.length > 0 ? `${studentAlerts.length} alerts` : 'No alerts'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: '12px', color: 'var(--text-muted)' }}>{s.email}</td>
                    <td style={{ padding: '12px 14px' }}><ChevronRight size={14} color="var(--text-muted)" /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="p-8 text-center text-slate-500">No students in this class</div>
        )}
      </div>
    </div>
  );
}