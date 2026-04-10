import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';
import { PageHeader, Tabs } from '../../components/UI';
import {
  AlertTriangle, Download, Upload, CheckCircle2,
  FileText, FileSpreadsheet, X, Users, TrendingDown
} from 'lucide-react';

// Point pdf.js worker to the bundled worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

/* Inline progress bar — avoids Tailwind class-string issues with dynamic colors */
function AttBar({ value }) {
  const color = value < 75 ? '#ef4444' : value < 85 ? '#f59e0b' : '#22c55e';
  return (
    <div style={{ flex: 1, height: '5px', background: 'rgba(255,255,255,0.06)', borderRadius: '99px', overflow: 'hidden' }}>
      <div style={{ width: `${Math.min(value, 100)}%`, height: '100%', background: color, borderRadius: '99px', transition: 'width .6s ease' }} />
    </div>
  );
}

// ─── helpers ────────────────────────────────────────────────────────────────

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

/**
 * Parse PDF pages using pdfjs item positions.
 * Uses header X-positions as column buckets so each cell lands in the right column.
 */
async function parsePDFItems(pdfDoc) {
  const allItems = [];
  for (let p = 1; p <= pdfDoc.numPages; p++) {
    const page    = await pdfDoc.getPage(p);
    const content = await page.getTextContent();
    const vp      = page.getViewport({ scale: 1 });
    content.items.forEach(item => {
      const str = item.str.trim();
      if (!str) return;
      const tx = item.transform[4];
      const ty = vp.height - item.transform[5]; // flip Y: top = 0
      allItems.push({ str, x: tx, y: ty, page: p });
    });
  }
  if (allItems.length === 0) return [];

  // Sort top-to-bottom, left-to-right
  allItems.sort((a, b) => a.page - b.page || a.y - b.y || a.x - b.x);

  // ── Step 1: group items into visual rows by Y proximity ──────────────────
  const rawRows = [];
  let cur = [allItems[0]];
  for (let i = 1; i < allItems.length; i++) {
    const prev = allItems[i - 1];
    const item = allItems[i];
    if (item.page === prev.page && Math.abs(item.y - prev.y) < 6) {
      cur.push(item);
    } else {
      rawRows.push(cur);
      cur = [item];
    }
  }
  rawRows.push(cur);

  // ── Step 2: find header row (most keyword matches) ───────────────────────
  const KW = ['name', 'roll', 'present', 'total', 'attendance', 'branch', 'semester', 'columns'];
  let headerIdx = 0, bestScore = 0;
  for (let i = 0; i < Math.min(rawRows.length, 8); i++) {
    const txt   = rawRows[i].map(t => t.str).join(' ').toLowerCase();
    const score = KW.filter(k => txt.includes(k)).length;
    if (score > bestScore) { bestScore = score; headerIdx = i; }
  }
  if (bestScore < 2) return []; // no recognisable header

  const headerItems = [...rawRows[headerIdx]].sort((a, b) => a.x - b.x);

  // ── Step 3: build column X-buckets from header positions ─────────────────
  // Each column owns an X range: from its own X to midpoint before next column
  const colBuckets = headerItems.map((h, i) => {
    const next = headerItems[i + 1];
    return {
      label: h.str.trim(),
      xMin:  i === 0 ? -Infinity : (headerItems[i - 1].x + h.x) / 2,
      xMax:  next ? (h.x + next.x) / 2 : Infinity,
    };
  });

  const assignCol = (x) => colBuckets.findIndex(b => x >= b.xMin && x < b.xMax);

  // ── Step 4: map each data row to an object using column buckets ──────────
  const dataRows = rawRows.slice(headerIdx + 1);
  return dataRows.map(items => {
    const obj = {};
    colBuckets.forEach(b => { obj[b.label] = ''; });
    items.forEach(item => {
      const ci = assignCol(item.x);
      if (ci >= 0) {
        const key = colBuckets[ci].label;
        obj[key] = obj[key] ? obj[key] + ' ' + item.str : item.str;
      }
    });
    return obj;
  });
}

