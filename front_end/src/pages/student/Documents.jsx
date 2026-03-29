import React, { useState } from 'react';
import { PageHeader, Tabs } from '../../components/UI';
import { Upload, FileText, Eye, CheckCircle2, Edit3, X } from 'lucide-react';

const MOCK_DOCS = [
  { id: 1, name: 'Unit_2_Marksheet.jpg', date: '2026-03-20', type: 'Marksheet', size: '1.2 MB', ocr: true },
  { id: 2, name: 'Unit_1_Marksheet.pdf', date: '2026-02-15', type: 'Marksheet', size: '0.8 MB', ocr: true },
  { id: 3, name: 'Bonafide_Certificate.pdf', date: '2026-01-10', type: 'Certificate', size: '0.3 MB', ocr: false },
];

const OCR_PREVIEW = [
  { subject: 'Data Structures & Algorithms', obtained: 72, max: 100 },
  { subject: 'Operating Systems', obtained: 58, max: 100 },
  { subject: 'Database Management System', obtained: 81, max: 100 },
  { subject: 'Computer Networks', obtained: 63, max: 100 },
  { subject: 'Machine Learning', obtained: 45, max: 100 },
];

function OCRPreview({ onConfirm, onClose }) {
  const [data, setData] = useState(OCR_PREVIEW);

  return (
    <div style={{ marginTop: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', padding: '10px 14px', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: '8px' }}>
        <CheckCircle2 size={14} color="#22c55e" />
        <span style={{ fontSize: '12px', color: '#22c55e', fontWeight: '500' }}>OCR extraction complete — please verify before saving</span>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
        <thead>
          <tr style={{ background: 'var(--bg-elevated)' }}>
            <th style={{ padding: '8px 12px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: '500' }}>Subject</th>
            <th style={{ padding: '8px 12px', textAlign: 'center', color: 'var(--text-muted)', fontWeight: '500' }}>Obtained</th>
            <th style={{ padding: '8px 12px', textAlign: 'center', color: 'var(--text-muted)', fontWeight: '500' }}>Max</th>
            <th style={{ padding: '8px 12px', textAlign: 'center', color: 'var(--text-muted)', fontWeight: '500' }}>%</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i} style={{ borderTop: '1px solid var(--border-soft)' }}>
              <td style={{ padding: '8px 12px', color: 'var(--text-primary)' }}>{row.subject}</td>
              <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                <input
                  type="number"
                  value={row.obtained}
                  onChange={(e) => setData(d => d.map((r, j) => j === i ? { ...r, obtained: +e.target.value } : r))}
                  style={{ width: '52px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '5px', padding: '3px 6px', color: 'var(--text-primary)', textAlign: 'center', fontFamily: 'inherit', fontSize: '12px' }}
                />
              </td>
              <td style={{ padding: '8px 12px', textAlign: 'center', color: 'var(--text-secondary)' }}>{row.max}</td>
              <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: '600', color: row.obtained / row.max < 0.6 ? '#ef4444' : row.obtained / row.max < 0.75 ? '#f59e0b' : '#22c55e' }}>
                {Math.round((row.obtained / row.max) * 100)}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
        <button className="btn btn-primary" onClick={onConfirm} style={{ flex: 1, justifyContent: 'center' }}>
          <CheckCircle2 size={13} /> Confirm & Save Marks
        </button>
        <button className="btn btn-ghost" onClick={onClose}><X size={13} /></button>
      </div>
    </div>
  );
}

export default function Documents() {
  const [tab, setTab] = useState('docs');
  const [uploading, setUploading] = useState(false);
  const [showOCR, setShowOCR] = useState(false);
  const [saved, setSaved] = useState(false);
  const [dragging, setDragging] = useState(false);

  const handleUpload = async () => {
    setUploading(true);
    await new Promise((r) => setTimeout(r, 1800));
    setUploading(false);
    setShowOCR(true);
  };

  const handleConfirm = () => {
    setShowOCR(false);
    setSaved(true);
  };

  return (
    <div className="fade-in-up">
      <PageHeader title="Documents" subtitle="Upload marksheets and certificates · OCR extracts marks automatically" />

      <Tabs tabs={[{ key: 'docs', label: 'My Documents' }, { key: 'upload', label: 'Upload New' }]} active={tab} onChange={setTab} />

      {tab === 'docs' && (
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {MOCK_DOCS.map((doc) => (
              <div key={doc.id} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '12px 14px', background: 'var(--bg-elevated)', borderRadius: '10px' }}>
                <div style={{ width: '36px', height: '36px', background: 'rgba(79,142,247,0.1)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <FileText size={16} color="#4f8ef7" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: '500', marginBottom: '2px' }}>{doc.name}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{doc.type} · {doc.size} · Uploaded {doc.date}</div>
                </div>
                {doc.ocr && (
                  <span className="badge-green" style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '99px', fontWeight: '600' }}>OCR ✓</span>
                )}
                <button className="btn btn-ghost" style={{ fontSize: '11px', padding: '5px 10px', gap: '4px' }}>
                  <Eye size={12} /> View
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'upload' && (
        <div style={{ maxWidth: '520px' }}>
          {!showOCR && (
            <div
              onDragEnter={() => setDragging(true)}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => { e.preventDefault(); setDragging(false); }}
              style={{
                border: `2px dashed ${dragging ? '#4f8ef7' : 'rgba(255,255,255,0.12)'}`,
                borderRadius: '14px', padding: '48px 32px', textAlign: 'center',
                background: dragging ? 'rgba(79,142,247,0.05)' : 'transparent',
                transition: 'all 0.18s', cursor: 'pointer', marginBottom: '16px',
              }}
              onClick={!uploading ? handleUpload : undefined}
            >
              {uploading ? (
                <>
                  <div style={{ width: '40px', height: '40px', border: '3px solid rgba(79,142,247,0.2)', borderTopColor: '#4f8ef7', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
                  <div style={{ fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>Processing with OCR...</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Extracting subject marks from your document</div>
                </>
              ) : (
                <>
                  <div style={{ width: '48px', height: '48px', background: 'rgba(79,142,247,0.1)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                    <Upload size={20} color="#4f8ef7" />
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '6px' }}>Drop your marksheet here</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '14px' }}>Supports JPG, PNG, PDF up to 10MB</div>
                  <button className="btn btn-primary" style={{ fontSize: '12px' }}>Choose File</button>
                </>
              )}
            </div>
          )}

          {showOCR && <OCRPreview onConfirm={handleConfirm} onClose={() => setShowOCR(false)} />}

          {saved && (
            <div style={{ padding: '12px 16px', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: '10px', display: 'flex', gap: '10px', alignItems: 'center' }}>
              <CheckCircle2 size={16} color="#22c55e" />
              <div>
                <div style={{ fontSize: '13px', fontWeight: '600', color: '#22c55e' }}>Marks saved successfully</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Your roadmap and risk score have been updated.</div>
              </div>
            </div>
          )}
        </div>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
