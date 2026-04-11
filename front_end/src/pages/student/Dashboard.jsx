import React, { useCallback, useEffect, useRef, useState } from 'react';
import useAppStore from '../../store';
import { ProgressBar } from '../../components/UI';
import { api } from '../../api';
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';
import {
  Activity, AlertTriangle, BookOpen, CheckCircle2, Clock,
  Code2, ExternalLink, FileText, Flame, LayoutDashboard,
  Link2, Loader2, Map, RefreshCw, Send, Timer,
  TrendingUp, Trophy, Upload, Zap, ChevronDown, ChevronUp,
  Paperclip, Star, MessageSquare,
} from 'lucide-react';

// ─── helpers ─────────────────────────────────────────────────────────────────
const API_BASE = 'http://localhost:8000/api';
const tok = () => localStorage.getItem('token');
const authFetch = (url, opts = {}) =>
  fetch(`${API_BASE}${url}`, { ...opts, headers: { Authorization: `Bearer ${tok()}`, ...(opts.headers || {}) } });

function timeAgo(iso) {
  if (!iso) return 'Never';
  const d = Math.floor((Date.now() - new Date(iso)) / 86400000);
  if (d === 0) return 'Today'; if (d === 1) return 'Yesterday';
  if (d < 7) return `${d}d ago`; if (d < 30) return `${Math.floor(d / 7)}w ago`;
  return `${Math.floor(d / 30)}mo ago`;
}
function dueIn(deadline) {
  const diff = Math.ceil((new Date(deadline) - new Date()) / 864e5);
  if (diff < 0) return { text: 'Overdue', color: '#ef4444', urgent: true };
  if (diff === 0) return { text: 'Due today', color: '#f59e0b', urgent: true };
  if (diff === 1) return { text: 'Due tomorrow', color: '#f59e0b', urgent: true };
  return { text: `${diff}d left`, color: 'var(--text-muted)', urgent: false };
}
const safeH = v => (v != null && !isNaN(v) && v > 0) ? `${Number(v).toFixed(1)}h` : '0h';
const TIERS = [
  { min: 950, label: 'Legend', color: '#ef4444' }, { min: 800, label: 'Elite', color: '#f59e0b' },
  { min: 600, label: 'Expert', color: '#a855f7' }, { min: 400, label: 'Coder', color: '#3b82f6' },
  { min: 200, label: 'Learner', color: '#22c55e' }, { min: 0, label: 'Beginner', color: '#94a3b8' },
];
const getTier = s => TIERS.find(t => s >= t.min) || TIERS[TIERS.length - 1];
const PLAT_COLOR = { leetcode: '#f59e0b', github: '#8b949e', codeforces: '#4f8ef7', codechef: '#cd7f32' };

