import React, { useEffect, useState, useRef } from 'react';
import useAppStore from '../../store';
import { api } from '../../api';
import { PageHeader, ProgressBar, Tabs } from '../../components/UI';
import { AlertTriangle, Download, Upload, CheckCircle2, Loader2 } from 'lucide-react';

export default function TeacherAttendance() {
  const { students, fetchStudents, defaulters, fetchDefaulters } = useAppStore();
  const [tab, setTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      await Promise.all([fetchStudents(), fetchDefaulters('CSE-A')]);
      setLoading(false);
    }
    loadData();
  }, []);

  const handleBulkUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const text = await file.text();
      const lines = text.trim().split('\n');
      const records = [];
      
      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(',');
        if (parts.length >= 2) {
          records.push({
            student_id: parseInt(parts[0].trim()),
            present: parts[1].trim().toLowerCase() === 'true',
          });
        }
      }

      await api.attendance.bulkUpload('CSE-A', new Date().toISOString().split('T')[0], records);
      alert('Attendance uploaded successfully!');
      await fetchDefaulters('CSE-A');
    } catch (err) {
      alert('Upload failed: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleExport = async () => {
    try {
      const response = await fetch(`http://localhost:8000/api/attendance/export/CSE-A`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'attendance_CSE-A.csv';
      a.click();
    } catch (err) {
      alert('Export failed: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
      </div>
    );
  }

  return (
    <div className="fade-in-up">
      <PageHeader
        title="Attendance"
        subtitle="Monthly attendance tracking · Defaulters auto-flagged at <75%"
        action={
          <div style={{ display: 'flex', gap: '8px' }}>
            <input 
              type="file" 
              accept=".csv" 
              ref={fileInputRef} 
              style={{ display: 'none' }}
              onChange={handleBulkUpload}
            />
            <button 
              className="btn btn-ghost" 
              style={{ fontSize: '11px' }}
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />} 
              {uploading ? 'Uploading...' : 'Bulk Upload CSV'}
            </button>
            <button className="btn btn-ghost" style={{ fontSize: '11px' }} onClick={handleExport}>
              <Download size={12} /> Export Defaulters
            </button>
          </div>
        }
      />

      <Tabs tabs={[{ key: 'overview', label: 'Class Overview' }, { key: 'defaulters', label: `Defaulters (${defaulters.length})` }]} active={tab} onChange={setTab} />

      {tab === 'overview' && (
        <div className="card" style={{ overflow: 'hidden' }}>
          {students.length > 0 ? (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--bg-elevated)' }}>
                  {['Student', 'Roll No', 'Attendance %', 'Days Present', 'Days Absent', 'Status'].map((h) => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {students.filter(s => s.class_id === 'CSE-A').map((s) => {
                  const days = 48;
                  const present = Math.round((Math.random() * 0.3 + 0.6) * days);
                  const absent = days - present;
                  const attendancePct = Math.round((present / days) * 100);
                  return (
                    <tr key={s.id} className="table-row">
                      <td style={{ padding: '11px 14px', fontSize: '13px', fontWeight: '500' }}>{s.name || 'Unknown'}</td>
                      <td style={{ padding: '11px 14px', fontSize: '12px', color: 'var(--text-muted)' }}>{s.roll_no || '-'}</td>
                      <td style={{ padding: '11px 14px', minWidth: '140px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontSize: '13px', fontWeight: '700', color: attendancePct < 75 ? '#ef4444' : attendancePct < 85 ? '#f59e0b' : '#22c55e', minWidth: '36px' }}>{attendancePct}%</span>
                          <ProgressBar value={attendancePct} color={attendancePct < 75 ? '#ef4444' : attendancePct < 85 ? '#f59e0b' : '#22c55e'} height={5} />
                        </div>
                      </td>
                      <td style={{ padding: '11px 14px', fontSize: '12px', color: '#22c55e', fontWeight: '600' }}>{present}</td>
                      <td style={{ padding: '11px 14px', fontSize: '12px', color: absent > 8 ? '#ef4444' : 'var(--text-secondary)', fontWeight: absent > 8 ? '700' : '400' }}>{absent}</td>
                      <td style={{ padding: '11px 14px' }}>
                        {attendancePct < 75 ? (
                          <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '99px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px', width: 'fit-content', background: '#FCEBEB', color: '#A32D2D' }}>
                            <AlertTriangle size={9} /> Defaulter
                          </span>
                        ) : (
                          <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '99px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px', width: 'fit-content', background: '#E1F5EE', color: '#0F6E56' }}>
                            <CheckCircle2 size={9} /> OK
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="p-8 text-center text-slate-500">No students in class</div>
          )}
        </div>
      )}

      {tab === 'defaulters' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {defaulters.length === 0 && <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>No defaulters this month 🎉</div>}
          {defaulters.map((s) => {
            const days = 48;
            const absent = s.total_days - s.present_days;
            return (
              <div key={s.student_id} className="card" style={{ padding: '16px 20px', borderLeft: '3px solid #ef4444' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'rgba(239,68,68,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '700', color: '#ef4444', flexShrink: 0 }}>
                    {s.student_name?.split(' ').map(n => n[0]).join('') || '?'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '2px' }}>{s.student_name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{s.roll_no || '-'} · {absent} days absent out of {s.total_days}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '22px', fontWeight: '800', fontFamily: 'Space Grotesk', color: '#ef4444' }}>{s.attendance_percentage}%</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{75 - s.attendance_percentage}% below threshold</div>
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