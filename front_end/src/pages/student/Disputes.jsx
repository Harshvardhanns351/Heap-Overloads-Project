import React, { useState, useEffect } from 'react';
import useAppStore from '../../store';
import { PageHeader, Tabs } from '../../components/UI';
import { Plus, CheckCircle2, Loader, Trash2 } from 'lucide-react';

const STATUS_CONFIG = {
  Open: { cls: 'badge-red', label: 'Open' },
  'In Review': { cls: 'badge-yellow', label: 'In Review' },
  Resolved: { cls: 'badge-green', label: 'Resolved' },
};

const CATEGORIES = ['Infrastructure', 'Academic', 'Administrative'];

export default function Disputes() {
  const { disputes, createDispute, fetchDisputes, deleteDispute } = useAppStore();
  const [tab, setTab] = useState('list');
  const [form, setForm] = useState({ category: 'Infrastructure', title: '', description: '' });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(null); // id being deleted

  useEffect(() => { fetchDisputes(); }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this dispute? This cannot be undone.')) return;
    setDeleting(id);
    try {
      await deleteDispute(id);
    } catch (err) {
      alert(err.message || 'Failed to delete dispute');
    } finally {
      setDeleting(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.description) return;
    setLoading(true);
    try {
      await createDispute(form.category, form.title, form.description);
      setSubmitted(true);
      setForm({ category: 'Infrastructure', title: '', description: '' });
      setTimeout(() => { setSubmitted(false); setTab('list'); }, 2000);
    } catch (err) {
      alert(err.message || 'Failed to submit dispute');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fade-in-up" style={{ maxWidth: '680px' }}>
      <PageHeader
        title="Disputes"
        subtitle="Raise issues about infrastructure, academics, or administration"
        action={
          <button className="btn btn-primary" onClick={() => setTab('new')} style={{ fontSize: '12px' }}>
            <Plus size={13} /> New Dispute
          </button>
        }
      />

      <Tabs tabs={[{ key: 'list', label: 'My Disputes' }, { key: 'new', label: 'Raise New' }]} active={tab} onChange={setTab} />

      {tab === 'list' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {disputes.length === 0 && (
            <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
              <CheckCircle2 size={28} style={{ marginBottom: '10px', opacity: 0.4 }} />
              <div>No disputes raised</div>
            </div>
          )}
          {disputes.map((d) => {
            const sc = STATUS_CONFIG[d.status] || STATUS_CONFIG.Open;
            return (
              <div key={d.id} className="card" style={{ padding: '16px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '8px' }}>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '3px' }}>{d.title}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{d.category} · {d.date}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className={sc.cls} style={{ padding: '3px 10px', borderRadius: '99px', fontSize: '11px', fontWeight: '600', whiteSpace: 'nowrap' }}>{sc.label}</span>
                    <button
                      onClick={() => handleDelete(d.id)}
                      disabled={deleting === d.id}
                      title="Delete dispute"
                      style={{
                        background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
                        borderRadius: '6px', padding: '4px 7px', cursor: 'pointer',
                        color: '#f87171', display: 'flex', alignItems: 'center',
                        transition: 'all .15s', flexShrink: 0,
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.22)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.1)'}
                    >
                      {deleting === d.id
                        ? <Loader size={12} style={{ animation: 'spin 1s linear infinite' }} />
                        : <Trash2 size={12} />}
                    </button>
                  </div>
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.5', marginBottom: d.resolution ? '10px' : 0 }}>{d.description}</p>
                {d.resolution && (
                  <div style={{ padding: '8px 12px', background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)', borderRadius: '7px', fontSize: '12px', color: '#22c55e' }}>
                    <strong>Resolution:</strong> {d.resolution}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {tab === 'new' && (
        <div className="card" style={{ padding: '24px' }}>
          {submitted ? (
            <div style={{ textAlign: 'center', padding: '32px' }}>
              <CheckCircle2 size={40} color="#22c55e" style={{ marginBottom: '12px' }} />
              <div style={{ fontSize: '15px', fontWeight: '600', marginBottom: '4px' }}>Dispute submitted!</div>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Admin will review within 48 hours.</div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: '500', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Category</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {CATEGORIES.map((c) => (
                    <button
                      key={c} type="button"
                      onClick={() => setForm((f) => ({ ...f, category: c }))}
                      style={{ flex: 1, padding: '8px', borderRadius: '8px', border: `1px solid ${form.category === c ? '#4f8ef7' : 'var(--border)'}`, background: form.category === c ? 'rgba(79,142,247,0.1)' : 'transparent', color: form.category === c ? '#4f8ef7' : 'var(--text-secondary)', fontSize: '11px', fontWeight: '500', cursor: 'pointer', fontFamily: 'inherit' }}
                    >{c}</button>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: '500', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Title</label>
                <input className="input" placeholder="Brief summary of the issue" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} required />
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: '500', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Description</label>
                <textarea
                  className="input" rows={5} placeholder="Describe the issue in detail..."
                  value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  required style={{ resize: 'vertical' }}
                />
              </div>
              <button className="btn btn-primary" type="submit" disabled={loading} style={{ alignSelf: 'flex-start' }}>
                {loading ? <><Loader size={13} className="spin" /> Submitting...</> : <><Plus size={13} /> Submit Dispute</>}
              </button>
            </form>
          )}
        </div>
      )}
      <style>{`.spin { animation: spin 1s linear infinite; } @keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
