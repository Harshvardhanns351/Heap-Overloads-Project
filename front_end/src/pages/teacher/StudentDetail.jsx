import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageHeader, RiskBadge, ProgressBar } from '../../components/UI';
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer } from 'recharts';
import { AlertTriangle, ArrowLeft, Loader2 } from 'lucide-react';

const authGet = (url) =>
  fetch(`http://localhost:8000/api${url}`, {
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
  }).then((r) => (r.ok ? r.json() : null));

export default function StudentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [student, setStudent] = useState(null);
  const [marks, setMarks] = useState([]);
  const [riskScore, setRiskScore] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [coding, setCoding] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      authGet(`/users/${id}`),
      authGet(`/risk-scores/?student_id=${id}&limit=1`),
      authGet(`/alerts/mine`),
    ])
      .then(([s, rs, al]) => {
        setStudent(s);
        setRiskScore(Array.isArray(rs) && rs.length > 0 ? rs[0] : null);
        setAlerts(Array.isArray(al) ? al.filter((a) => a.student_id === +id) : []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading)
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
      </div>
    );

  if (!student || student.detail)
    return <div style={{ color: 'var(--text-muted)', padding: '40px' }}>Student not found.</div>;

  const riskLevel = riskScore?.level?.toLowerCase() || 'green';
  const riskColor = riskLevel === 'red' ? '#ef4444' : riskLevel === 'yellow' ? '#f59e0b' : '#22c55e';

  return (
    <div className="fade-in-up">
      <button className="btn btn-ghost" onClick={() => navigate(-1)} style={{ marginBottom: '16px', fontSize: '12px' }}>
        <ArrowLeft size={13} /> Back to Class
      </button>

      <div className="card" style={{ padding: '20px', marginBottom: '20px', display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
        <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: `${riskColor}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: '700', color: riskColor, flexShrink: 0 }}>
          {student.name?.split(' ').map((n) => n[0]).join('')}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '6px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '700' }}>{student.name}</h2>
            {riskScore && <RiskBadge level={riskLevel} score={riskScore.score} />}
          </div>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            {[student.email, `Class: ${student.class_id || '—'}`, `Sem ${student.semester || '—'}`].map((t, i) => (
              <span key={i} style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{t}</span>
            ))}
          </div>
        </div>
        {riskScore && (
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '36px', fontWeight: '800', color: riskColor }}>{riskScore.score}</div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Risk Score</div>
          </div>
        )}
      </div>

      <div className="card" style={{ padding: '20px', marginBottom: '20px' }}>
        <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertTriangle size={14} color="#f59e0b" /> Behavioral Signals
          <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '400' }}>— inferred, not self-reported</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {[
            { label: 'Risk level', value: riskScore?.level || 'No data', flag: riskLevel === 'red' },
            { label: 'Active alerts', value: `${alerts.length} alerts`, flag: alerts.length > 0 },
            { label: 'Class', value: student.class_id || '—', flag: false },
            { label: 'Goal', value: student.goal || 'Not set', flag: false },
          ].map((sig, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '9px 12px', background: 'var(--bg-elevated)', borderRadius: '8px', border: `1px solid ${sig.flag ? 'rgba(239,68,68,0.18)' : 'var(--border-soft)'}` }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: sig.flag ? '#ef4444' : 'rgba(255,255,255,0.15)', flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: '12px', color: 'var(--text-secondary)' }}>{sig.label}</span>
              <span style={{ fontSize: '12px', fontWeight: '600', color: sig.flag ? '#ef4444' : 'var(--text-primary)' }}>{sig.value}</span>
            </div>
          ))}
        </div>
      </div>

      {alerts.length > 0 && (
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '12px' }}>Recent Alerts</div>
          {alerts.slice(0, 3).map((a) => (
            <div key={a.id} style={{ padding: '10px 12px', background: 'var(--bg-elevated)', borderRadius: '8px', marginBottom: '8px', borderLeft: `3px solid ${a.severity === 'red' ? '#ef4444' : '#f59e0b'}` }}>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{a.message}</div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>{new Date(a.created_at).toLocaleDateString()}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