// ─── tiny shared pieces ───────────────────────────────────────────────────────
function Kpi({ label, value, sub, color = '#8b5cf6', icon: Icon }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '14px', padding: '16px 18px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
        <span style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{label}</span>
        {Icon && <div style={{ width: '26px', height: '26px', borderRadius: '6px', background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon size={12} color={color} /></div>}
      </div>
      <div style={{ fontSize: '24px', fontWeight: '800', color, fontFamily: 'Space Grotesk, sans-serif', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>{sub}</div>}
    </div>
  );
}

function SectionTabs({ tabs, active, onChange }) {
  return (
    <div style={{ display: 'flex', gap: '3px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '4px', marginBottom: '22px', flexWrap: 'wrap' }}>
      {tabs.map(t => (
        <button key={t.key} onClick={() => onChange(t.key)} style={{
          padding: '7px 14px', borderRadius: '7px', fontSize: '12px', fontWeight: '600', cursor: 'pointer',
          border: 'none', fontFamily: 'inherit', transition: 'all 0.15s',
          background: active === t.key ? 'rgba(255,255,255,0.1)' : 'transparent',
          color: active === t.key ? '#f0f0f0' : 'var(--text-muted)',
          display: 'flex', alignItems: 'center', gap: '5px',
        }}>
          {t.icon && <t.icon size={12} />}{t.label}
        </button>
      ))}
    </div>
  );
}

// ─── SECTION: Overview ────────────────────────────────────────────────────────
function OverviewSection({ currentUser, marks, riskScore, roadmapNodes, assignments, sprintStats, codingSummary, veloris }) {
  const name = currentUser?.name?.split(' ')[0] || 'Student';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const riskLevel = riskScore?.level || 'GREEN';
  const riskColor = riskLevel === 'RED' ? '#ef4444' : riskLevel === 'YELLOW' ? '#f59e0b' : '#22c55e';
  const completedNodes = roadmapNodes?.filter(n => n.status === 'completed').length || 0;
  const totalNodes = roadmapNodes?.length || 0;
  const sprintHours = Math.round((sprintStats?.this_week_minutes || 0) / 60);
  const codingHours = codingSummary?.total_weekly_hours || 0;
  const studyHours = +(sprintHours + codingHours).toFixed(1);
  const totalProblems = codingSummary?.total_problems_solved || 0;
  const overdue = assignments?.filter(a => a.submission_status === 'not_submitted' && new Date(a.deadline) < new Date()).length || 0;
  const pending = assignments?.filter(a => a.submission_status === 'not_submitted').length || 0;

  const subjectScores = {};
  marks?.forEach(m => { if (m.max_score > 0) subjectScores[m.subject] = Math.round((m.score / m.max_score) * 100); });
  const radarData = Object.entries(subjectScores).map(([subject, score]) => ({ subject, score }));

  const tier = veloris ? getTier(veloris.veloris_score) : null;

  return (
    <div>
      {/* Greeting */}
      <div style={{ marginBottom: '22px' }}>
        <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '22px', fontWeight: '800', marginBottom: '3px' }}>{greeting}, {name}</div>
        <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
          {overdue > 0 && <span style={{ color: '#f87171' }}>⚠ {overdue} overdue assignment{overdue !== 1 ? 's' : ''}</span>}
          {pending > 0 && <span style={{ color: '#fbbf24' }}>📋 {pending} pending</span>}
          {tier && <span style={{ color: tier.color }}>⚡ {tier.label} · {veloris.veloris_score} V-Score</span>}
        </div>
      </div>

      {/* Nudge */}
      {currentUser?.pending_nudge && (
        <div style={{ padding: '12px 16px', marginBottom: '20px', display: 'flex', alignItems: 'flex-start', gap: '10px', background: 'rgba(239,159,39,0.08)', borderRadius: '12px', border: '1px solid rgba(239,159,39,0.2)', borderLeft: '3px solid #EF9F27' }}>
          <Zap size={14} color="#EF9F27" style={{ marginTop: '1px', flexShrink: 0 }} />
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{currentUser.pending_nudge}</div>
        </div>
      )}

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', marginBottom: '22px' }}>
        <Kpi label="Wellbeing" value={riskLevel} sub={riskScore ? `Score ${riskScore.score}/100` : 'Nightly'} color={riskColor} icon={Activity} />
        <Kpi label="Roadmap" value={`${completedNodes}/${totalNodes}`} sub="Nodes done" color="#a0a0a0" icon={TrendingUp} />
        <Kpi label="Study Time" value={`${studyHours}h`} sub="This week" color="#f59e0b" icon={Timer} />
        <Kpi label="Problems" value={totalProblems || '—'} sub="All platforms" color="#22c55e" icon={Code2} />
        <Kpi label="Assignments" value={pending} sub={overdue > 0 ? `${overdue} overdue` : 'pending'} color={overdue > 0 ? '#ef4444' : '#5B5BD6'} icon={BookOpen} />
      </div>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '14px', padding: '18px' }}>
          <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '3px' }}>Subject Performance</div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '14px' }}>Marks · out of 100</div>
          {radarData.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="rgba(255,255,255,0.05)" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#8b8ba0', fontSize: 10 }} />
                <Radar dataKey="score" stroke="#808080" fill="#808080" fillOpacity={0.15} strokeWidth={2} dot={{ fill: '#808080', r: 3 }} />
              </RadarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', color: 'var(--text-muted)' }}>Upload a marksheet to see your radar</div>
          )}
        </div>

        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '14px', padding: '18px' }}>
          <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '3px' }}>Subject Breakdown</div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '14px' }}>Score per subject</div>
          {Object.keys(subjectScores).length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {Object.entries(subjectScores).map(([sub, score]) => (
                <div key={sub}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '11px', fontWeight: '500' }}>{sub}</span>
                    <span style={{ fontSize: '11px', fontWeight: '700', color: score < 60 ? '#ef4444' : score < 75 ? '#f59e0b' : '#22c55e' }}>{score}%</span>
                  </div>
                  <ProgressBar value={score} color={score < 60 ? '#ef4444' : score < 75 ? '#f59e0b' : '#22c55e'} height={4} />
                </div>
              ))}
            </div>
          ) : (
            <div style={{ height: '140px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', color: 'var(--text-muted)' }}>No marks uploaded yet</div>
          )}
        </div>
      </div>

      {/* Recent assignments + activity */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '14px', padding: '18px' }}>
          <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '14px' }}>Recent Assignments</div>
          {assignments?.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {assignments.slice(0, 5).map(a => {
                const due = dueIn(a.deadline);
                const sc = a.submission_status;
                return (
                  <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 12px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: `1px solid ${due.urgent && sc === 'not_submitted' ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.05)'}` }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '12px', fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.title}</div>
                      <div style={{ fontSize: '10px', color: due.urgent && sc === 'not_submitted' ? due.color : 'var(--text-muted)' }}>{a.subject} · {due.text}</div>
                    </div>
                    <span style={{ fontSize: '10px', fontWeight: '600', padding: '2px 7px', borderRadius: '99px', whiteSpace: 'nowrap',
                      background: sc === 'submitted' ? 'rgba(34,197,94,0.1)' : sc === 'late' ? 'rgba(245,158,11,0.1)' : 'rgba(255,255,255,0.04)',
                      color: sc === 'submitted' ? '#22c55e' : sc === 'late' ? '#f59e0b' : '#5a5a7a',
                    }}>{sc === 'not_submitted' ? 'pending' : sc}</span>
                  </div>
                );
              })}
            </div>
          ) : <div style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>No assignments yet</div>}
        </div>

        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '14px', padding: '18px' }}>
          <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '3px' }}>Recent Activity</div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '14px' }}>Commits & submissions</div>
          {codingSummary?.recent_submissions?.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {codingSummary.recent_submissions.slice(0, 6).map((s, i) => (
                <a key={i} href={s.url || '#'} target="_blank" rel="noreferrer"
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '7px 10px', background: 'rgba(255,255,255,0.02)', borderRadius: '7px', textDecoration: 'none', color: 'var(--text-primary)' }}>
                  <span style={{ fontSize: '9px', padding: '2px 5px', borderRadius: '4px', background: `${PLAT_COLOR[s.platform] || '#555'}22`, color: PLAT_COLOR[s.platform] || '#aaa', whiteSpace: 'nowrap', flexShrink: 0 }}>{s.platform}</span>
                  <span style={{ flex: 1, fontSize: '11px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.title}</span>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{timeAgo(s.time)}</span>
                </a>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>
              Link a coding platform to see activity
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── SECTION: Assignments ─────────────────────────────────────────────────────
function SubmitModal({ assignment, isEdit = false, onClose, onSubmitted }) {
  const [mode, setMode] = useState('text');
  const [text, setText] = useState('');
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef();

  const handleSubmit = async () => {
    if (mode === 'text' && !text.trim()) { setError('Write something first.'); return; }
    if (mode === 'file' && !file) { setError('Select a file first.'); return; }
    setSubmitting(true); setError('');
    try {
      const fd = new FormData();
      if (mode === 'text') fd.append('text_response', text.trim());
      if (mode === 'file') fd.append('file', file);
      const method = isEdit ? 'PATCH' : 'POST';
      const url = isEdit ? `/assignments/${assignment.id}/my-submission` : `/assignments/${assignment.id}/submit`;
      const res = await authFetch(url, { method, body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Submission failed');
      onSubmitted(data);
    } catch (e) { setError(e.message); }
    setSubmitting(false);
  };

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 200 }} />
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 'min(520px,92vw)', background: '#0D0D1A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', zIndex: 201, padding: '24px' }}>
        <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '15px', fontWeight: 700, marginBottom: '3px' }}>{isEdit ? 'Edit Submission' : assignment.title}</div>
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '18px' }}>{assignment.subject} · {assignment.class_id}</div>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
          {[['text', 'Text', FileText], ['file', 'File', Upload]].map(([m, label, Icon]) => (
            <button key={m} onClick={() => setMode(m)} style={{ flex: 1, padding: '8px', borderRadius: '8px', fontSize: '12px', fontWeight: 500, cursor: 'pointer', border: `1.5px solid ${mode === m ? '#5B5BD6' : 'rgba(255,255,255,0.08)'}`, background: mode === m ? 'rgba(91,91,214,0.12)' : 'transparent', color: mode === m ? '#A8A8F8' : 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
              <Icon size={12} />{label}
            </button>
          ))}
        </div>
        {mode === 'text' && (
          <textarea value={text} onChange={e => setText(e.target.value)} placeholder="Write your answer here..." rows={5}
            style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '12px', fontSize: '13px', color: 'var(--text-primary)', resize: 'vertical', outline: 'none', boxSizing: 'border-box' }} />
        )}
        {mode === 'file' && (
          <div onClick={() => fileRef.current?.click()} style={{ border: '2px dashed rgba(255,255,255,0.1)', borderRadius: '10px', padding: '28px', textAlign: 'center', cursor: 'pointer' }}>
            <input ref={fileRef} type="file" style={{ display: 'none' }} onChange={e => setFile(e.target.files[0])} />
            {file ? <><CheckCircle2 size={22} color="#22c55e" style={{ margin: '0 auto 6px' }} /><div style={{ fontSize: '12px' }}>{file.name}</div></>
              : <><Upload size={22} color="var(--text-muted)" style={{ margin: '0 auto 6px' }} /><div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Click to select file</div></>}
          </div>
        )}
        {error && <div style={{ marginTop: '8px', fontSize: '12px', color: '#f09595', background: 'rgba(239,68,68,0.08)', borderRadius: '8px', padding: '8px 12px' }}>{error}</div>}
        <div style={{ display: 'flex', gap: '8px', marginTop: '14px', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '12px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-muted)', cursor: 'pointer' }}>Cancel</button>
          <button onClick={handleSubmit} disabled={submitting} style={{ padding: '8px 18px', borderRadius: '8px', fontSize: '12px', fontWeight: 500, background: submitting ? 'rgba(34,197,94,0.3)' : '#22c55e', color: '#fff', border: 'none', cursor: submitting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
            {submitting ? <><Loader2 size={12} style={{ animation: 'spin 0.6s linear infinite' }} /> Submitting...</> : <><Send size={12} /> Submit</>}
          </button>
        </div>
      </div>
    </>
  );
}

