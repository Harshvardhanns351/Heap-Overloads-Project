import React, { useState } from 'react';
import { PageHeader, RiskBadge } from '../../components/UI';
import { MOCK_STUDENTS } from '../../store';
import { Bell, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ALERTS = [
  { student: MOCK_STUDENTS[0], message: 'Last active 5 days ago, attendance 62%, recent marks dropped 20%.', time: '2h ago', severity: 'red' },
  { student: MOCK_STUDENTS[3], message: 'Attendance dropped to 71%, 3 assignments late this month.', time: '8h ago', severity: 'yellow' },
];

export default function TeacherAlerts() {
  const navigate = useNavigate();
  return (
    <div className="fade-in-up" style={{ maxWidth: '680px' }}>
      <PageHeader title="Risk Alerts" subtitle="Students flagged by the wellbeing engine — no self-reporting, purely behavioral" />

      <div style={{ marginBottom: '20px', padding: '12px 16px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.18)', borderRadius: '10px', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
        <strong style={{ color: '#ef4444' }}>How alerts work:</strong> The wellbeing engine runs nightly, scoring each student on behavioral signals — activity gaps, late submissions, attendance drops, and marks trends. No mood surveys. No self-reporting. Just observable patterns.
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {ALERTS.map((alert, i) => (
          <div key={i} className="card" style={{ padding: '16px 20px', borderLeft: `3px solid ${alert.severity === 'red' ? '#ef4444' : '#f59e0b'}` }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: alert.severity === 'red' ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '700', color: alert.severity === 'red' ? '#ef4444' : '#f59e0b', flexShrink: 0 }}>
                {alert.student.name.split(' ').map(n => n[0]).join('')}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                  <span style={{ fontSize: '13px', fontWeight: '600' }}>{alert.student.name}</span>
                  <RiskBadge level={alert.severity} score={alert.student.riskScore} />
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginLeft: 'auto' }}>{alert.time}</span>
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.5', marginBottom: '12px' }}>{alert.message}</p>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="btn btn-ghost" onClick={() => navigate(`/teacher/student/${alert.student.id}`)} style={{ fontSize: '11px', padding: '5px 12px' }}>
                    <Eye size={12} /> View Student
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}

        <div style={{ textAlign: 'center', padding: '16px', fontSize: '12px', color: 'var(--text-muted)' }}>
          Algorithms run at midnight · Next check in 18 hours
        </div>
      </div>
    </div>
  );
}