/** Normalise a raw row from CSV/Excel/PDF into our attendance record shape */
function normaliseRow(raw) {
  const get = (...keys) => {
    for (const k of keys) {
      const found = Object.keys(raw).find(
        rk => rk.toLowerCase().replace(/[\s_]/g, '') === k.toLowerCase().replace(/[\s_]/g, '')
      );
      if (found && raw[found] !== undefined && String(raw[found]).trim() !== '') return String(raw[found]).trim();
    }
    return '';
  };

  const name     = get('name', 'studentname', 'student');
  const rollNo   = get('rollno', 'roll', 'rollnumber', 'enrollment', 'id');
  const branch   = get('branch', 'dept', 'department', 'stream');
  const semester = get('semester', 'sem', 'year');
  // "Total Columns" is the PDF header variant for total classes
  const present  = parseInt(get('present', 'dayspresent', 'attended', 'classesattended'), 10) || 0;
  const total    = parseInt(get('totalcolumns', 'total', 'totalclasses', 'totaldays', 'conducted'), 10) || 0;
  const pctRaw   = get('attendance', 'attendancepercent', 'percentage', 'pct', '%');
  const pct      = total > 0 ? Math.round((present / total) * 100) : (parseFloat(pctRaw) || 0);

  return { name, rollNo, branch, semester, present, total, attendance: pct };
}

/** Returns true if a row is a real student record (not a summary/footer row) */
function isValidStudentRow(r) {
  if (!r.name) return false;
  // Reject rows where name looks like a label or percentage
  const nameLower = r.name.toLowerCase().trim();
  const junkNames = ['attendance', 'percentage', 'total', 'average', 'summary', 'name', 'student'];
  if (junkNames.some(j => nameLower.includes(j))) return false;
  // Reject if name is purely numeric or a percentage like "66%"
  if (/^[\d%.\s]+$/.test(r.name)) return false;
  // Must have at least one letter
  if (!/[a-zA-Z]/.test(r.name)) return false;
  return true;
}

/** Download a Blob as a file */
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

/** Export rows to CSV */
function exportCSV(rows) {
  const headers = ['Name', 'Roll No', 'Branch', 'Semester', 'Subject', 'Present', 'Total', 'Attendance %', 'Status'];
  const lines = [headers.join(','), ...rows.map(r => [
    r.name, r.rollNo, r.branch, r.semester, r.subject,
    r.present, r.total, r.attendance + '%',
    r.attendance < 75 ? 'Defaulter' : 'OK'
  ].join(','))];
  downloadBlob(new Blob([lines.join('\n')], { type: 'text/csv' }), 'attendance_defaulters.csv');
}

/** Export rows to a simple HTML table saved as .xls (opens in Excel) */
function exportExcel(rows) {
  const headers = ['Name', 'Roll No', 'Branch', 'Semester', 'Subject', 'Present', 'Total', 'Attendance %', 'Status'];
  const rowsHtml = rows.map(r => `<tr>
    <td>${r.name}</td><td>${r.rollNo}</td><td>${r.branch}</td><td>${r.semester}</td>
    <td>${r.subject}</td><td>${r.present}</td><td>${r.total}</td>
    <td>${r.attendance}%</td><td>${r.attendance < 75 ? 'Defaulter' : 'OK'}</td>
  </tr>`).join('');
  const html = `<table><thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rowsHtml}</tbody></table>`;
  downloadBlob(new Blob([html], { type: 'application/vnd.ms-excel' }), 'attendance_defaulters.xls');
}

