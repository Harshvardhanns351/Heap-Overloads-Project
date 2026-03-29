import React, { useState } from 'react';
import useAppStore from '../../store';
import { PageHeader } from '../../components/UI';
import { CheckCircle2, Clock, AlertCircle, ChevronDown } from 'lucide-react';

const STATUS_CONFIG = {
  Open: { cls: 'badge-red', label: 'Open', icon: AlertCircle },
  'In Review': { cls: 'badge-yellow', label: 'In Review', icon: Clock },
  Resolved: { cls: 'badge-green', label: 'Resolved', icon: CheckCircle2 },
};

export default function AdminDisputes() {
  const { disputes, updateDisputeStatus } = useAppStore();
  const [selected, setSelected] = useState(null);
  const [resolution, setResolution] = useState('');
  const [newStatus, setNewStatus] = useState('');

  const handleUpdate = () => {
    if (!newStatus) return;
    updateDisputeStatus(selected, newStatus, resolution || undefined);
    setSelected(null);
    setResolution('');
    setNewStatus('');
  };

  return (
    <div className="fade-in-up" style={{ maxWidth: '720px' }}>
      <PageHeader title="Dispute Queue" subtitle="All open student disputes sorted by date" />

      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {Object.entries(STATUS_CONFIG).map(([key, { cls, label }]) => (
          <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span className={cls} style={{ padding: '3px 10px', borderRadius: '99px', fontSize: '11px', fontWeight: '600' }}>{label}</span>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{disputes.filter(d => d.status === key).length}</span>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {disputes.map((d) => {
          const sc = STATUS_CONFIG[d.status] || STATUS_CONFIG.Open;
          const isExpanded = selected === d.id;
          return (
            <div key={d.id} className="card" style={{ overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: '12px' }} onClick={() => setSelected(isExpanded ? null : d.id)}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                    <span style={{ fontSize: '13px', fontWeight: '600' }}>{d.title}</span>
                    <span className={sc.cls} style={{ padding: '2px 8px', borderRadius: '99px', fontSize: '10px', fontWeight: '600' }}>{sc.label}</span>
                    <span style={{ fontSize: '10px', padding: '1px 7px', background: 'rgba(139,92,246,0.1)', color: '#8b5cf6', borderRadius: '99px', border: '1px solid rgba(139,92,246,0.2)' }}>{d.category}</span>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    By <span style={{ color: 'var(--text-secondary)', fontWeight: '500' }}>{d.studentName}</span> · {d.date}
                  </div>
                </div>
                <ChevronDown size={14} color="var(--text-muted)" style={{ transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0, marginTop: '2px' }} />
              </div>

              {isExpanded && (
                <div className="fade-in-up" style={{ padding: '0 20px 20px', borderTop: '1px solid var(--border-soft)' }}>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '14px', paddingTop: '14px' }}>{d.description}</p>
                  {d.resolution && (
                    <div style={{ padding: '10px 14px', background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)', borderRadius: '8px', fontSize: '12px', color: '#22c55e', marginBottom: '14px' }}>
                      <strong>Current resolution:</strong> {d.resolution}
                    </div>
                  )}
                  {d.status !== 'Resolved' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <select className="input" value={newStatus} onChange={(e) => setNewStatus(e.target.value)}>
                        <option value="">Change status...</option>
                        <option value="In Review">→ In Review</option>
                        <option value="Resolved">→ Mark Resolved</option>
                      </select>
                      {newStatus === 'Resolved' && (
                        <textarea className="input" rows={3} placeholder="Resolution note (optional)..." value={resolution} onChange={(e) => setResolution(e.target.value)} style={{ resize: 'vertical' }} />
                      )}
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="btn btn-primary" onClick={handleUpdate} disabled={!newStatus} style={{ fontSize: '12px' }}>
                          <CheckCircle2 size={13} /> Update Status
                        </button>
                        <button className="btn btn-ghost" onClick={() => setSelected(null)} style={{ fontSize: '12px' }}>Cancel</button>
                      </div>
                    </div>
                  )}
                  {d.status === 'Resolved' && (
                    <span style={{ fontSize: '12px', color: '#22c55e', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <CheckCircle2 size={13} /> Dispute resolved
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
