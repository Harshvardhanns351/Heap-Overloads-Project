import React, { useEffect, useState, useRef, useMemo } from 'react';
import useAppStore from '../../store';
import { api } from '../../api';
import { PageHeader, ProgressBar, Tabs } from '../../components/UI';
import {
  AlertTriangle, Download, Upload, CheckCircle2, Loader2,
  FileText, FileSpreadsheet, X, Users, TrendingDown, FileBadge
} from 'lucide-react';
import * as XLSX from 'xlsx';
import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';

// Point pdf.js worker to the bundled worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

// ─── Parsers & Helpers ────────────────────────────────────────────────────────
function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  return lines.slice(1).map(line => {
    const vals = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
    const obj = {};
    headers.forEach((h, i) => { obj[h] = vals[i] ?? ''; });
    return obj;
  });
}

function normaliseRow(raw) {
  const get = (...keys) => {
    for (const k of keys) {
      const hit = Object.keys(raw).find(rk => rk.toLowerCase().replace(/[\s_-]/g, '') === k.toLowerCase().replace(/[\s_-]/g, ''));
      if (hit && String(raw[hit]).trim()) return String(raw[hit]).trim();
    }
    return '';
  };
  const name = get('name', 'studentname', 'student');
  const rollNo = get('rollno', 'roll', 'rollnumber', 'enrollment', 'id');
  const present = parseInt(get('present', 'dayspresent', 'attended') || '0', 10);
  const total = parseInt(get('total', 'conducted', 'totalclasses') || '0', 10);
  const attendance = total > 0 ? Math.round((present / total) * 100) : 0;
  return { name, rollNo, present, total, attendance, original: raw };
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function TeacherAttendance() {
  const { students, fetchStudents, fetchDefaulters, defaulters } = useAppStore();
  const [tab, setTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadedRows, setUploadedRows] = useState([]);
  const [fileName, setFileName] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    Promise.all([fetchStudents(), fetchDefaulters('CSE-A')]).finally(() => setLoading(false));
  }, []);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setUploading(true);
    try {
      const ext = file.name.split('.').pop().toLowerCase();
      let rows = [];

      if (ext === 'csv') {
        const text = await file.text();
        rows = parseCSV(text).map(normaliseRow);
      } else if (ext === 'xlsx' || ext === 'xls') {
        const buf = await file.arrayBuffer();
        const wb = XLSX.read(buf, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        rows = XLSX.utils.sheet_to_json(ws, { defval: '' }).map(normaliseRow);
      }

      if (rows.length > 0) {
        setUploadedRows(rows);
        setTab('preview');
      }
    } catch (err) {
      alert('Parse failed: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const currentDefaulters = useMemo(() => {
    // If we have uploaded rows, show those that are < 75%
    if (uploadedRows.length > 0) return uploadedRows.filter(r => r.attendance < 75);
    // Otherwise fallback to API defaulters
    return defaulters || [];
  }, [uploadedRows, defaulters]);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <Loader2 size={32} className="animate-spin" style={{ color: 'var(--accent)' }} />
    </div>
  );

  return (
    <div className="fade-in-up" style={{ maxWidth: '1000px', margin: '0 auto', padding: '2rem 1rem' }}>
      <PageHeader
        title="Attendance Tracking"
        subtitle="Upload class records to auto-flag students below 75% threshold"
        action={
          <div style={{ display: 'flex', gap: '8px' }}>
            <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFile} accept=".csv,.xlsx,.xls" />
            <button className="btn" onClick={() => fileInputRef.current.click()} disabled={uploading}>
              {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
              {uploading ? 'Processing...' : 'Upload Record'}
            </button>
            <button className="btn" onClick={() => {/* export logic */}} disabled={currentDefaulters.length === 0}>
              <Download size={14} /> Export Defaulters
            </button>
          </div>
        }
      />

      <Tabs 
        tabs={[
          { key: 'overview', label: 'Overview' }, 
          { key: 'defaulters', label: `Defaulters (${currentDefaulters.length})` },
          ...(uploadedRows.length > 0 ? [{ key: 'preview', label: 'Recently Uploaded' }] : [])
        ]} 
        active={tab} 
        onChange={setTab} 
      />

      {tab === 'overview' && (
        <div className="premium-card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border)' }}>
                {['Student', 'Roll No', 'Attendance %', 'Status'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {students.filter(s => s.role === 'student').map(s => {
                const att = 85; // Mock/Placeholder for overview
                return (
                  <tr key={s.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '14px 16px', fontSize: '13px', fontWeight: 600 }}>{s.name}</td>
                    <td style={{ padding: '14px 16px', fontSize: '12px', color: 'var(--text-muted)' }}>{s.roll_no || '-'}</td>
                    <td style={{ padding: '14px 16px', minWidth: '150px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 800, width: '38px', color: att < 75 ? 'var(--status-err)' : 'var(--status-ok)' }}>{att}%</span>
                        <ProgressBar value={att} color={att < 75 ? 'var(--status-err)' : 'var(--status-ok)'} height={5} />
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span className={att < 75 ? 'badge-red' : 'badge-green'}>{att < 75 ? 'Defaulter' : 'OK'}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'defaulters' && (
        <div className="fade-in-up" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
          {currentDefaulters.length === 0 && (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '64px 20px', color: 'var(--text-muted)' }}>
              <CheckCircle2 size={32} style={{ margin: '0 auto 16px', color: 'var(--status-ok)', opacity: 0.5 }} />
              No defaulters found — high engagement across the class.
            </div>
          )}
          {currentDefaulters.map((d, i) => (
            <div key={i} className="premium-card" style={{ borderLeft: '3px solid var(--status-err)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
                <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 800, color: 'var(--status-err)' }}>
                  {(d.student_name || d.name || '?').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', fontWeight: 700 }}>{d.student_name || d.name}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Roll: {d.roll_no || d.rollNo || '-'}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '20px', fontWeight: 900, color: 'var(--status-err)', fontFamily: 'Space Grotesk' }}>{d.attendance || d.attendance_percentage}%</div>
                  <div style={{ fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Defaulter</div>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'rgba(239,68,68,0.05)', borderRadius: '8px', fontSize: '11px', color: '#fca5a5' }}>
                <span>Threshold breach detected</span>
                <span style={{ fontWeight: 800 }}>- {75 - (d.attendance || d.attendance_percentage)}% gap</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'preview' && (
        <div className="fade-in-up">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>File: <strong>{fileName}</strong> · {uploadedRows.length} students found</div>
            <button className="btn" onClick={() => setUploadedRows([])} style={{ color: 'var(--status-err)' }}>Clear</button>
          </div>
          <div className="premium-card" style={{ padding: 0, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border)' }}>
                  {['Name', 'Roll No', 'Attended', 'Total', 'Status'].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {uploadedRows.map((r, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: 600 }}>{r.name || '—'}</td>
                    <td style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--text-muted)' }}>{r.rollNo || '—'}</td>
                    <td style={{ padding: '12px 16px', fontSize: '13px' }}>{r.present}</td>
                    <td style={{ padding: '12px 16px', fontSize: '13px' }}>{r.total}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span className={r.attendance < 75 ? 'badge-red' : 'badge-green'}>{r.attendance}%</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
