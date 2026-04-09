import React, { useState, useEffect } from 'react';
import useAppStore from '../../store';
import { PageHeader, Tabs } from '../../components/UI';
import { Plus, BookOpen, Clock, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { authHeaders, buildApiUrl } from '../../api';

export default function TeacherAssignments() {
  const { assignments, fetchAssignments, currentUser } = useAppStore();
  const [tab, setTab] = useState('list');
  const [form, setForm] = useState({ title: '', subject: 'DSA', description: '', deadline: '', class_id: 'CSE-A' });
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchAssignments().finally(() => setLoading(false)); }, []);

  const getDaysLeft = (deadline) => {
    const diff = Math.ceil((new Date(deadline) - new Date()) / (1000 * 60 * 60 * 24));
    if (diff < 0) return { text: 'Overdue', color: '#ef4444' };
    if (diff === 0) return { text: 'Due today', color: '#f59e0b' };
    return { text: `${diff}d left`, color: diff < 2 ? '#f59e0b' : 'var(--text-muted)' };
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      await fetch(buildApiUrl('/assignments'), {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ ...form, deadline: new Date(form.deadline).toISOString() }),
      });
      await fetchAssignments();
      setCreated(true);
      setTimeout(() => { setCreated(false); setTab('list'); }, 1800);
    } catch (err) {
      alert('Failed: ' + err.message);
    } finally {
      setCreating(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-violet-500" /></div>;

  return (
    <div className="fade-in-up">
      <PageHeader
        title="Assignments"
        subtitle="Create and track assignment submissions across your classes"
        action={<button className="btn btn-primary" onClick={() => setTab('create')} style={{ fontSize: '12px' }}><Plus size={13} /> Create</button>}
      />
      <Tabs tabs={[{ key: 'list', label: 'All Assignments' }, { key: 'create', label: 'Create New' }]} active={tab} onChange={setTab} />

      {tab === 'list' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {assignments.length === 0 && <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>No assignments yet</div>}
          {assignments.map((a) => {
            const { text, color } = getDaysLeft(a.deadline);
            return (
              <div key={a.id} className="card" style={{ padding: '16px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                  <div style={{ width: '36px', height: '36px', background: 'rgba(79,142,247,0.1)', borderRadius: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <BookOpen size={16} color="#4f8ef7" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                      <span style={{ fontSize: '13px', fontWeight: '600' }}>{a.title}</span>
                      <span className="badge-blue" style={{ fontSize: '10px', padding: '1px 8px', borderRadius: '99px' }}>{a.subject}</span>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{a.class_id}</span>
                    </div>
                    <span style={{ fontSize: '11px', color, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={10} /> {text}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === 'create' && (
        <div className="card" style={{ padding: '24px', maxWidth: '520px' }}>
          {created ? (
            <div style={{ textAlign: 'center', padding: '32px' }}>
              <CheckCircle2 size={40} color="#22c55e" style={{ marginBottom: '12px' }} />
              <div style={{ fontSize: '15px', fontWeight: '600' }}>Assignment created!</div>
            </div>
          ) : (
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: '500', color: 'var(--text-secondary)', display: 'block', marginBottom: '5px' }}>Title</label>
                <input className="input" placeholder="Assignment title" value={form.title} onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))} required />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: '500', color: 'var(--text-secondary)', display: 'block', marginBottom: '5px' }}>Subject</label>
                  <select className="input" value={form.subject} onChange={(e) => setForm(f => ({ ...f, subject: e.target.value }))}>
                    {['DSA', 'OS', 'DBMS', 'CN', 'ML'].map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: '500', color: 'var(--text-secondary)', display: 'block', marginBottom: '5px' }}>Class</label>
                  <select className="input" value={form.class_id} onChange={(e) => setForm(f => ({ ...f, class_id: e.target.value }))}>
                    {['CSE-A', 'CSE-B'].map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: '500', color: 'var(--text-secondary)', display: 'block', marginBottom: '5px' }}>Deadline</label>
                <input className="input" type="datetime-local" value={form.deadline} onChange={(e) => setForm(f => ({ ...f, deadline: e.target.value }))} required />
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: '500', color: 'var(--text-secondary)', display: 'block', marginBottom: '5px' }}>Description</label>
                <textarea className="input" rows={4} placeholder="Assignment instructions..." value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} style={{ resize: 'vertical' }} />
              </div>
              <button className="btn btn-primary" type="submit" disabled={creating} style={{ alignSelf: 'flex-start' }}>
                {creating ? 'Creating...' : <><Plus size={13} /> Create Assignment</>}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
