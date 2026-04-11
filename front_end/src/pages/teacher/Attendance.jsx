import React, { useEffect, useState, useRef } from 'react';
import useAppStore from '../../store';
import { api } from '../../api';
import { PageHeader, ProgressBar, Tabs } from '../../components/UI';
import { AlertTriangle, Download, Upload, CheckCircle2, Loader2, FileText, FileSpreadsheet, X, Users, TrendingDown } from 'lucide-react';
import * as XLSX from 'xlsx';
import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';

// Point pdf.js worker to the bundled worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

// ─── Helpers (Merged from Main) ───────────────────────────────────────────────────

/** Parse a CSV text into array-of-objects using first row as headers */
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

/** Bulletproof PDF table parser */
async function parsePDFItems(pdfDoc) {
  const allItems = [];
  for (let p = 1; p <= pdfDoc.numPages; p++) {
    const page    = await pdfDoc.getPage(p);
    const content = await page.getTextContent();
    const vp      = page.getViewport({ scale: 1 });
    content.items.forEach(item => {
      const str = item.str.trim();
      if (!str) return;
      allItems.push({ str, x: item.transform[4], y: vp.height - item.transform[5], page: p });
    });
  }
  if (allItems.length === 0) return [];

  allItems.sort((a, b) => a.page - b.page || a.y - b.y || a.x - b.x);

  const rawRows = [];
  let cur = [allItems[0]];
  for (let i = 1; i < allItems.length; i++) {
    const prev = allItems[i - 1], item = allItems[i];
    if (item.page === prev.page && Math.abs(item.y - prev.y) < 10) cur.push(item);
    else { rawRows.push(cur); cur = [item]; }
  }
  rawRows.push(cur);

  const KW = ['name','roll','present','total','attendance','branch','semester','columns','no'];
  let headerIdx = 0, bestScore = 0;
  for (let i = 0; i < Math.min(rawRows.length, 8); i++) {
    const txt   = rawRows[i].map(t => t.str).join(' ').toLowerCase();
    const score = KW.filter(k => txt.includes(k)).length;
    if (score > bestScore) { bestScore = score; headerIdx = i; }
  }
  if (bestScore < 2) return [];

  const hTokens = [...rawRows[headerIdx]].sort((a, b) => a.x - b.x);
  const cols = [];
  for (const tok of hTokens) {
    if (cols.length > 0) {
      const last = cols[cols.length - 1];
      if (tok.x - last.x < 40) {
        last.label += ' ' + tok.str;
        continue;
      }
    }
    cols.push({ label: tok.str, x: tok.x });
  }

  const nearest = (x) => {
    let bi = 0, bd = Infinity;
    cols.forEach((c, i) => { const d = Math.abs(x - c.x); if (d < bd) { bd = d; bi = i; } });
    return bi;
  };

  const dataRows = rawRows.slice(headerIdx + 1);
  return dataRows.map(tokens => {
    const obj = {};
    cols.forEach(c => { obj[c.label] = ''; });
    [...tokens].sort((a, b) => a.x - b.x).forEach(tok => {
      const key = cols[nearest(tok.x)].label;
      obj[key]  = obj[key] ? obj[key] + ' ' + tok.str : tok.str;
    });
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
  const getP = (...keys) => {
    for (const k of keys) {
      const hit = Object.keys(raw).find(rk => rk.toLowerCase().includes(k.toLowerCase()));
      if (hit && String(raw[hit]).trim()) return String(raw[hit]).trim();
    }
    return '';
  };

  const name = get('name','studentname','student') || getP('name','student');
  const rollNo = get('rollno','roll','rollnumber','enrollment','id') || getP('roll');
  let branch = get('branch','dept','department','stream') || getP('branch','dept');
  let semester = get('semester','sem','year') || getP('semester','sem');

  const branchSplit = (branch || semester || '').match(/^([A-Za-z]+)\s+(\d+)$/);
  if (branchSplit) {
    branch = branchSplit[1];
    semester = branchSplit[2];
  }

  const present = parseInt(get('present','dayspresent','attended') || getP('present','attend'), 10) || 0;
  const total = parseInt(get('totalcolumns','total','totalclasses','totaldays','conducted') || getP('total','conduct'), 10) || 0;
  const pctRaw = get('attendance','percentage','pct') || getP('attendance','percent');
  const pct = total > 0 ? Math.round((present / total) * 100) : (parseFloat(pctRaw) || 0);

  return { name, rollNo, branch, semester, present, total, attendance: pct };
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

const exportCSV = (rows) => {
  const headers = ['Name', 'Roll No', 'Branch', 'Semester', 'Present', 'Total', 'Attendance %'];
  const lines = [headers.join(','), ...rows.map(r => [r.student_name, r.roll_no, r.class_id, '', r.present_days, r.total_days, r.attendance_percentage].join(','))];
  downloadBlob(new Blob([lines.join('\n')], { type: 'text/csv' }), 'attendance_report.csv');
};

// ─── Component ──────────────────────────────────────────────────────────────────

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
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleBulkUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      // Basic CSV parser logic for now or use the helpers above for more advanced files
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

  const handleExport = () => {
    exportCSV(defaulters);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#606060' }} />
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
                  {['Student', 'Roll No', 'Attendance %', 'Status'].map((h) => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {students.filter(s => s.class_id === 'CSE-A').map((s) => {
                  // Mocking dynamic data for overview if not available in store
                  const attendancePct = 82; // Default
                  return (
                    <tr key={s.id} className="table-row">
                      <td style={{ padding: '11px 14px', fontSize: '13px', fontWeight: '500' }}>{s.name || 'Unknown'}</td>
                      <td style={{ padding: '11px 14px', fontSize: '12px', color: 'var(--text-muted)' }}>{s.roll_no || '-'}</td>
                      <td style={{ padding: '11px 14px', minWidth: '140px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontSize: '13px', fontWeight: '700', color: attendancePct < 75 ? 'var(--status-err)' : attendancePct < 85 ? 'var(--status-warn)' : 'var(--status-ok)', minWidth: '36px' }}>{attendancePct}%</span>
                          <ProgressBar value={attendancePct} color={attendancePct < 75 ? 'var(--status-err)' : attendancePct < 85 ? 'var(--status-warn)' : 'var(--status-ok)'} height={5} />
                        </div>
                      </td>
                      <td style={{ padding: '11px 14px' }}>
                        {attendancePct < 75 ? (
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
          ) : (
            <div className="p-8 text-center text-slate-500">No students in class</div>
          )}
        </div>
      )}

      {tab === 'defaulters' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {defaulters.length === 0 && <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>No defaulters this month 🎉</div>}
          {defaulters.map((s) => {
            const absent = s.total_days - s.present_days;
            return (
              <div key={s.student_id} className="card" style={{ padding: '16px 20px', borderLeft: '3px solid var(--status-err)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'rgba(239,68,68,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '700', color: 'var(--status-err)', flexShrink: 0 }}>
                    {s.student_name?.split(' ').map(n => n[0]).join('') || '?'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '2px' }}>{s.student_name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{s.roll_no || '-'} · {absent} days absent out of {s.total_days}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '22px', fontWeight: '800', fontFamily: 'Space Grotesk', color: 'var(--status-err)' }}>{s.attendance_percentage}%</div>
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