/** Export rows to a plain-text PDF-like printable HTML */
function exportPDF(rows) {
  const headers = ['Name', 'Roll No', 'Branch', 'Semester', 'Subject', 'Present', 'Total', 'Att%', 'Status'];
  const rowsHtml = rows.map(r => `<tr style="background:${r.attendance < 75 ? '#fff0f0' : '#fff'}">
    <td>${r.name}</td><td>${r.rollNo}</td><td>${r.branch}</td><td>${r.semester}</td>
    <td>${r.subject}</td><td>${r.present}</td><td>${r.total}</td>
    <td style="color:${r.attendance < 75 ? 'red' : 'green'};font-weight:bold">${r.attendance}%</td>
    <td style="color:${r.attendance < 75 ? 'red' : 'green'};font-weight:bold">${r.attendance < 75 ? 'Defaulter' : 'OK'}</td>
  </tr>`).join('');
  const html = `<!DOCTYPE html><html><head><title>Attendance Defaulters</title>
  <style>body{font-family:Arial,sans-serif;padding:20px}h2{color:#1e293b}
  table{width:100%;border-collapse:collapse;font-size:12px}
  th{background:#1e293b;color:#fff;padding:8px 10px;text-align:left}
  td{padding:7px 10px;border-bottom:1px solid #e2e8f0}</style></head>
  <body><h2>Attendance Defaulters Report</h2>
  <p style="color:#64748b;font-size:12px">Generated: ${new Date().toLocaleString()} &nbsp;|&nbsp; Threshold: &lt;75%</p>
  <table><thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rowsHtml}</tbody></table>
  <script>window.onload=()=>window.print()<\/script></body></html>`;
  const win = window.open('', '_blank');
  if (win) { win.document.write(html); win.document.close(); }
}

/** Export rows to DOCX-like RTF (opens in Word) */
function exportDOCX(rows) {
  const lines = rows.map(r =>
    `${r.name} | ${r.rollNo} | ${r.branch} | Sem ${r.semester} | ${r.subject} | ${r.present}/${r.total} | ${r.attendance}% | ${r.attendance < 75 ? 'DEFAULTER' : 'OK'}`
  );
  const content = `Attendance Defaulters Report\nGenerated: ${new Date().toLocaleString()}\nThreshold: <75%\n\n` +
    `Name | Roll No | Branch | Semester | Subject | Present/Total | Attendance% | Status\n` +
    `${'─'.repeat(100)}\n` + lines.join('\n');
  downloadBlob(new Blob([content], { type: 'application/msword' }), 'attendance_defaulters.doc');
}

// ─── component ───────────────────────────────────────────────────────────────

