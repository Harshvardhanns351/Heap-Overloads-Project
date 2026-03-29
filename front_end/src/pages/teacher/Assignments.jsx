import React, { useState } from 'react';
import useAppStore from '../../store';
import { PageHeader, Tabs } from '../../components/UI';
import { Plus, BookOpen, Clock, CheckCircle2, AlertTriangle, Users } from 'lucide-react';

const STATUS_COLOR = { pending: '#f59e0b', submitted: '#22c55e', late: '#ef4444' };

export default function TeacherAssignments() {
  const { assignments } = useAppStore();
  const [tab, setTab] = useState('list');
  const [form, setForm] = useState({ title: '', subject: 'DSA', description: '', deadline: '' });
  const [created, setCreated] = useState(false);

  const handleCreate = (e) => {
    e.preventDefault();
    setCreated(true);
    setTimeout(() => { setCreated(false); setTab('list'); }, 1800);
  };

  const getDaysLeft = (deadline) => {
    const diff = Math.ceil((new Date(deadline) - new Date()) / (1000 * 60 * 60 * 24));
    if (diff < 0) return { text: 'Overdue', color: '#ef4444' };
    if (diff === 0) return { text: 'Due today', color: '#f59e0b' };
    return { text: `${diff}d left`, color: diff < 2 ? '#f59e0b' : 'var(--text-muted)' };
  };

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
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{a.class}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '11px', color, display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={10} /> {text}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Users size={10} color="var(--text-muted)" />
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{a.submissionRate}% submitted</span>
                        <div style={{ width: '60px', background: 'var(--bg-elevated)', borderRadius: '99px', height: '4px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${a.submissionRate}%`, background: a.submissionRate > 75 ? '#22c55e' : a.submissionRate > 40 ? '#f59e0b' : '#ef4444', borderRadius: '99px' }} />
                        </div>
                      </div>
                    </div>
                  </div>
                  {a.submissionRate < 50 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: '#f59e0b', fontWeight: '600' }}>
                      <AlertTriangle size={11} /> Low rate
                    </div>
                  )}
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
              <div style={{ fontSize: '15px', fontWeight: '600', marginBottom: '4px' }}>Assignment created!</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Students will see it on their dashboard.</div>
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
                  <label style={{ fontSize: '11px', fontWeight: '500', color: 'var(--text-secondary)', display: 'block', marginBottom: '5px' }}>Deadline</label>
                  <input className="input" type="datetime-local" value={form.deadline} onChange={(e) => setForm(f => ({ ...f, deadline: e.target.value }))} required />
                </div>
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: '500', color: 'var(--text-secondary)', display: 'block', marginBottom: '5px' }}>Description</label>
                <textarea className="input" rows={4} placeholder="Assignment instructions..." value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} style={{ resize: 'vertical' }} />
              </div>
              <button className="btn btn-primary" type="submit" style={{ alignSelf: 'flex-start' }}><Plus size={13} /> Create Assignment</button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
