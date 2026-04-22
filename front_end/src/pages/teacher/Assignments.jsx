import React, { useState, useEffect, useMemo } from 'react';
import useAppStore from '../../store';
import { PageHeader, Tabs, Modal, ProgressBar } from '../../components/UI';
import { api } from '../../api';
import {
  Plus, BookOpen, Clock, CheckCircle2, AlertTriangle, Loader2,
  CalendarDays, Download, Copy, PencilLine, FileText, Timer, Search, Filter
} from 'lucide-react';

const CLASS_OPTIONS = ['CSE-A', 'CSE-B'];
const SUBJECT_OPTIONS = ['DSA', 'OS', 'DBMS', 'CN', 'ML'];
const PRIORITY_OPTIONS = ['low', 'medium', 'high'];

export default function TeacherAssignments() {
  const { assignments, fetchAssignments, currentUser, students, fetchStudents } = useAppStore();
  const [tab, setTab] = useState('list');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('all');
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Create Form State
  const [form, setForm] = useState({ title: '', subject: 'DSA', description: '', deadline: '', class_id: 'CSE-A' });
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState(false);

  // Detail Modal State
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);

  useEffect(() => {
    Promise.all([fetchAssignments(), fetchStudents()]).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (selectedAssignment) {
      setLoadingSubmissions(true);
      api.assignments.listSubmissions(selectedAssignment.id)
        .then(setSubmissions)
        .finally(() => setLoadingSubmissions(false));
    }
  }, [selectedAssignment]);

  const getDaysLeft = (deadline) => {
    const diff = Math.ceil((new Date(deadline) - new Date()) / (1000 * 60 * 60 * 24));
    if (diff < 0) return { text: 'Overdue', color: 'var(--status-err)' };
    if (diff === 0) return { text: 'Due today', color: 'var(--status-warn)' };
    return { text: `${diff}d left`, color: diff < 2 ? 'var(--status-warn)' : 'var(--text-muted)' };
  };

  const filteredAssignments = useMemo(() => {
    const term = search.trim().toLowerCase();
    return [...assignments]
      .filter((a) => {
        const matchesSearch = !term || [a.title, a.subject, a.description, a.class_id].filter(Boolean).join(' ').toLowerCase().includes(term);
        const matchesClass = classFilter === 'all' || a.class_id === classFilter;
        const matchesSubject = subjectFilter === 'all' || a.subject === subjectFilter;
        // Basic status filter (could be expanded)
        const isOverdue = new Date(a.deadline) < new Date();
        const matchesStatus = statusFilter === 'all' 
          || (statusFilter === 'overdue' && isOverdue)
          || (statusFilter === 'active' && !isOverdue);
        return matchesSearch && matchesClass && matchesSubject && matchesStatus;
      })
      .sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
  }, [assignments, search, classFilter, subjectFilter, statusFilter]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      await fetch('http://localhost:8000/api/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
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

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <Loader2 size={32} className="animate-spin" style={{ color: 'var(--accent)' }} />
    </div>
  );

  return (
    <div className="fade-in-up" style={{ maxWidth: '1000px', margin: '0 auto', padding: '2rem 1rem' }}>
      <PageHeader
        title="Assignments"
        subtitle="Create and track assignment submissions across your classes"
        action={<button className="btn-primary" onClick={() => setTab('create')} style={{ fontSize: '13px' }}><Plus size={14} /> Create New</button>}
      />

      <Tabs tabs={[{ key: 'list', label: 'All Assignments' }, { key: 'create', label: 'Create' }]} active={tab} onChange={setTab} />

      {tab === 'list' && (
        <div className="fade-in-up">
          {/* Filters */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap', alignItems: 'center', background: 'var(--bg-card)', padding: '16px', borderRadius: '14px', border: '1px solid var(--border)' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
              <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input className="input" placeholder="Search title, subject..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: '34px' }} />
            </div>
            <select className="input" style={{ width: 'auto' }} value={classFilter} onChange={e => setClassFilter(e.target.value)}>
              <option value="all">All Classes</option>
              {CLASS_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select className="input" style={{ width: 'auto' }} value={subjectFilter} onChange={e => setSubjectFilter(e.target.value)}>
              <option value="all">All Subjects</option>
              {SUBJECT_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select className="input" style={{ width: 'auto' }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="overdue">Overdue</option>
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
            {filteredAssignments.length === 0 && (
              <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '64px 20px', color: 'var(--text-muted)' }}>
                <BookOpen size={32} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
                No assignments found matching filters.
              </div>
            )}
            {filteredAssignments.map((a) => {
              const { text, color } = getDaysLeft(a.deadline);
              const isOverdue = new Date(a.deadline) < new Date();
              return (
                <div key={a.id} onClick={() => setSelectedAssignment(a)} className="premium-card group" style={{ cursor: 'pointer', borderColor: isOverdue ? 'rgba(239,68,68,0.2)' : 'var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', marginBottom: '16px' }}>
                    <div style={{ width: '40px', height: '40px', background: 'var(--accent-bg)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <BookOpen size={18} color="var(--accent)" />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                        <span style={{ fontSize: '14px', fontWeight: '700' }}>{a.title}</span>
                        <span className="badge-blue">{a.subject}</span>
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{a.class_id}</div>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', color, display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                      <Clock size={12} /> {text}
                    </span>
                    <button className="btn" style={{ padding: '4px 12px', fontSize: '11px' }}>Details</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === 'create' && (
        <div className="fade-in-up" style={{ display: 'flex', justifyContent: 'center' }}>
          <div className="premium-card" style={{ padding: '32px', width: '100%', maxWidth: '520px' }}>
            {created ? (
              <div style={{ textAlign: 'center', padding: '32px' }}>
                <div style={{ width: '64px', height: '64px', background: 'rgba(52,211,153,0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                  <CheckCircle2 size={32} color="var(--status-ok)" />
                </div>
                <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '20px', fontWeight: 800, marginBottom: '8px' }}>Created Successfully</div>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Redirecting you back to the list...</div>
              </div>
            ) : (
              <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '20px', fontWeight: 800, marginBottom: '4px' }}>New Assignment</div>
                <div>
                  <label className="label">Title</label>
                  <input className="input" placeholder="e.g. Memory Management Lab" value={form.title} onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))} required />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label className="label">Subject</label>
                    <select className="input" value={form.subject} onChange={(e) => setForm(f => ({ ...f, subject: e.target.value }))}>
                      {SUBJECT_OPTIONS.map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label">Class</label>
                    <select className="input" value={form.class_id} onChange={(e) => setForm(f => ({ ...f, class_id: e.target.value }))}>
                      {CLASS_OPTIONS.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="label">Deadline</label>
                  <input className="input" type="datetime-local" value={form.deadline} onChange={(e) => setForm(f => ({ ...f, deadline: e.target.value }))} required />
                </div>
                <div>
                  <label className="label">Instructions / Description</label>
                  <textarea className="input" rows={4} placeholder="Describe the requirements..." value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} style={{ resize: 'vertical' }} />
                </div>
                <div style={{ display: 'flex', gap: '12px', paddingTop: '10px' }}>
                  <button className="btn" type="button" onClick={() => setTab('list')} style={{ flex: 1 }}>Cancel</button>
                  <button className="btn-primary" type="submit" disabled={creating} style={{ flex: 2 }}>
                    {creating ? 'Creating...' : <><Plus size={14} /> Create Assignment</>}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Detail Modal */}
      <Modal open={!!selectedAssignment} onClose={() => setSelectedAssignment(null)} title="Assignment Overview">
        {selectedAssignment && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '22px', fontWeight: 800, marginBottom: '6px' }}>{selectedAssignment.title}</div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <span className="badge-blue">{selectedAssignment.subject}</span>
                  <span className="badge-blue">{selectedAssignment.class_id}</span>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <CalendarDays size={12} /> {new Date(selectedAssignment.deadline).toLocaleString()}
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn" onClick={() => {/* bulk download */}}><Download size={14} /></button>
                <button className="btn" onClick={() => {/* edit */}}><PencilLine size={14} /></button>
              </div>
            </div>

            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.7, background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)' }}>
              {selectedAssignment.description || 'No description provided.'}
            </div>

            {/* Submissions List */}
            <div>
              <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '12px' }}>
                Submissions ({submissions.length})
              </div>
              {loadingSubmissions ? (
                <div style={{ textAlign: 'center', padding: '20px' }}><Loader2 size={16} className="animate-spin" /></div>
              ) : submissions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)', fontSize: '13px', border: '1px dashed var(--border)', borderRadius: '12px' }}>No submissions yet.</div>
              ) : (
                <div style={{ display: 'grid', gap: '10px' }}>
                  {submissions.map((s) => (
                    <div key={s.id} style={{ padding: '14px', borderRadius: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 700 }}>{s.student_name || `Student #${s.student_id}`}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{new Date(s.submitted_at).toLocaleString()}</div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '20px', background: s.status === 'late' ? 'rgba(245,158,11,0.1)' : 'rgba(52,211,153,0.1)', color: s.status === 'late' ? 'var(--status-warn)' : 'var(--status-ok)' }}>{s.status}</span>
                        <button className="btn" style={{ padding: '4px 10px', fontSize: '11px' }}>Grade</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <button className="btn" style={{ color: 'var(--status-err)', borderColor: 'rgba(239,68,68,0.2)' }}>Delete Assignment</button>
          </div>
        )}
      </Modal>

      <style>{`
        .group:hover { border-color: var(--accent-border) !important; }
      `}</style>
    </div>
  );
}
