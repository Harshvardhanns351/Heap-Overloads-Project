import React, { useState } from 'react';
import { MOCK_STUDENTS } from '../../store';
import { PageHeader, ProgressBar, Tabs } from '../../components/UI';
import { AlertTriangle, Download, Upload, CheckCircle2 } from 'lucide-react';

export default function TeacherAttendance() {
  const [tab, setTab] = useState('overview');
  const defaulters = MOCK_STUDENTS.filter((s) => s.attendance < 75);

  return (
    <div className="fade-in-up">
      <PageHeader
        title="Attendance"
        subtitle="Monthly attendance tracking · Defaulters auto-flagged at <75%"
        action={
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-ghost" style={{ fontSize: '11px' }}><Upload size={12} /> Bulk Upload CSV</button>
            <button className="btn btn-ghost" style={{ fontSize: '11px' }}><Download size={12} /> Export Defaulters</button>
          </div>
        }
      />

      <Tabs tabs={[{ key: 'overview', label: 'Class Overview' }, { key: 'defaulters', label: `Defaulters (${defaulters.length})` }]} active={tab} onChange={setTab} />

      {tab === 'overview' && (
        <div className="card" style={{ overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg-elevated)' }}>
                {['Student', 'Roll No', 'Attendance %', 'Days Present', 'Days Absent', 'Status'].map((h) => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MOCK_STUDENTS.filter(s => s.section === 'A').map((s) => {
                const days = 48;
                const present = Math.round((s.attendance / 100) * days);
                const absent = days - present;
                return (
                  <tr key={s.id} className="table-row">
                    <td style={{ padding: '11px 14px', fontSize: '13px', fontWeight: '500' }}>{s.name}</td>
                    <td style={{ padding: '11px 14px', fontSize: '12px', color: 'var(--text-muted)' }}>{s.rollNo}</td>
                    <td style={{ padding: '11px 14px', minWidth: '140px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '13px', fontWeight: '700', color: s.attendance < 75 ? '#ef4444' : s.attendance < 85 ? '#f59e0b' : '#22c55e', minWidth: '36px' }}>{s.attendance}%</span>
                        <ProgressBar value={s.attendance} color={s.attendance < 75 ? '#ef4444' : s.attendance < 85 ? '#f59e0b' : '#22c55e'} height={5} />
                      </div>
                    </td>
                    <td style={{ padding: '11px 14px', fontSize: '12px', color: '#22c55e', fontWeight: '600' }}>{present}</td>
                    <td style={{ padding: '11px 14px', fontSize: '12px', color: absent > 8 ? '#ef4444' : 'var(--text-secondary)', fontWeight: absent > 8 ? '700' : '400' }}>{absent}</td>
                    <td style={{ padding: '11px 14px' }}>
                      {s.attendance < 75 ? (
                        <span className="badge-red" style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '99px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px', width: 'fit-content' }}>
                          <AlertTriangle size={9} /> Defaulter
                        </span>
                      ) : (
                        <span className="badge-green" style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '99px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px', width: 'fit-content' }}>
                          <CheckCircle2 size={9} /> OK
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'defaulters' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {defaulters.length === 0 && <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>No defaulters this month 🎉</div>}
          {defaulters.map((s) => {
            const days = 48;
            const absent = days - Math.round((s.attendance / 100) * days);
            return (
              <div key={s.id} className="card" style={{ padding: '16px 20px', borderLeft: '3px solid #ef4444' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'rgba(239,68,68,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '700', color: '#ef4444', flexShrink: 0 }}>
                    {s.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '2px' }}>{s.name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{s.rollNo} · {absent} days absent out of {days}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '22px', fontWeight: '800', fontFamily: 'Space Grotesk', color: '#ef4444' }}>{s.attendance}%</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{75 - s.attendance}% below threshold</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