export default function TeacherAttendance() {
  const [tab, setTab] = useState('overview');
  const [uploadedRows, setUploadedRows] = useState([]);
  const [fileName, setFileName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [exportMenu, setExportMenu] = useState(false);
  const fileRef = useRef();

  const allRows     = uploadedRows;
  const defaulters  = allRows.filter(r => r.attendance < 75);
  const hasData     = allRows.length > 0;

  // ── file ingestion ──────────────────────────────────────────────────────
  const handleFile = async (file) => {
    if (!file) return;
    setUploadError('');
    setUploading(true);
    setFileName(file.name);

    try {
      const ext = file.name.split('.').pop().toLowerCase();

      if (ext === 'csv') {
        // ── CSV ──────────────────────────────────────────────────────────
        const text = await file.text();
        const raw  = parseCSV(text);
        const rows = raw.map(normaliseRow).filter(isValidStudentRow);
        if (rows.length === 0) throw new Error('No valid rows found. Check your column headers.');
        setUploadedRows(rows);

      } else if (ext === 'xls' || ext === 'xlsx') {
        // ── Excel via xlsx npm package ────────────────────────────────────
        const buf  = await file.arrayBuffer();
        const wb   = XLSX.read(buf, { type: 'array' });
        const ws   = wb.Sheets[wb.SheetNames[0]];
        const raw  = XLSX.utils.sheet_to_json(ws, { defval: '' });
        const rows = raw.map(normaliseRow).filter(isValidStudentRow);
        if (rows.length === 0) throw new Error('No valid rows found. Ensure your sheet has Name, Roll No, Present, Total columns.');
        setUploadedRows(rows);

      } else if (ext === 'pdf') {
        // ── PDF via pdfjs-dist — positional table parser ──────────────────
        const buf  = await file.arrayBuffer();
        const pdf  = await pdfjsLib.getDocument({ data: new Uint8Array(buf) }).promise;
        const raw  = await parsePDFItems(pdf);
        const rows = raw.map(normaliseRow).filter(isValidStudentRow);
        if (rows.length === 0) {
          throw new Error(
            'Could not extract a table from this PDF. ' +
            'Make sure the PDF has a text-based table with headers like Name, Roll No, Present, Total. ' +
            'Scanned/image PDFs are not supported — export as CSV or Excel instead.'
          );
        }
        setUploadedRows(rows);

      } else if (ext === 'docx') {
        // ── DOCX via mammoth ──────────────────────────────────────────────
        const buf    = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer: buf });
        const text   = result.value;
        // mammoth outputs table rows as lines, cells separated by \t or spaces
        // Try tab-separated first, then space-split heuristic
        const lines  = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        let raw = [];
        if (lines.length >= 2) {
          // Check if tab-separated
          if (lines[0].includes('\t')) {
            const headers = lines[0].split('\t').map(h => h.trim());
            raw = lines.slice(1).map(line => {
              const vals = line.split('\t').map(v => v.trim());
              const obj = {};
              headers.forEach((h, i) => { obj[h] = vals[i] ?? ''; });
              return obj;
            });
          } else {
            // Treat each line as a space-separated row (like PDF fallback)
            const headers = lines[0].split(/\s{2,}/).map(h => h.trim()).filter(Boolean);
            raw = lines.slice(1).map(line => {
              const vals = line.split(/\s{2,}/).map(v => v.trim()).filter(Boolean);
              const obj = {};
              headers.forEach((h, i) => { obj[h] = vals[i] ?? ''; });
              return obj;
            });
          }
        }
        const rows = raw.map(normaliseRow).filter(isValidStudentRow);
        if (rows.length === 0) throw new Error('No table data found in DOCX. Ensure the document has a table with Name, Roll No, Present, Total columns.');
        setUploadedRows(rows);

      } else if (ext === 'doc') {
        throw new Error('.doc (old Word format) is not supported client-side. Please save as .docx, .xlsx, or .csv.');

      } else {
        throw new Error(`Unsupported file type ".${ext}". Supported: CSV, XLS, XLSX, PDF, DOCX.`);
      }

      setTab('overview');
    } catch (err) {
      setUploadError(err.message || 'Failed to parse file.');
      setUploadedRows([]);
    }
    setUploading(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const clearData = () => {
    setUploadedRows([]);
    setFileName('');
    setUploadError('');
    if (fileRef.current) fileRef.current.value = '';
  };

  // ── stats ───────────────────────────────────────────────────────────────
  const avgAtt   = hasData ? Math.round(allRows.reduce((s, r) => s + r.attendance, 0) / allRows.length) : 0;
  const safeCount = allRows.filter(r => r.attendance >= 75).length;

  return (
    <div className="fade-in-up">
      <PageHeader
        title="Attendance"
        subtitle="Upload CSV, Excel, PDF or DOCX · Defaulters auto-flagged at <75%"
        action={
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {/* Bulk Upload */}
            <label
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '7px 14px', borderRadius: '8px', cursor: 'pointer',
                background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.3)',
                color: '#a5b4fc', fontSize: '12px', fontWeight: '600',
                transition: 'all .2s'
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(99,102,241,0.22)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(99,102,241,0.12)'}
            >
              <Upload size={13} />
              Bulk Upload
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.xls,.xlsx,.pdf,.docx"
                style={{ display: 'none' }}
                onChange={e => handleFile(e.target.files[0])}
              />
            </label>

            {/* Export Defaulters dropdown */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setExportMenu(v => !v)}
                disabled={defaulters.length === 0}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '7px 14px', borderRadius: '8px', cursor: defaulters.length === 0 ? 'not-allowed' : 'pointer',
                  background: defaulters.length === 0 ? 'rgba(255,255,255,0.04)' : 'rgba(239,68,68,0.12)',
                  border: `1px solid ${defaulters.length === 0 ? 'rgba(255,255,255,0.08)' : 'rgba(239,68,68,0.3)'}`,
                  color: defaulters.length === 0 ? 'var(--text-muted)' : '#fca5a5',
                  fontSize: '12px', fontWeight: '600', transition: 'all .2s'
                }}
              >
                <Download size={13} />
                Export Defaulters {defaulters.length > 0 && `(${defaulters.length})`}
                <span style={{ fontSize: '9px', marginLeft: '2px' }}>▼</span>
              </button>

              {exportMenu && defaulters.length > 0 && (
                <div
                  style={{
                    position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 100,
                    background: '#0f0f2e', border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: '10px', padding: '6px', minWidth: '160px',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
                  }}
                  onMouseLeave={() => setExportMenu(false)}
                >
                  {[
                    { label: 'Export as CSV',   icon: FileText,        fn: () => { exportCSV(defaulters);   setExportMenu(false); } },
                    { label: 'Export as Excel',  icon: FileSpreadsheet, fn: () => { exportExcel(defaulters); setExportMenu(false); } },
                    { label: 'Export as PDF',    icon: FileText,        fn: () => { exportPDF(defaulters);   setExportMenu(false); } },
                    { label: 'Export as DOCX',   icon: FileText,        fn: () => { exportDOCX(defaulters);  setExportMenu(false); } },
                  ].map(({ label, icon: Icon, fn }) => (
                    <button
                      key={label}
                      onClick={fn}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '8px',
                        width: '100%', padding: '8px 10px', borderRadius: '7px',
                        background: 'transparent', border: 'none', cursor: 'pointer',
                        color: '#cbd5e1', fontSize: '12px', fontWeight: '500',
                        transition: 'background .15s', textAlign: 'left'
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.07)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <Icon size={13} style={{ color: '#94a3b8' }} />
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        }
      />

      {/* ── Upload zone / status bar ── */}
      {!hasData ? (
        <div
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
          style={{
            border: '2px dashed rgba(99,102,241,0.3)', borderRadius: '14px',
            padding: '48px 24px', textAlign: 'center', marginBottom: '24px',
            background: 'rgba(99,102,241,0.04)', cursor: 'pointer',
            transition: 'all .2s'
          }}
          onClick={() => fileRef.current?.click()}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.6)'; e.currentTarget.style.background = 'rgba(99,102,241,0.08)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.3)'; e.currentTarget.style.background = 'rgba(99,102,241,0.04)'; }}
        >
          <Upload size={32} style={{ color: '#6366f1', margin: '0 auto 12px', display: 'block' }} />
          <div style={{ fontSize: '15px', fontWeight: '700', color: '#e2e8f0', marginBottom: '6px' }}>
            Drop your attendance file here
          </div>
          <div style={{ fontSize: '12px', color: '#64748b' }}>
            Supports CSV · Excel (.xls / .xlsx) · PDF · DOCX &nbsp;·&nbsp; Defaulters auto-detected at &lt;75%
          </div>
          {uploadError && (
            <div style={{ marginTop: '14px', padding: '10px 16px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', color: '#fca5a5', fontSize: '12px' }}>
              {uploadError}
            </div>
          )}
        </div>
      ) : (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px',
          padding: '10px 16px', background: 'rgba(34,197,94,0.08)',
          border: '1px solid rgba(34,197,94,0.2)', borderRadius: '10px'
        }}>
          <CheckCircle2 size={16} style={{ color: '#22c55e', flexShrink: 0 }} />
          <span style={{ fontSize: '13px', color: '#86efac', fontWeight: '600', flex: 1 }}>
            {fileName} — {allRows.length} students loaded
          </span>
          <button
            onClick={clearData}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '2px' }}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── Stats row ── */}
      {hasData && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
          {[
            { label: 'Total Students', value: allRows.length, icon: Users, color: '#6366f1', bg: 'rgba(99,102,241,0.1)', border: 'rgba(99,102,241,0.2)' },
            { label: 'Defaulters (<75%)', value: defaulters.length, icon: AlertTriangle, color: '#ef4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.2)' },
            { label: 'Safe (≥75%)', value: safeCount, icon: CheckCircle2, color: '#22c55e', bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.2)' },
            { label: 'Class Average', value: avgAtt + '%', icon: TrendingDown, color: avgAtt < 75 ? '#ef4444' : '#f59e0b', bg: avgAtt < 75 ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)', border: avgAtt < 75 ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)' },
          ].map(({ label, value, icon: Icon, color, bg, border }) => (
            <div key={label} style={{ padding: '16px', borderRadius: '12px', background: bg, border: `1px solid ${border}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <Icon size={14} style={{ color }} />
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
              </div>
              <div style={{ fontSize: '26px', fontWeight: '800', color, fontFamily: 'Space Grotesk, sans-serif' }}>{value}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Tabs ── */}
      {hasData && (
        <Tabs
          tabs={[
            { key: 'overview', label: 'Class Overview' },
            { key: 'defaulters', label: `Defaulters (${defaulters.length})` }
          ]}
          active={tab}
          onChange={setTab}
        />
      )}

      {/* ── Overview table ── */}
      {hasData && tab === 'overview' && (
        <div className="card" style={{ overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                {[
                  { label: 'Student Name', icon: null },
                  { label: 'Roll No', icon: null },
                  { label: 'Branch', icon: null },
                  { label: 'Semester', icon: null },
                  { label: 'Classes Present', icon: null },
                  { label: 'Classes Absent', icon: null },
                  { label: 'Total Conducted', icon: null },
                  { label: 'Attendance %', icon: null },
                  { label: 'Status', icon: null },
                ].map(({ label }) => (
                  <th key={label} style={{
                    padding: '11px 14px', textAlign: 'left',
                    fontSize: '10px', fontWeight: '700',
                    color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em',
                    borderBottom: '1px solid rgba(255,255,255,0.06)'
                  }}>{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {allRows.map((r, i) => {
                const absent = r.total > 0 ? r.total - r.present : 0;
                const color  = r.attendance < 75 ? '#ef4444' : r.attendance < 85 ? '#f59e0b' : '#22c55e';
                return (
                  <tr key={i} className="table-row" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '11px 14px', fontSize: '13px', fontWeight: '600', color: '#e2e8f0' }}>{r.name || '—'}</td>
                    <td style={{ padding: '11px 14px', fontSize: '12px', color: '#94a3b8', fontFamily: 'monospace' }}>{r.rollNo || '—'}</td>
                    <td style={{ padding: '11px 14px', fontSize: '12px', color: '#94a3b8' }}>{r.branch || '—'}</td>
                    <td style={{ padding: '11px 14px', fontSize: '12px', color: '#94a3b8', textAlign: 'center' }}>{r.semester || '—'}</td>
                    <td style={{ padding: '11px 14px', fontSize: '13px', fontWeight: '700', color: '#22c55e', textAlign: 'center' }}>{r.present}</td>
                    <td style={{ padding: '11px 14px', fontSize: '13px', fontWeight: absent > 0 ? '700' : '400', color: absent > 0 ? '#f87171' : '#64748b', textAlign: 'center' }}>{absent}</td>
                    <td style={{ padding: '11px 14px', fontSize: '12px', color: '#64748b', textAlign: 'center' }}>{r.total || '—'}</td>
                    <td style={{ padding: '11px 14px', minWidth: '150px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '13px', fontWeight: '800', color, minWidth: '38px', fontFamily: 'Space Grotesk, sans-serif' }}>{r.attendance}%</span>
                        <AttBar value={r.attendance} />
                      </div>
                    </td>
                    <td style={{ padding: '11px 14px' }}>
                      {r.attendance < 75 ? (
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: '4px',
                          padding: '3px 9px', borderRadius: '99px', fontSize: '10px', fontWeight: '700',
                          background: 'rgba(239,68,68,0.15)', color: '#fca5a5',
                          border: '1px solid rgba(239,68,68,0.3)'
                        }}>
                          <AlertTriangle size={9} /> Defaulter
                        </span>
                      ) : (
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: '4px',
                          padding: '3px 9px', borderRadius: '99px', fontSize: '10px', fontWeight: '700',
                          background: 'rgba(34,197,94,0.12)', color: '#86efac',
                          border: '1px solid rgba(34,197,94,0.25)'
                        }}>
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

      {/* ── Defaulters tab ── */}
      {hasData && tab === 'defaulters' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {defaulters.length === 0 && (
            <div style={{
              textAlign: 'center', padding: '48px', color: '#64748b',
              background: 'rgba(34,197,94,0.05)', border: '1px dashed rgba(34,197,94,0.2)',
              borderRadius: '14px', fontSize: '14px'
            }}>
              <CheckCircle2 size={32} style={{ color: '#22c55e', margin: '0 auto 12px', display: 'block' }} />
              No defaulters found — all students are above 75% 🎉
            </div>
          )}
          {defaulters.map((r, i) => {
            const absent = r.total > 0 ? r.total - r.present : 0;
            const gap    = 75 - r.attendance;
            const needed = r.total > 0 ? Math.ceil((0.75 * r.total - r.present) / 0.25) : 0;
            return (
              <div key={i} style={{
                padding: '16px 20px', borderRadius: '12px',
                background: 'rgba(239,68,68,0.06)',
                border: '1px solid rgba(239,68,68,0.2)',
                borderLeft: '3px solid #ef4444',
                display: 'flex', alignItems: 'center', gap: '16px'
              }}>
                {/* Avatar */}
                <div style={{
                  width: '42px', height: '42px', borderRadius: '50%', flexShrink: 0,
                  background: 'rgba(239,68,68,0.15)', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontSize: '14px', fontWeight: '800', color: '#fca5a5'
                }}>
                  {r.name ? r.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : '?'}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '14px', fontWeight: '700', color: '#e2e8f0', marginBottom: '3px' }}>{r.name || 'Unknown'}</div>
                  <div style={{ fontSize: '11px', color: '#64748b', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    {r.rollNo && <span>Roll: <b style={{ color: '#94a3b8' }}>{r.rollNo}</b></span>}
                    {r.branch && <span>Branch: <b style={{ color: '#94a3b8' }}>{r.branch}</b></span>}
                    {r.semester && <span>Sem: <b style={{ color: '#94a3b8' }}>{r.semester}</b></span>}
                    <span>{r.present} present / {absent} absent out of {r.total} classes</span>
                  </div>
                </div>

                {/* Needs to attend */}
                {needed > 0 && (
                  <div style={{ textAlign: 'center', padding: '6px 12px', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '8px', flexShrink: 0 }}>
                    <div style={{ fontSize: '16px', fontWeight: '800', color: '#fbbf24', fontFamily: 'Space Grotesk, sans-serif' }}>{needed}</div>
                    <div style={{ fontSize: '9px', color: '#92400e', fontWeight: '600', textTransform: 'uppercase' }}>classes needed</div>
                  </div>
                )}

                {/* Attendance % */}
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: '28px', fontWeight: '900', color: '#ef4444', fontFamily: 'Space Grotesk, sans-serif', lineHeight: 1 }}>{r.attendance}%</div>
                  <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>{gap}% below threshold</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Empty state (no file uploaded) ── */}
      {!hasData && !uploading && (
        <div style={{ textAlign: 'center', padding: '20px 0', color: '#475569', fontSize: '13px' }}>
          Upload a CSV or Excel file above to view attendance data and auto-detect defaulters.
        </div>
      )}

      {uploading && (
        <div style={{ textAlign: 'center', padding: '32px', color: '#6366f1', fontSize: '13px', fontWeight: '600' }}>
          Parsing file…
        </div>
      )}
    </div>
  );
}
