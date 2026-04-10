import React, { useEffect, useState } from 'react';
import { PageHeader } from '../../components/UI';
import { useAppStore } from '../../store';
import { Bell, Eye, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function TeacherAlerts() {
  const { alerts, fetchAlerts, markAlertRead, students, fetchStudents } = useAppStore();
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      await Promise.all([fetchAlerts(), fetchStudents()]);
      setLoading(false);
    }
    loadData();
  }, []);

  const getStudent = (studentId) => students.find(s => s.id === studentId);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
      </div>
    );
  }

  return (
    <div className="fade-in-up" style={{ maxWidth: '680px' }}>
      <PageHeader title="Risk Alerts" subtitle="Students flagged by the wellbeing engine — no self-reporting, purely behavioral" />

      <div style={{ marginBottom: '20px', padding: '12px 16px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.18)', borderRadius: '10px', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
        <strong style={{ color: '#ef4444' }}>How alerts work:</strong> The wellbeing engine runs nightly, scoring each student on behavioral signals — activity gaps, late submissions, attendance drops, and marks trends. No mood surveys. No self-reporting. Just observable patterns.
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {alerts.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
            <Bell size={40} className="mx-auto mb-4 opacity-50" />
            <p>No alerts yet. The wellbeing engine runs at midnight.</p>
          </div>
        )}
        
        {alerts.map((alert) => {
          const student = getStudent(alert.student_id);
          return (
            <div key={alert.id} className="card" style={{ padding: '16px 20px', borderLeft: `3px solid ${alert.severity === 'red' ? '#ef4444' : '#f59e0b'}` }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: alert.severity === 'red' ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '700', color: alert.severity === 'red' ? '#ef4444' : '#f59e0b', flexShrink: 0 }}>
                  {student?.name?.split(' ').map(n => n[0]).join('') || '?'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                    <span style={{ fontSize: '13px', fontWeight: '600' }}>{student?.name || 'Unknown Student'}</span>
                    <span style={{ 
                      padding: '2px 8px', 
                      borderRadius: '99px', 
                      fontSize: '10px', 
                      fontWeight: '600',
                      background: alert.severity === 'red' ? '#FCEBEB' : '#FAEEDA',
                      color: alert.severity === 'red' ? '#A32D2D' : '#854F0B',
                    }}>
                      {alert.severity.toUpperCase()}
                    </span>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginLeft: 'auto' }}>
                      {new Date(alert.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.5', marginBottom: '12px' }}>{alert.message}</p>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                      className="btn btn-ghost" 
                      onClick={() => navigate(`/teacher/student/${alert.student_id}`)} 
                      style={{ fontSize: '11px', padding: '5px 12px' }}
                    >
                      <Eye size={12} /> View Student
                    </button>
                    {!alert.read && (
                      <button 
                        className="btn btn-ghost" 
                        onClick={() => markAlertRead(alert.id)} 
                        style={{ fontSize: '11px', padding: '5px 12px' }}
                      >
                        Mark as Read
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        <div style={{ textAlign: 'center', padding: '16px', fontSize: '12px', color: 'var(--text-muted)' }}>
          Algorithms run at midnight · Next check in 18 hours
        </div>
      </div>
    </div>
  );
}