function AssignmentsSection({ assignments, onUpdate }) {
  const [filter, setFilter] = useState('all');
  const [submitting, setSubmitting] = useState(null);
  const [editing, setEditing] = useState(null);
  const [toast, setToast] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [submissions, setSubmissions] = useState({}); // cache by assignment id
  const [loadingSub, setLoadingSub] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3500); };

  const handleSubmitted = sub => {
    onUpdate(sub);
    setSubmitting(null);
    setEditing(null);
    setSubmissions(prev => ({ ...prev, [sub.assignment_id]: sub }));
    showToast(sub.status === 'late' ? 'Submitted (late)' : 'Submitted ✓', sub.status === 'late' ? 'warn' : 'success');
  };

  const toggleExpand = async (a) => {
    const isOpen = expanded === a.id;
    setExpanded(isOpen ? null : a.id);
    const isSubmitted = a.submission_status === 'submitted' || a.submission_status === 'late';
    if (!isOpen && isSubmitted && !submissions[a.id]) {
      setLoadingSub(a.id);
      try {
        const res = await authFetch(`/assignments/${a.id}/my-submission`);
        if (res.ok) {
          const data = await res.json();
          setSubmissions(prev => ({ ...prev, [a.id]: data }));
        }
      } catch { /* silent */ }
      setLoadingSub(null);
    }
  };

  const handleDelete = async (a) => {
    if (!window.confirm('Remove your submission? This cannot be undone.')) return;
    setDeleting(a.id);
    try {
      const res = await authFetch(`/assignments/${a.id}/my-submission`, { method: 'DELETE' });
      if (res.ok || res.status === 204) {
        onUpdate({ assignment_id: a.id, status: 'not_submitted' });
        setSubmissions(prev => { const n = { ...prev }; delete n[a.id]; return n; });
        setExpanded(null);
        showToast('Submission removed');
      } else {
        const d = await res.json().catch(() => ({}));
        showToast(d.detail || 'Could not delete', 'error');
      }
    } catch { showToast('Could not delete', 'error'); }
    setDeleting(null);
  };

  const now = new Date();
  const overdue = assignments.filter(a => a.submission_status === 'not_submitted' && new Date(a.deadline) < now).length;
  const dueToday = assignments.filter(a => {
    if (a.submission_status !== 'not_submitted') return false;
    const diff = Math.ceil((new Date(a.deadline) - now) / 864e5);
    return diff >= 0 && diff <= 1;
  }).length;
  const pending = assignments.filter(a => a.submission_status === 'not_submitted').length;
  const done = assignments.filter(a => a.submission_status === 'submitted' || a.submission_status === 'late').length;

  const filtered = assignments.filter(a => {
    if (filter === 'pending') return a.submission_status === 'not_submitted' && new Date(a.deadline) >= now;
    if (filter === 'submitted') return a.submission_status === 'submitted' || a.submission_status === 'late';
    if (filter === 'overdue') return a.submission_status === 'not_submitted' && new Date(a.deadline) < now;
    return true;
  });

  return (
    <div>
      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '18px' }}>
        {[{ label: 'Total', value: assignments.length, color: '#5B5BD6' }, { label: 'Pending', value: pending, color: '#f59e0b' }, { label: 'Submitted', value: done, color: '#22c55e' }, { label: 'Overdue', value: overdue, color: '#ef4444' }].map(s => (
          <div key={s.label} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '12px', textAlign: 'center' }}>
            <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '22px', fontWeight: '700', color: s.color }}>{s.value}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Urgent banner */}
      {(overdue > 0 || dueToday > 0) && (
        <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '10px', padding: '10px 14px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#f09595' }}>
          <AlertTriangle size={14} color="#ef4444" />
          {overdue > 0 && <><strong>{overdue}</strong> overdue{dueToday > 0 ? ' · ' : ''}</>}
          {dueToday > 0 && <><strong>{dueToday}</strong> due within 24h</>}
          {' — submit now.'}
        </div>
      )}

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: '5px', marginBottom: '14px' }}>
        {[['all', 'All'], ['pending', 'Pending'], ['submitted', 'Submitted'], ['overdue', 'Overdue']].map(([k, l]) => (
          <button key={k} onClick={() => setFilter(k)} style={{ padding: '5px 12px', borderRadius: '7px', fontSize: '11px', fontWeight: '600', cursor: 'pointer', border: `1.5px solid ${filter === k ? '#5B5BD6' : 'rgba(255,255,255,0.08)'}`, background: filter === k ? 'rgba(91,91,214,0.12)' : 'transparent', color: filter === k ? '#A8A8F8' : 'var(--text-muted)' }}>{l}</button>
        ))}
      </div>

      {/* List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', fontSize: '12px' }}>
            <BookOpen size={28} style={{ margin: '0 auto 10px', opacity: 0.3 }} /><br />No {filter === 'all' ? '' : filter} assignments
          </div>
        ) : filtered.map(a => {
          const due = dueIn(a.deadline);
          const sc = a.submission_status;
          const canSubmit = sc === 'not_submitted';
          const isSubmitted = sc === 'submitted' || sc === 'late';
          const isExpanded = expanded === a.id;
          const sub = submissions[a.id];
          const canEdit = isSubmitted && sub && !sub.grade;
          return (
            <div key={a.id} style={{ background: 'rgba(255,255,255,0.02)', border: `1.5px solid ${due.urgent && canSubmit ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.07)'}`, borderRadius: '12px', overflow: 'hidden' }}>
              {due.urgent && canSubmit && <div style={{ height: '2px', background: due.color }} />}
              <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '7px', flexWrap: 'wrap', marginBottom: '3px' }}>
                    <span style={{ fontSize: '13px', fontWeight: '600' }}>{a.title}</span>
                    <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '99px', background: 'rgba(79,142,247,0.12)', color: '#4f8ef7' }}>{a.subject}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', color: due.color, display: 'flex', alignItems: 'center', gap: '3px' }}><Clock size={10} />{due.text}</span>
                    <span style={{ fontSize: '10px', padding: '1px 7px', borderRadius: '99px', background: sc === 'submitted' ? 'rgba(34,197,94,0.1)' : sc === 'late' ? 'rgba(245,158,11,0.1)' : 'rgba(255,255,255,0.04)', color: sc === 'submitted' ? '#22c55e' : sc === 'late' ? '#f59e0b' : '#5a5a7a' }}>{sc === 'not_submitted' ? 'pending' : sc}</span>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{new Date(a.deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexShrink: 0 }}>
                  {canSubmit && (
                    <button onClick={() => setSubmitting(a)} style={{ padding: '6px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: 500, background: '#5B5BD6', color: '#fff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Send size={10} /> Submit
                    </button>
                  )}
                  {(a.description || isSubmitted) && (
                    <button onClick={() => toggleExpand(a)} style={{ padding: '6px 8px', borderRadius: '8px', background: 'transparent', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-muted)', cursor: 'pointer' }}>
                      {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    </button>
                  )}
                </div>
              </div>

              {isExpanded && (
                <div style={{ padding: '0 14px 14px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px' }}>
                  {a.description && (
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.7, whiteSpace: 'pre-wrap', marginBottom: isSubmitted ? '14px' : 0 }}>{a.description}</div>
                  )}

                  {isSubmitted && (
                    loadingSub === a.id ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-muted)' }}>
                        <Loader2 size={12} style={{ animation: 'spin 0.6s linear infinite' }} /> Loading submission...
                      </div>
                    ) : sub ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                            Your Submission · {new Date(sub.submitted_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </div>
                          {canEdit && (
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <button onClick={() => setEditing(a)} style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '11px', background: 'rgba(91,91,214,0.12)', border: '1px solid rgba(91,91,214,0.3)', color: '#A8A8F8', cursor: 'pointer' }}>Edit</button>
                              <button onClick={() => handleDelete(a)} disabled={deleting === a.id} style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '11px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', cursor: 'pointer' }}>
                                {deleting === a.id ? '...' : 'Remove'}
                              </button>
                            </div>
                          )}
                        </div>

                        {sub.text && (
                          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '12px', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{sub.text}</div>
                        )}
                        {sub.file_path && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#4f8ef7' }}>
                            <Paperclip size={12} /><span>{sub.file_path.split('/').pop()}</span>
                          </div>
                        )}
                        {sub.grade && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)', borderRadius: '10px' }}>
                            <Star size={14} color="#22c55e" />
                            <span style={{ fontSize: '13px', fontWeight: 600, color: '#22c55e' }}>Grade: {sub.grade}</span>
                          </div>
                        )}
                        {sub.feedback && (
                          <div style={{ padding: '12px 14px', background: 'rgba(91,91,214,0.06)', border: '1px solid rgba(91,91,214,0.15)', borderRadius: '10px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                              <MessageSquare size={12} color="#A8A8F8" />
                              <span style={{ fontSize: '11px', fontWeight: 600, color: '#A8A8F8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Teacher Feedback</span>
                            </div>
                            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{sub.feedback}</div>
                          </div>
                        )}
                        {!sub.grade && !sub.feedback && (
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>No grade or feedback yet.</div>
                        )}
                      </div>
                    ) : null
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {submitting && <SubmitModal assignment={submitting} onClose={() => setSubmitting(null)} onSubmitted={handleSubmitted} />}
      {editing && <SubmitModal assignment={editing} isEdit onClose={() => setEditing(null)} onSubmitted={handleSubmitted} />}
      {toast && (
        <div style={{ position: 'fixed', bottom: '24px', right: '24px', background: 'rgba(20,20,36,0.95)', border: `1px solid ${toast.type === 'success' ? '#22c55e' : toast.type === 'warn' ? '#f59e0b' : '#ef4444'}`, borderRadius: '10px', padding: '10px 16px', fontSize: '12px', zIndex: 999, color: toast.type === 'success' ? '#7DC9A8' : toast.type === 'warn' ? '#fbbf24' : '#f87171' }}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}

// ─── SECTION: Coding ─────────────────────────────────────────────────────────
const PLATFORMS = [
  { id: 'leetcode',   label: 'LeetCode',   color: '#f59e0b', url: u => `https://leetcode.com/u/${u}` },
  { id: 'github',     label: 'GitHub',     color: '#8b949e', url: u => `https://github.com/${u}` },
  { id: 'codeforces', label: 'Codeforces', color: '#4f8ef7', url: u => `https://codeforces.com/profile/${u}` },
  { id: 'codechef',   label: 'CodeChef',   color: '#cd7f32', url: u => `https://codechef.com/users/${u}` },
];

function VScoreBar({ score }) {
  if (!score) return null;
  const tier = getTier(score.veloris_score ?? 0);
  const bd = score.breakdown ?? {};
  const segs = [
    { label: 'LC',  val: bd.lc ?? 0,       max: 350, color: '#f59e0b' },
    { label: 'CF',  val: bd.cf ?? 0,       max: 250, color: '#4f8ef7' },
    { label: 'CC',  val: bd.cc ?? 0,       max: 150, color: '#cd7f32' },
    { label: 'GH',  val: bd.gh ?? 0,       max: 150, color: '#8b949e' },
    { label: 'Act', val: bd.activity ?? 0, max: 100, color: '#22c55e' },
  ];
  const total = score.veloris_score ?? 0;
  return (
    <div style={{ background: `linear-gradient(135deg, rgba(255,255,255,0.02), ${tier.color}10)`, border: `1px solid ${tier.color}30`, borderRadius: '14px', padding: '18px 20px', marginBottom: '18px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
          <div style={{ fontSize: '42px', fontWeight: '800', fontFamily: 'Space Grotesk, sans-serif', color: tier.color, lineHeight: 1 }}>{total}</div>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Veloris Score</div>
            <div style={{ fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '12px', background: `${tier.color}20`, color: tier.color, border: `1px solid ${tier.color}40`, display: 'inline-block', marginTop: '3px' }}>⚡ {tier.label}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
          {segs.map(s => (
            <div key={s.label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '15px', fontWeight: '700', color: s.color, fontFamily: 'Space Grotesk, sans-serif' }}>{Math.round(s.val)}</div>
              <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>{s.label} /{s.max}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', gap: '2px', height: '5px', borderRadius: '3px', overflow: 'hidden', marginTop: '14px' }}>
        {segs.map(s => (
          <div key={s.label} style={{ flex: s.max, background: s.val > 0 ? s.color : 'rgba(255,255,255,0.06)', opacity: s.val > 0 ? Math.max(0.3, s.val / s.max) : 1 }} />
        ))}
      </div>
    </div>
  );
}

function PlatformMiniCard({ profile, onSync, syncing }) {
  const meta = PLATFORMS.find(p => p.id === profile.platform);
  if (!meta) return null;
  const stat = profile.platform === 'leetcode' ? `${profile.solved_total ?? 0} solved`
    : profile.platform === 'github' ? `${profile.total_commits_year ?? 0} commits`
    : profile.platform === 'codeforces' ? `${profile.cf_rating ?? '—'} rating`
    : `${profile.cc_rating ?? '—'} rating`;
  const sub = profile.platform === 'leetcode' ? `${profile.easy ?? 0}E · ${profile.medium ?? 0}M · ${profile.hard ?? 0}H`
    : profile.platform === 'github' ? `${profile.public_repos ?? 0} repos · ${profile.top_language || '—'}`
    : profile.platform === 'codeforces' ? (profile.cf_rank || '')
    : profile.cc_stars ? `${'★'.repeat(Math.min(parseInt(profile.cc_stars) || 0, 5))}` : '';

  return (
    <div style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${meta.color}30`, borderRadius: '12px', padding: '14px 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: meta.color }} />
          <span style={{ fontSize: '11px', fontWeight: '700', color: meta.color }}>{meta.label}</span>
          <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>@{profile.username}</span>
        </div>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <button onClick={() => onSync(profile.platform)} disabled={syncing === profile.platform} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '2px', display: 'flex' }}>
            <RefreshCw size={11} style={{ animation: syncing === profile.platform ? 'spin 1s linear infinite' : 'none' }} />
          </button>
          <a href={meta.url(profile.username)} target="_blank" rel="noreferrer">
            <ExternalLink size={11} color="var(--text-muted)" />
          </a>
        </div>
      </div>
      <div style={{ fontSize: '18px', fontWeight: '700', color: meta.color, fontFamily: 'Space Grotesk, sans-serif', marginBottom: '2px' }}>{stat}</div>
      {sub && <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '6px' }}>{sub}</div>}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-muted)' }}>
        <span><Clock size={9} style={{ display: 'inline', marginRight: '3px' }} />{timeAgo(profile.last_activity_at)}</span>
        {profile.estimated_weekly_hours > 0 && <span style={{ color: '#8b5cf6' }}>{safeH(profile.estimated_weekly_hours)}/wk</span>}
      </div>
    </div>
  );
}

function ConnectCard({ platformId, onLinked }) {
  const [val, setVal] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [open, setOpen] = useState(false);
  const meta = PLATFORMS.find(p => p.id === platformId);

  const submit = async () => {
    if (!val.trim()) return;
    setBusy(true); setErr('');
    try {
      const syncFns = { leetcode: () => api.coding.syncLeetcode(val.trim()), github: () => api.coding.syncGithub(val.trim()), codeforces: () => api.coding.syncCodeforces(val.trim()), codechef: () => api.coding.syncCodechef(val.trim()) };
      await syncFns[platformId]();
      onLinked();
    } catch { setErr('Not found or unavailable.'); }
    setBusy(false);
  };

  return (
    <div style={{ background: 'rgba(255,255,255,0.015)', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '12px', overflow: 'hidden' }}>
      {!open ? (
        <div style={{ padding: '16px', textAlign: 'center', cursor: 'pointer' }} onClick={() => setOpen(true)}>
          <Link2 size={16} color={meta.color} style={{ margin: '0 auto 8px', opacity: 0.6 }} />
          <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '8px' }}>{meta.label}</div>
          <button className="btn" style={{ fontSize: '10px', padding: '4px 12px', background: `${meta.color}15`, color: meta.color, border: `1px solid ${meta.color}35` }}>+ Connect</button>
        </div>
      ) : (
        <div style={{ padding: '12px' }}>
          <div style={{ fontSize: '11px', fontWeight: '600', color: meta.color, marginBottom: '8px' }}>{meta.label}</div>
          <div style={{ display: 'flex', gap: '6px' }}>
            <input className="input" placeholder={`username`} value={val} onChange={e => setVal(e.target.value)} onKeyDown={e => e.key === 'Enter' && !busy && submit()} style={{ flex: 1, fontSize: '11px', height: '32px' }} autoFocus />
            <button className="btn btn-primary" disabled={busy || !val.trim()} onClick={submit} style={{ fontSize: '11px', height: '32px', padding: '0 10px' }}>
              {busy ? <Loader2 size={11} style={{ animation: 'spin 0.6s linear infinite' }} /> : 'Save'}
            </button>
          </div>
          {err && <div style={{ fontSize: '10px', color: '#ef4444', marginTop: '5px' }}>{err}</div>}
          <button onClick={() => setOpen(false)} style={{ fontSize: '10px', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', marginTop: '4px' }}>Cancel</button>
        </div>
      )}
    </div>
  );
}

function LCBreakdown({ p }) {
  const data = [{ tag: 'Easy', solved: p.easy ?? 0, color: '#22c55e' }, { tag: 'Medium', solved: p.medium ?? 0, color: '#f59e0b' }, { tag: 'Hard', solved: p.hard ?? 0, color: '#ef4444' }];
  return (
    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '16px' }}>
      <div style={{ fontSize: '12px', fontWeight: '600', marginBottom: '12px', color: '#f59e0b' }}>LeetCode Breakdown</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '8px', marginBottom: '12px' }}>
        {data.map(({ tag, solved, color }) => (
          <div key={tag} style={{ textAlign: 'center', padding: '10px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
            <div style={{ fontSize: '18px', fontWeight: '700', color, fontFamily: 'Space Grotesk, sans-serif' }}>{solved}</div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{tag}</div>
          </div>
        ))}
      </div>
      <ResponsiveContainer width="100%" height={100}>
        <BarChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
          <XAxis dataKey="tag" tick={{ fill: '#8b8ba0', fontSize: 10 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: '#8b8ba0', fontSize: 10 }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '11px' }} />
          <Bar dataKey="solved" fill="#f59e0b" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function Leaderboard({ currentUserId }) {
  const [board, setBoard] = useState([]);
  const [busy, setBusy] = useState(true);
  const MEDAL = { 1: '🥇', 2: '🥈', 3: '🥉' };

  useEffect(() => {
    api.coding.getLeaderboard()
      .then(d => setBoard(Array.isArray(d) ? d : (d?.leaderboard ?? [])))
      .catch(() => {})
      .finally(() => setBusy(false));
  }, []);

  if (busy) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {[...Array(5)].map((_, i) => <div key={i} style={{ height: '48px', borderRadius: '8px', background: 'rgba(255,255,255,0.04)' }} />)}
    </div>
  );
  if (!board.length) return (
    <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)', fontSize: '12px' }}>
      <Trophy size={24} style={{ margin: '0 auto 10px', opacity: 0.3 }} /><br />No profiles ranked yet
    </div>
  );

  const me = board.find(r => r.is_me);
  return (
    <div>
      {me && (
        <div style={{ padding: '10px 14px', borderRadius: '10px', background: `${getTier(me.veloris_score ?? 0).color}15`, border: `1px solid ${getTier(me.veloris_score ?? 0).color}40`, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Your rank</span>
          <span style={{ fontSize: '20px', fontWeight: '800', fontFamily: 'Space Grotesk', color: getTier(me.veloris_score ?? 0).color }}>#{me.rank}</span>
          <span style={{ fontSize: '14px', fontWeight: '700', color: getTier(me.veloris_score ?? 0).color }}>{me.veloris_score} pts</span>
          <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '12px', background: `${getTier(me.veloris_score ?? 0).color}20`, color: getTier(me.veloris_score ?? 0).color }}>⚡ {getTier(me.veloris_score ?? 0).label}</span>
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {board.slice(0, 10).map(row => {
          const tier = getTier(row.veloris_score ?? 0);
          return (
            <div key={row.rank} style={{ display: 'grid', gridTemplateColumns: '36px 1fr 90px 70px 70px', gap: '8px', padding: '9px 12px', borderRadius: '8px', background: row.is_me ? `${tier.color}12` : 'rgba(255,255,255,0.02)', border: row.is_me ? `1px solid ${tier.color}40` : '1px solid rgba(255,255,255,0.05)', alignItems: 'center' }}>
              <span style={{ fontSize: row.rank <= 3 ? '16px' : '12px', textAlign: 'center' }}>{MEDAL[row.rank] || `#${row.rank}`}</span>
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontSize: '12px', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {row.name}{row.is_me && <span style={{ marginLeft: '5px', fontSize: '9px', color: tier.color }}>(you)</span>}
                </div>
                {row.branch && <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{row.branch}</div>}
              </div>
              <div>
                <div style={{ fontSize: '13px', fontWeight: '700', color: tier.color, fontFamily: 'Space Grotesk' }}>{row.veloris_score}</div>
                <div style={{ fontSize: '9px', color: tier.color, opacity: 0.7 }}>{tier.label}</div>
              </div>
              <div style={{ textAlign: 'center', fontSize: '11px', fontWeight: '600' }}>{row.problems_solved ?? '—'}</div>
              <div style={{ textAlign: 'right', fontSize: '10px', color: 'var(--text-muted)' }}>{timeAgo(row.last_activity_at)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CodingSection({ currentUser }) {
  const [profiles, setProfiles] = useState([]);
  const [summary, setSummary] = useState(null);
  const [veloris, setVeloris] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState('');

  const fetchAll = useCallback(async () => {
    try {
      const [profs, sum] = await Promise.all([api.coding.getProfiles(), api.coding.getSummary()]);
      setProfiles(Array.isArray(profs) ? profs : []);
      setSummary(sum);
      api.coding.getScore().then(setVeloris).catch(() => {});
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const sync = async platform => {
    const p = profiles.find(x => x.platform === platform);
    if (!p) return;
    setSyncing(platform);
    try {
      const fns = { leetcode: () => api.coding.syncLeetcode(p.username), github: () => api.coding.syncGithub(p.username), codeforces: () => api.coding.syncCodeforces(p.username), codechef: () => api.coding.syncCodechef(p.username) };
      await fns[platform]();
      await fetchAll();
    } catch (e) { console.error(e); }
    setSyncing('');
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}><Loader2 size={24} style={{ animation: 'spin 0.8s linear infinite', color: '#5B5BD6' }} /></div>;

  const linked = profiles.map(p => p.platform);
  const lc = profiles.find(p => p.platform === 'leetcode');

  return (
    <div>
      {/* V-Score */}
      <VScoreBar score={veloris} />

      {/* Summary KPIs */}
      {summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px', marginBottom: '18px' }}>
          {[
            { label: 'Weekly Hours', value: safeH(summary.total_weekly_hours), color: '#8b5cf6' },
            { label: 'Problems Solved', value: summary.total_problems_solved ?? 0, color: '#22c55e' },
            { label: 'Last Active', value: timeAgo(summary.last_activity_at), color: (summary.days_since_activity ?? 99) > 7 ? '#ef4444' : '#f59e0b' },
            { label: 'Platforms', value: `${linked.length}/4`, color: '#4f8ef7' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
              <div style={{ fontSize: '18px', fontWeight: '700', color, fontFamily: 'Space Grotesk, sans-serif' }}>{value}</div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Platform cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px', marginBottom: '18px' }}>
        {PLATFORMS.map(plat => {
          const prof = profiles.find(p => p.platform === plat.id);
          return prof
            ? <PlatformMiniCard key={plat.id} profile={prof} onSync={sync} syncing={syncing} />
            : <ConnectCard key={plat.id} platformId={plat.id} onLinked={fetchAll} />;
        })}
      </div>

      {/* LeetCode breakdown if linked */}
      {lc && (
        <div style={{ marginBottom: '18px' }}>
          <LCBreakdown p={lc} />
        </div>
      )}

      {/* Recent activity */}
      {summary?.recent_submissions?.length > 0 && (
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '16px', marginBottom: '18px' }}>
          <div style={{ fontSize: '12px', fontWeight: '600', marginBottom: '10px' }}>Recent Activity</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            {summary.recent_submissions.slice(0, 8).map((s, i) => (
              <a key={i} href={s.url || '#'} target="_blank" rel="noreferrer"
                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '7px 10px', background: 'rgba(255,255,255,0.02)', borderRadius: '7px', textDecoration: 'none', color: 'var(--text-primary)' }}>
                <span style={{ fontSize: '9px', padding: '2px 5px', borderRadius: '4px', background: `${PLAT_COLOR[s.platform] || '#555'}22`, color: PLAT_COLOR[s.platform] || '#aaa', whiteSpace: 'nowrap', flexShrink: 0 }}>{s.platform}</span>
                <span style={{ flex: 1, fontSize: '11px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.title}</span>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{timeAgo(s.time)}</span>
                <ExternalLink size={10} color="var(--text-muted)" style={{ flexShrink: 0 }} />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Leaderboard */}
      <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
          <Trophy size={13} color="#f59e0b" />
          <span style={{ fontSize: '12px', fontWeight: '600' }}>Class Leaderboard</span>
          <div style={{ display: 'grid', gridTemplateColumns: '36px 1fr 90px 70px 70px', gap: '8px', padding: '4px 12px', fontSize: '10px', color: 'var(--text-muted)', fontWeight: '600', letterSpacing: '0.05em', marginLeft: 'auto' }}>
            <span /><span /><span>SCORE</span><span style={{ textAlign: 'center' }}>PROBS</span><span style={{ textAlign: 'right' }}>ACTIVE</span>
          </div>
        </div>
        <Leaderboard currentUserId={currentUser?.id} />
      </div>
    </div>
  );
}

// ─── ROOT EXPORT ──────────────────────────────────────────────────────────────
const TABS = [
  { key: 'overview',    label: 'Overview',    icon: LayoutDashboard },
  { key: 'assignments', label: 'Assignments', icon: BookOpen },
  { key: 'coding',      label: 'Coding',      icon: Code2 },
];

export default function StudentDashboard() {
  const {
    currentUser, marks, riskScore, roadmapNodes, assignments,
    sprintStats, codingSummary,
    fetchMarks, fetchRiskScore, fetchRoadmap, fetchSprintStats,
    fetchAssignments, fetchCodingSummary,
  } = useAppStore();

  const [tab, setTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [veloris, setVeloris] = useState(null);
  const [localAssignments, setLocalAssignments] = useState(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetchMarks(), fetchRiskScore(), fetchRoadmap(),
      fetchSprintStats(), fetchAssignments(), fetchCodingSummary(),
    ]).finally(() => { if (!cancelled) setLoading(false); });
    api.coding.getScore().then(setVeloris).catch(() => {});
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // keep local copy so inline submissions update without refetch
  useEffect(() => {
    if (assignments) setLocalAssignments(assignments);
  }, [assignments]);

  const handleAssignmentUpdate = sub => {
    setLocalAssignments(prev =>
      (prev || []).map(a =>
        a.id === sub.assignment_id ? { ...a, submission_status: sub.status } : a
      )
    );
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <Loader2 size={28} style={{ animation: 'spin 0.8s linear infinite', color: '#5B5BD6' }} />
    </div>
  );

  const asgns = localAssignments || assignments || [];

  return (
    <div className="fade-in-up" style={{ maxWidth: '960px', margin: '0 auto' }}>
      <SectionTabs tabs={TABS} active={tab} onChange={setTab} />

      {tab === 'overview' && (
        <OverviewSection
          currentUser={currentUser} marks={marks} riskScore={riskScore}
          roadmapNodes={roadmapNodes} assignments={asgns}
          sprintStats={sprintStats} codingSummary={codingSummary}
          veloris={veloris}
        />
      )}
      {tab === 'assignments' && (
        <AssignmentsSection assignments={asgns} onUpdate={handleAssignmentUpdate} />
      )}
      {tab === 'coding' && (
        <CodingSection currentUser={currentUser} />
      )}

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
