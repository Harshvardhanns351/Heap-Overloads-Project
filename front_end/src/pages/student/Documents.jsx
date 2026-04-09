import React, { useState, useEffect, useRef } from 'react';
import { PageHeader, Tabs } from '../../components/UI';
import { Upload, FileText, Eye, CheckCircle2, X, Loader2 } from 'lucide-react';
import { authHeaders, buildApiUrl, buildAssetUrl } from '../../api';

function OCRPreview({ data, setData, onConfirm, onClose, saving }) {
  return (
    <div style={{ marginTop: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', padding: '10px 14px', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: '8px' }}>
        <CheckCircle2 size={14} color="#22c55e" />
        <span style={{ fontSize: '12px', color: '#22c55e', fontWeight: '500' }}>OCR extraction complete — verify before saving</span>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
        <thead>
          <tr style={{ background: 'var(--bg-elevated)' }}>
            {['Subject', 'Obtained', 'Max', '%'].map(h => (
              <th key={h} style={{ padding: '8px 12px', textAlign: h === 'Subject' ? 'left' : 'center', color: 'var(--text-muted)', fontWeight: '500' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i} style={{ borderTop: '1px solid var(--border-soft)' }}>
              <td style={{ padding: '8px 12px', color: 'var(--text-primary)' }}>{row.subject}</td>
              <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                <input type="number" value={row.obtained} onChange={(e) => setData(d => d.map((r, j) => j === i ? { ...r, obtained: +e.target.value } : r))}
                  style={{ width: '52px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '5px', padding: '3px 6px', color: 'var(--text-primary)', textAlign: 'center', fontFamily: 'inherit', fontSize: '12px' }} />
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
        <button className="btn btn-primary" onClick={onConfirm} disabled={saving} style={{ flex: 1, justifyContent: 'center' }}>
          {saving ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />} Confirm & Save Marks
        </button>
        <button className="btn btn-ghost" onClick={onClose}><X size={13} /></button>
      </div>
    </div>
  );
}

export default function Documents() {
  const [tab, setTab] = useState('docs');
  const [docs, setDocs] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [ocrData, setOcrData] = useState(null);
  const [docId, setDocId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef(null);

  const fetchDocs = async () => {
    try {
      const userId = JSON.parse(localStorage.getItem('user') || '{}').id;
      const res = await fetch(buildApiUrl(`/academics/documents?student_id=${userId}`), {
        headers: authHeaders(),
      });
      if (res.ok) setDocs(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoadingDocs(false); }
  };

  useEffect(() => { fetchDocs(); }, []);

  const handleFile = async (file) => {
    if (!file) return;
    setUploading(true);
    setOcrData(null);
    try {
      const userId = JSON.parse(localStorage.getItem('user') || '{}').id;
      const fd = new FormData();
      fd.append('file', file);
      fd.append('student_id', userId);
      const res = await fetch(buildApiUrl('/academics/upload-doc'), {
        method: 'POST',
        headers: authHeaders(),
        body: fd,
      });
      const data = await res.json();
      if (data.ocr_preview) {
        setOcrData(data.ocr_preview.map(r => ({
          subject: r.subject,
          obtained: r.marks_obtained,
          max: r.max_marks || 100,
        })));
        setDocId(data.doc_id);
      }
      await fetchDocs();
    } catch (e) { alert('Upload failed: ' + e.message); }
    finally { setUploading(false); }
  };

  const handleConfirm = async () => {
    if (!docId || !ocrData) return;
    setSaving(true);
    try {
      const semester = JSON.parse(localStorage.getItem('user') || '{}').semester || 6;
      await fetch(buildApiUrl('/academics/confirm-ocr'), {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          doc_id: docId,
          confirmed_marks: ocrData.map(r => ({
            subject: r.subject,
            marks_obtained: r.obtained,
            max_marks: r.max,
            semester,
          })),
        }),
      });
      setOcrData(null);
      setDocId(null);
      setSaved(true);
      setTimeout(() => setSaved(false), 4000);
    } catch (e) { alert('Save failed: ' + e.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="fade-in-up">
      <PageHeader title="Documents" subtitle="Upload marksheets · OCR extracts marks automatically" />
      <Tabs tabs={[{ key: 'docs', label: 'My Documents' }, { key: 'upload', label: 'Upload New' }]} active={tab} onChange={setTab} />

      {tab === 'docs' && (
        <div className="card" style={{ padding: '20px' }}>
          {loadingDocs ? (
            <div className="flex items-center justify-center h-24"><Loader2 className="w-6 h-6 animate-spin text-violet-500" /></div>
          ) : docs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>No documents uploaded yet</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {docs.map((doc) => (
                <div key={doc.id} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '12px 14px', background: 'var(--bg-elevated)', borderRadius: '10px' }}>
                  <div style={{ width: '36px', height: '36px', background: 'rgba(79,142,247,0.1)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <FileText size={16} color="#4f8ef7" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: '500', marginBottom: '2px' }}>{doc.name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{doc.doc_type} · {Math.round(doc.size_bytes / 1024)}KB · {new Date(doc.uploaded_at).toLocaleDateString()}</div>
                  </div>
                  {doc.ocr_confirmed && <span className="badge-green" style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '99px', fontWeight: '600' }}>OCR ✓</span>}
                  <a href={buildAssetUrl(doc.storage_path)} target="_blank" rel="noreferrer" className="btn btn-ghost" style={{ fontSize: '11px', padding: '5px 10px' }}>
                    <Eye size={12} /> View
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'upload' && (
        <div style={{ maxWidth: '520px' }}>
          <input type="file" ref={fileRef} accept=".jpg,.jpeg,.png,.pdf" style={{ display: 'none' }} onChange={(e) => handleFile(e.target.files?.[0])} />
          {!ocrData && (
            <div
              onDragEnter={() => setDragging(true)}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files?.[0]); }}
              onClick={() => !uploading && fileRef.current?.click()}
              style={{ border: `2px dashed ${dragging ? '#4f8ef7' : 'rgba(255,255,255,0.12)'}`, borderRadius: '14px', padding: '48px 32px', textAlign: 'center', background: dragging ? 'rgba(79,142,247,0.05)' : 'transparent', transition: 'all 0.18s', cursor: 'pointer', marginBottom: '16px' }}
            >
              {uploading ? (
                <>
                  <div style={{ width: '40px', height: '40px', border: '3px solid rgba(79,142,247,0.2)', borderTopColor: '#4f8ef7', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
                  <div style={{ fontSize: '14px', fontWeight: '500' }}>Processing with OCR...</div>
                </>
              ) : (
                <>
                  <div style={{ width: '48px', height: '48px', background: 'rgba(79,142,247,0.1)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                    <Upload size={20} color="#4f8ef7" />
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '6px' }}>Drop your marksheet here</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '14px' }}>JPG, PNG, PDF up to 10MB</div>
                  <button className="btn btn-primary" style={{ fontSize: '12px' }} onClick={(e) => { e.stopPropagation(); fileRef.current?.click(); }}>Choose File</button>
                </>
              )}
            </div>
          )}

          {ocrData && <OCRPreview data={ocrData} setData={setOcrData} onConfirm={handleConfirm} onClose={() => setOcrData(null)} saving={saving} />}

          {saved && (
            <div style={{ padding: '12px 16px', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: '10px', display: 'flex', gap: '10px', alignItems: 'center' }}>
              <CheckCircle2 size={16} color="#22c55e" />
              <div>
                <div style={{ fontSize: '13px', fontWeight: '600', color: '#22c55e' }}>Marks saved</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Roadmap and risk score will update overnight.</div>
              </div>
            </div>
          )}
        </div>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
