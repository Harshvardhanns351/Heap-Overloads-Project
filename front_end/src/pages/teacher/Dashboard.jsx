import React, { useEffect, useMemo, useState } from 'react';
import useAppStore from '../../store';
import { api } from '../../api';
import { ProgressBar } from '../../components/UI';
import {
  Activity, AlertTriangle, BookOpen, CheckCircle2, Clock,
  Code2, Loader2, Medal, TrendingUp, Users,
  BarChart3, Star, Flame, LayoutDashboard, Trophy,
} from 'lucide-react';

// ─── tiny helpers ────────────────────────────────────────────────────────────
const CLASSES = ['CSE-A', 'CSE-B'];

const initials = (name = '') =>
  name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

const riskColor = level => ({ RED: '#ef4444', YELLOW: '#f59e0b', GREEN: '#22c55e' }[level] || '#22c55e');

const tierColor = t => ({ Beginner: '#94a3b8', Learner: '#22c55e', Coder: '#3b82f6', Expert: '#a855f7', Elite: '#f59e0b', Legend: '#ef4444' }[t] || '#94a3b8');

function ago(iso) {
  if (!iso) return 'Never';
  const d = Math.floor((Date.now() - new Date(iso)) / 86400000);
  if (d === 0) return 'Today';
  if (d === 1) return 'Yesterday';
  if (d < 7) return `${d}d ago`;
  if (d < 30) return `${Math.floor(d / 7)}w ago`;
  return `${Math.floor(d / 30)}mo ago`;
}

// ─── sub-components ──────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, color = '#8b5cf6', icon: Icon }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '14px', padding: '18px 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
        <span style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{label}</span>
        {Icon && <div style={{ width: '28px', height: '28px', borderRadius: '7px', background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon size={13} color={color} /></div>}
      </div>
      <div style={{ fontSize: '26px', fontWeight: '800', color, fontFamily: 'Space Grotesk, sans-serif', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '5px' }}>{sub}</div>}
    </div>
  );
}

function SectionTab({ tabs, active, onChange }) {
  return (
    <div style={{ display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '4px', marginBottom: '20px', flexWrap: 'wrap' }}>
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

function StudentAvatar({ name, riskLevel, size = 32 }) {
  const c = riskColor(riskLevel);
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: `${c}18`, border: `1.5px solid ${c}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.35, fontWeight: '700', color: c, flexShrink: 0 }}>
      {initials(name)}
    </div>
  );
}

// ─── SECTION: Overview ───────────────────────────────────────────────────────
function OverviewSection({ students, assignments, submissionsByAssignment, alerts, leaderboard, classFilter }) {
  const filtered = classFilter === 'all' ? students : students.filter(s => s.class_id === classFilter);

  const totalStudents = filtered.length;
  const atRisk = filtered.filter(s => alerts.some(a => a.student_id === s.id && a.severity === 'red')).length;
  const watching = filtered.filter(s => alerts.some(a => a.student_id === s.id && a.severity === 'yellow') && !alerts.some(a => a.student_id === s.id && a.severity === 'red')).length;

  const classAssignments = assignments.filter(a => classFilter === 'all' || a.class_id === classFilter);
  const totalMissing = classAssignments.reduce((acc, a) => {
    const classStudents = students.filter(s => s.class_id === a.class_id);
    const subs = submissionsByAssignment[a.id] || [];
    const submittedIds = new Set(subs.map(s => s.student_id));
    return acc + classStudents.filter(s => !submittedIds.has(s.id)).length;
  }, 0);

  const avgSubmissionRate = classAssignments.length === 0 ? 0 : Math.round(
    classAssignments.reduce((acc, a) => {
      const classStudents = students.filter(s => s.class_id === a.class_id);
      const subs = submissionsByAssignment[a.id] || [];
      const rate = classStudents.length ? (subs.length / classStudents.length) * 100 : 0;
      return acc + rate;
    }, 0) / classAssignments.length
  );

  const codingActive = leaderboard.filter(l => {
    const s = filtered.find(st => st.id === l.student_id);
    if (!s) return false;
    if (!l.last_activity_at) return false;
    return (Date.now() - new Date(l.last_activity_at)) / 86400000 <= 7;
  }).length;

  // Class breakdown
  const classBreakdown = CLASSES.map(cls => {
    const clsStudents = students.filter(s => s.class_id === cls);
    const clsAssignments = assignments.filter(a => a.class_id === cls);
    const clsMissing = clsAssignments.reduce((acc, a) => {
      const subs = submissionsByAssignment[a.id] || [];
      const submittedIds = new Set(subs.map(s => s.student_id));
      return acc + clsStudents.filter(s => !submittedIds.has(s.id)).length;
    }, 0);
    const clsAtRisk = clsStudents.filter(s => alerts.some(a => a.student_id === s.id && a.severity === 'red')).length;
    return { cls, count: clsStudents.length, missing: clsMissing, atRisk: clsAtRisk };
  });

  // Burnout watch — fetch real risk history for at-risk students
  const [burnoutData, setBurnoutData] = useState([]);
  useEffect(() => {
    const classes = classFilter === 'all' ? CLASSES : [classFilter];
    Promise.all(classes.map(cls => api.riskScores.getClassBurnout(cls).catch(() => [])))
      .then(results => {
        const merged = results.flat();
        // deduplicate by student_id
        const seen = new Set();
        setBurnoutData(merged.filter(r => { if (seen.has(r.student_id)) return false; seen.add(r.student_id); return true; }));
      });
  }, [classFilter]);

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '24px' }}>
        <KpiCard label="Total Students" value={totalStudents} sub={`${CLASSES.length} classes`} color="#5B5BD6" icon={Users} />
        <KpiCard label="At Risk" value={atRisk} sub={`${watching} watching`} color="#ef4444" icon={AlertTriangle} />
        <KpiCard label="Avg Submission" value={`${avgSubmissionRate}%`} sub={`${totalMissing} missing total`} color="#f59e0b" icon={BookOpen} />
        <KpiCard label="Coding Active" value={codingActive} sub="Active in last 7 days" color="#22c55e" icon={Code2} />
      </div>

      {/* Burnout Watch */}
      {burnoutData.length > 0 && (
        <div style={{ marginBottom: '20px', background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.18)', borderRadius: '14px', padding: '18px' }}>
          <div style={{ fontSize: '13px', fontWeight: '700', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '7px', color: '#f87171' }}>
            <Activity size={14} /> Burnout Watch — Declining Risk Scores
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
            {burnoutData.map(student => {
              const history = student.history || [];
              const scores = history.map(h => h.score);
              const maxScore = Math.max(...scores, 1);
              const trend = scores.length >= 2 ? scores[scores.length - 1] - scores[0] : 0;
              const levelColor = { RED: '#ef4444', YELLOW: '#f59e0b', GREEN: '#22c55e' }[student.current_level] || '#94a3b8';
              // Mini sparkline: last 9 points as SVG
              const pts = scores.slice(-9);
              const w = 120, h = 32;
              const xStep = pts.length > 1 ? w / (pts.length - 1) : w;
              const svgPoints = pts.map((s, i) => `${i * xStep},${h - (s / maxScore) * h}`).join(' ');
              return (
                <div key={student.student_id} style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${levelColor}25`, borderRadius: '12px', padding: '14px 16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <StudentAvatar name={student.student_name} riskLevel={student.current_level} size={30} />
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: '700' }}>{student.student_name}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '2px' }}>
                          <span style={{ fontSize: '10px', fontWeight: '700', padding: '1px 7px', borderRadius: '99px', background: `${levelColor}18`, color: levelColor }}>{student.current_level}</span>
                          <span style={{ fontSize: '10px', color: trend < 0 ? '#ef4444' : '#22c55e', fontWeight: '600' }}>
                            {trend < 0 ? `▼ ${Math.abs(trend)} pts` : `▲ ${trend} pts`}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '22px', fontWeight: '800', color: levelColor, fontFamily: 'Space Grotesk, sans-serif', lineHeight: 1 }}>{student.current_score}</div>
                      <div style={{ fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>risk score</div>
                    </div>
                  </div>
                  {/* Sparkline */}
                  <div style={{ marginBottom: '8px' }}>
                    <svg width={w} height={h} style={{ overflow: 'visible' }}>
                      <defs>
                        <linearGradient id={`grad-${student.student_id}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={levelColor} stopOpacity="0.3" />
                          <stop offset="100%" stopColor={levelColor} stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      {pts.length > 1 && (
                        <>
                          <polygon
                            points={`0,${h} ${svgPoints} ${(pts.length - 1) * xStep},${h}`}
                            fill={`url(#grad-${student.student_id})`}
                          />
                          <polyline points={svgPoints} fill="none" stroke={levelColor} strokeWidth="1.5" strokeLinejoin="round" />
                          {pts.map((s, i) => (
                            <circle key={i} cx={i * xStep} cy={h - (s / maxScore) * h} r="2" fill={levelColor} />
                          ))}
                        </>
                      )}
                    </svg>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      <span>{history.length > 0 ? `${history.length}w ago` : ''}</span>
                      <span>now</span>
                    </div>
                  </div>
                  {/* Alert message from teacher alerts */}
                  {alerts.filter(a => a.student_id === student.student_id && a.severity === 'red').slice(0, 1).map(a => (
                    <div key={a.id} style={{ fontSize: '10px', color: '#fca5a5', lineHeight: '1.4', borderTop: '1px solid rgba(239,68,68,0.12)', paddingTop: '8px' }}>
                      {a.message}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        {/* Class breakdown */}
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '14px', padding: '18px' }}>
          <div style={{ fontSize: '13px', fontWeight: '700', marginBottom: '14px' }}>Class Breakdown</div>
          {classBreakdown.map(({ cls, count, missing, atRisk }) => (
            <div key={cls} style={{ marginBottom: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '12px', fontWeight: '600' }}>{cls}</span>
                <div style={{ display: 'flex', gap: '10px', fontSize: '11px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>{count} students</span>
                  {atRisk > 0 && <span style={{ color: '#ef4444' }}>{atRisk} at risk</span>}
                  {missing > 0 && <span style={{ color: '#f59e0b' }}>{missing} missing</span>}
                </div>
              </div>
              <ProgressBar value={count} max={Math.max(...classBreakdown.map(c => c.count), 1)} color="#5B5BD6" height={5} />
            </div>
          ))}
        </div>

        {/* Recent alerts */}
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '14px', padding: '18px' }}>
          <div style={{ fontSize: '13px', fontWeight: '700', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <AlertTriangle size={13} color="#ef4444" /> Recent Risk Alerts
          </div>
          {alerts.filter(a => !a.is_read).slice(0, 5).length === 0 ? (
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>
              <CheckCircle2 size={20} color="#22c55e" style={{ margin: '0 auto 8px' }} /><br />All clear — no unread alerts
            </div>
          ) : alerts.filter(a => !a.is_read).slice(0, 5).map(a => (
            <div key={a.id} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', marginBottom: '10px', padding: '8px 10px', borderRadius: '8px', background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.1)' }}>
              <StudentAvatar name={a.student_name || '?'} riskLevel="RED" size={28} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '12px', fontWeight: '600' }}>{a.student_name}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.message}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── SECTION: Students (merged with Coding) ──────────────────────────────────
function StudentsSection({ students, alerts, leaderboard, leaderboardLoading, submissionsByAssignment, assignments, classFilter }) {
  const [sortBy, setSortBy] = useState('risk');
  const [search, setSearch] = useState('');
  const [subTab, setSubTab] = useState('students');

  const filtered = (classFilter === 'all' ? students : students.filter(s => s.class_id === classFilter))
    .filter(s => s.role === 'student');

  const enriched = filtered.map(s => {
    const studentAlerts = alerts.filter(a => a.student_id === s.id);
    const riskLevel = studentAlerts.some(a => a.severity === 'red') ? 'RED'
      : studentAlerts.some(a => a.severity === 'yellow') ? 'YELLOW' : 'GREEN';
    const lb = leaderboard.find(l => l.student_id === s.id);
    const vscore = lb?.veloris_score || 0;
    const lastActivity = lb?.last_activity_at || null;
    const studentAssignments = assignments.filter(a => a.class_id === s.class_id);
    const submitted = studentAssignments.filter(a => {
      const subs = submissionsByAssignment[a.id] || [];
      return subs.some(sub => sub.student_id === s.id);
    }).length;
    const submissionRate = studentAssignments.length ? Math.round((submitted / studentAssignments.length) * 100) : 0;
    return { ...s, riskLevel, vscore, lastActivity, submissionRate, alertCount: studentAlerts.length };
  }).filter(s => !search || s.name?.toLowerCase().includes(search.toLowerCase()));

  const sorted = [...enriched].sort((a, b) => {
    if (sortBy === 'risk') {
      const order = { RED: 0, YELLOW: 1, GREEN: 2 };
      return (order[a.riskLevel] ?? 3) - (order[b.riskLevel] ?? 3);
    }
    if (sortBy === 'vscore') return b.vscore - a.vscore;
    if (sortBy === 'submission') return b.submissionRate - a.submissionRate;
    if (sortBy === 'activity') {
      if (!a.lastActivity && !b.lastActivity) return 0;
      if (!a.lastActivity) return 1;
      if (!b.lastActivity) return -1;
      return new Date(b.lastActivity) - new Date(a.lastActivity);
    }
    return (a.name || '').localeCompare(b.name || '');
  });

  // Top 5 by vscore
  const top5 = [...enriched].sort((a, b) => b.vscore - a.vscore).slice(0, 5);
  // Most at risk
  const atRisk = enriched.filter(s => s.riskLevel === 'RED').slice(0, 5);
  // Inactive (no coding activity > 14 days)
  const inactive = enriched.filter(s => {
    if (!s.lastActivity) return true;
    return (Date.now() - new Date(s.lastActivity)) / 86400000 > 14;
  }).slice(0, 5);

  // Coding leaderboard data
  const [codingSortBy, setCodingSortBy] = useState('vscore');
  const [activityFilter, setActivityFilter] = useState('all');

  const classStudentIds = new Set(
    (classFilter === 'all' ? students : students.filter(s => s.class_id === classFilter)).map(s => s.id)
  );

  const codingRows = leaderboard
    .filter(l => classFilter === 'all' || classStudentIds.has(l.student_id))
    .filter(l => {
      if (activityFilter === 'active') return l.last_activity_at && (Date.now() - new Date(l.last_activity_at)) / 86400000 <= 7;
      if (activityFilter === 'inactive') return !l.last_activity_at || (Date.now() - new Date(l.last_activity_at)) / 86400000 > 14;
      return true;
    })
    .sort((a, b) => {
      if (codingSortBy === 'vscore') return b.veloris_score - a.veloris_score;
      if (codingSortBy === 'problems') return b.problems_solved - a.problems_solved;
      if (codingSortBy === 'cf') return (b.cf_rating || 0) - (a.cf_rating || 0);
      if (codingSortBy === 'activity') {
        if (!a.last_activity_at && !b.last_activity_at) return 0;
        if (!a.last_activity_at) return 1;
        if (!b.last_activity_at) return -1;
        return new Date(b.last_activity_at) - new Date(a.last_activity_at);
      }
      return 0;
    });

  const activeCount = leaderboard.filter(l => l.last_activity_at && (Date.now() - new Date(l.last_activity_at)) / 86400000 <= 7).length;
  const inactiveCount = leaderboard.filter(l => !l.last_activity_at || (Date.now() - new Date(l.last_activity_at)) / 86400000 > 14).length;
  const avgScore = leaderboard.length ? Math.round(leaderboard.reduce((a, l) => a + l.veloris_score, 0) / leaderboard.length) : 0;
  const MEDAL = ['🥇', '🥈', '🥉'];

  return (
    <div>
      {/* Sub-tab switcher */}
      <div style={{ display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '4px', marginBottom: '20px', width: 'fit-content' }}>
        {[{ key: 'students', label: 'All Students', icon: Users }, { key: 'coding', label: 'Coding Leaderboard', icon: Code2 }].map(t => (
          <button key={t.key} onClick={() => setSubTab(t.key)} style={{
            padding: '7px 14px', borderRadius: '7px', fontSize: '12px', fontWeight: '600', cursor: 'pointer',
            border: 'none', fontFamily: 'inherit', transition: 'all 0.15s',
            background: subTab === t.key ? 'rgba(255,255,255,0.1)' : 'transparent',
            color: subTab === t.key ? '#f0f0f0' : 'var(--text-muted)',
            display: 'flex', alignItems: 'center', gap: '5px',
          }}>
            <t.icon size={12} />{t.label}
          </button>
        ))}
      </div>

      {subTab === 'coding' ? (
        leaderboardLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
            <Loader2 size={24} style={{ animation: 'spin 0.8s linear infinite', color: '#5B5BD6' }} />
          </div>
        ) : (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '20px' }}>
              <KpiCard label="On Leaderboard" value={leaderboard.length} sub="Linked a platform" color="#5B5BD6" icon={Medal} />
              <KpiCard label="Active (7d)" value={activeCount} sub="Coded recently" color="#22c55e" icon={Flame} />
              <KpiCard label="Inactive (14d+)" value={inactiveCount} sub="Need a nudge" color="#ef4444" icon={Activity} />
              <KpiCard label="Avg V-Score" value={avgScore} sub="Across all students" color="#f59e0b" icon={TrendingUp} />
            </div>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: '4px' }}>
                {[['all', 'All'], ['active', 'Active 7d'], ['inactive', 'Inactive 14d+']].map(([k, l]) => (
                  <button key={k} onClick={() => setActivityFilter(k)} style={{
                    padding: '5px 12px', borderRadius: '7px', fontSize: '11px', fontWeight: '600', cursor: 'pointer',
                    border: `1.5px solid ${activityFilter === k ? '#22c55e' : 'rgba(255,255,255,0.08)'}`,
                    background: activityFilter === k ? 'rgba(34,197,94,0.1)' : 'transparent',
                    color: activityFilter === k ? '#86efac' : 'var(--text-muted)',
                  }}>{l}</button>
                ))}
              </div>
              <select className="input" value={codingSortBy} onChange={e => setCodingSortBy(e.target.value)} style={{ width: 'auto', height: '32px', fontSize: '11px', marginLeft: 'auto' }}>
                <option value="vscore">Sort: V-Score</option>
                <option value="problems">Sort: Problems Solved</option>
                <option value="cf">Sort: CF Rating</option>
                <option value="activity">Sort: Last Active</option>
              </select>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '14px', overflow: 'hidden' }}>
              {codingRows.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)' }}>No students with linked coding profiles</div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      {['#', 'Student', 'V-Score', 'Tier', 'Problems', 'CF Rating', 'Platforms', 'Last Active'].map(h => (
                        <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {codingRows.map((l, i) => {
                      const student = students.find(s => s.id === l.student_id);
                      const isActive = l.last_activity_at && (Date.now() - new Date(l.last_activity_at)) / 86400000 <= 7;
                      return (
                        <tr key={l.student_id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.1s' }}
                          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                          <td style={{ padding: '10px 14px', fontSize: '13px' }}>{MEDAL[i] || <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>{i + 1}</span>}</td>
                          <td style={{ padding: '10px 14px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <StudentAvatar name={l.name} riskLevel="GREEN" size={28} />
                              <div>
                                <div style={{ fontSize: '12px', fontWeight: '600' }}>{l.name}</div>
                                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{student?.class_id || ''}</div>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '10px 14px' }}>
                            <span style={{ fontSize: '14px', fontWeight: '800', color: tierColor(l.tier), fontFamily: 'Space Grotesk, sans-serif' }}>{l.veloris_score}</span>
                          </td>
                          <td style={{ padding: '10px 14px' }}>
                            <span style={{ fontSize: '10px', fontWeight: '700', padding: '2px 8px', borderRadius: '99px', background: `${tierColor(l.tier)}18`, color: tierColor(l.tier) }}>{l.tier}</span>
                          </td>
                          <td style={{ padding: '10px 14px', fontSize: '12px', color: 'var(--text-secondary)' }}>{l.problems_solved || '—'}</td>
                          <td style={{ padding: '10px 14px', fontSize: '12px', color: 'var(--text-secondary)' }}>{l.cf_rating || '—'}</td>
                          <td style={{ padding: '10px 14px' }}>
                            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                              {(l.platforms_linked || []).map(p => (
                                <span key={p} style={{ fontSize: '9px', padding: '2px 6px', borderRadius: '4px', background: 'rgba(255,255,255,0.06)', color: 'var(--text-muted)', textTransform: 'capitalize' }}>{p}</span>
                              ))}
                            </div>
                          </td>
                          <td style={{ padding: '10px 14px' }}>
                            <span style={{ fontSize: '11px', color: isActive ? '#22c55e' : 'var(--text-muted)', fontWeight: isActive ? '600' : '400' }}>{ago(l.last_activity_at)}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )
      ) : (
        <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '20px' }}>
        {[
          { title: 'Top Coders', icon: Star, color: '#f59e0b', list: top5, metric: s => `V-Score ${s.vscore}` },
          { title: 'At Risk', icon: AlertTriangle, color: '#ef4444', list: atRisk, metric: s => `${s.alertCount} alert${s.alertCount !== 1 ? 's' : ''}` },
          { title: 'Coding Inactive', icon: Flame, color: '#6b7280', list: inactive, metric: s => ago(s.lastActivity) },
        ].map(({ title, icon: Icon, color, list, metric }) => (
          <div key={title} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '14px', padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px', fontSize: '12px', fontWeight: '700' }}>
              <Icon size={13} color={color} />{title}
            </div>
            {list.length === 0 ? (
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', padding: '12px 0' }}>None</div>
            ) : list.map((s, i) => (
              <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)', width: '14px' }}>{i + 1}</span>
                <StudentAvatar name={s.name} riskLevel={s.riskLevel} size={26} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '11px', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{metric(s)}</div>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Full table */}
      <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '14px', overflow: 'hidden' }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            className="input" placeholder="Search students..." value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ flex: 1, minWidth: '160px', height: '34px', fontSize: '12px' }}
          />
          <select className="input" value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ width: 'auto', height: '34px', fontSize: '12px' }}>
            <option value="risk">Sort: Risk</option>
            <option value="vscore">Sort: V-Score</option>
            <option value="submission">Sort: Submission Rate</option>
            <option value="activity">Sort: Last Active</option>
            <option value="name">Sort: Name</option>
          </select>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{sorted.length} students</span>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              {['Student', 'Class', 'Risk', 'V-Score', 'Submission Rate', 'Last Active', 'Alerts'].map(h => (
                <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map(s => (
              <tr key={s.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.1s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <td style={{ padding: '10px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <StudentAvatar name={s.name} riskLevel={s.riskLevel} size={28} />
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: '600' }}>{s.name}</div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{s.email}</div>
                    </div>
                  </div>
                </td>
                <td style={{ padding: '10px 14px', fontSize: '11px', color: 'var(--text-muted)' }}>{s.class_id || '—'}</td>
                <td style={{ padding: '10px 14px' }}>
                  <span style={{ fontSize: '10px', fontWeight: '700', padding: '3px 8px', borderRadius: '99px', background: `${riskColor(s.riskLevel)}15`, color: riskColor(s.riskLevel) }}>{s.riskLevel}</span>
                </td>
                <td style={{ padding: '10px 14px' }}>
                  <span style={{ fontSize: '12px', fontWeight: '700', color: tierColor(leaderboard.find(l => l.student_id === s.id)?.tier) }}>{s.vscore || '—'}</span>
                </td>
                <td style={{ padding: '10px 14px', minWidth: '120px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ProgressBar value={s.submissionRate} color={s.submissionRate < 50 ? '#ef4444' : s.submissionRate < 80 ? '#f59e0b' : '#22c55e'} height={4} />
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{s.submissionRate}%</span>
                  </div>
                </td>
                <td style={{ padding: '10px 14px', fontSize: '11px', color: 'var(--text-muted)' }}>{ago(s.lastActivity)}</td>
                <td style={{ padding: '10px 14px' }}>
                  {s.alertCount > 0
                    ? <span style={{ fontSize: '10px', fontWeight: '700', color: '#ef4444' }}>{s.alertCount}</span>
                    : <span style={{ fontSize: '10px', color: '#22c55e' }}>✓</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {sorted.length === 0 && (
          <div style={{ padding: '32px', textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)' }}>No students found</div>
        )}
      </div>
      </div>
      )}
    </div>
  );
}

// ─── SECTION: Assignments ────────────────────────────────────────────────────
function AssignmentsSection({ students, assignments, submissionsByAssignment, classFilter }) {
  const [statusFilter, setStatusFilter] = useState('all');

  const filtered = (classFilter === 'all' ? assignments : assignments.filter(a => a.class_id === classFilter))
    .map(a => {
      const classStudents = students.filter(s => s.class_id === a.class_id);
      const subs = submissionsByAssignment[a.id] || [];
      const latestByStudent = new Map();
      subs.forEach(s => {
        const ex = latestByStudent.get(s.student_id);
        if (!ex || new Date(s.submitted_at) > new Date(ex.submitted_at)) latestByStudent.set(s.student_id, s);
      });
      const latest = Array.from(latestByStudent.values());
      const submittedIds = new Set(latest.map(s => s.student_id));
      const missing = classStudents.filter(s => !submittedIds.has(s.id));
      const lateCount = latest.filter(s => s.status === 'late').length;
      const rate = classStudents.length ? Math.round((latest.length / classStudents.length) * 100) : 0;
      const isOverdue = new Date(a.deadline) < new Date();
      return { ...a, classStudents, latest, missing, lateCount, rate, isOverdue };
    })
    .filter(a => {
      if (statusFilter === 'missing') return a.missing.length > 0;
      if (statusFilter === 'overdue') return a.isOverdue && a.missing.length > 0;
      if (statusFilter === 'complete') return a.missing.length === 0;
      return true;
    })
    .sort((a, b) => new Date(a.deadline) - new Date(b.deadline));

  // Per-student missing summary
  const studentMissing = {};
  filtered.forEach(a => {
    a.missing.forEach(s => {
      if (!studentMissing[s.id]) studentMissing[s.id] = { student: s, count: 0, assignments: [] };
      studentMissing[s.id].count++;
      studentMissing[s.id].assignments.push(a.title);
    });
  });
  const topMissing = Object.values(studentMissing).sort((a, b) => b.count - a.count).slice(0, 6);

  return (
    <div>
      {/* Students missing most assignments */}
      {topMissing.length > 0 && (
        <div style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: '14px', padding: '16px', marginBottom: '20px' }}>
          <div style={{ fontSize: '12px', fontWeight: '700', color: '#f87171', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <AlertTriangle size={13} /> Students with most missing submissions
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '8px' }}>
            {topMissing.map(({ student, count, assignments: asgns }) => (
              <div key={student.id} style={{ display: 'flex', gap: '8px', alignItems: 'center', padding: '8px 10px', borderRadius: '8px', background: 'rgba(239,68,68,0.06)' }}>
                <StudentAvatar name={student.name} riskLevel="RED" size={28} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '11px', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{student.name}</div>
                  <div style={{ fontSize: '10px', color: '#fca5a5' }}>{count} missing · {student.class_id}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter bar */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '14px', flexWrap: 'wrap', alignItems: 'center' }}>
        {[['all', 'All'], ['missing', 'Has Missing'], ['overdue', 'Overdue + Missing'], ['complete', 'Fully Submitted']].map(([k, l]) => (
          <button key={k} onClick={() => setStatusFilter(k)} style={{
            padding: '5px 12px', borderRadius: '7px', fontSize: '11px', fontWeight: '600', cursor: 'pointer',
            border: `1.5px solid ${statusFilter === k ? '#5B5BD6' : 'rgba(255,255,255,0.08)'}`,
            background: statusFilter === k ? 'rgba(91,91,214,0.12)' : 'transparent',
            color: statusFilter === k ? '#A8A8F8' : 'var(--text-muted)',
          }}>{l}</button>
        ))}
        <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: 'auto' }}>{filtered.length} assignments</span>
      </div>

      {/* Assignment rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px', fontSize: '12px', color: 'var(--text-muted)' }}>No assignments match this filter</div>
        )}
        {filtered.map(a => (
          <div key={a.id} style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${a.isOverdue && a.missing.length > 0 ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.07)'}`, borderRadius: '12px', padding: '14px 16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', marginBottom: '10px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ fontSize: '13px', fontWeight: '700' }}>{a.title}</span>
                  <span style={{ fontSize: '10px', padding: '2px 7px', borderRadius: '99px', background: 'rgba(79,142,247,0.12)', color: '#4f8ef7' }}>{a.subject}</span>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{a.class_id}</span>
                  {a.isOverdue && <span style={{ fontSize: '10px', color: '#ef4444', fontWeight: '700' }}>OVERDUE</span>}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <span><Clock size={10} style={{ display: 'inline', marginRight: '3px' }} />{new Date(a.deadline).toLocaleString()}</span>
                  <span>{a.latest.length}/{a.classStudents.length} submitted</span>
                  {a.lateCount > 0 && <span style={{ color: '#f59e0b' }}>{a.lateCount} late</span>}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '20px', fontWeight: '800', color: a.rate < 50 ? '#ef4444' : a.rate < 80 ? '#f59e0b' : '#22c55e', fontFamily: 'Space Grotesk, sans-serif' }}>{a.rate}%</div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>submission rate</div>
              </div>
            </div>
            <ProgressBar value={a.rate} color={a.rate < 50 ? '#ef4444' : a.rate < 80 ? '#f59e0b' : '#22c55e'} height={4} />
            {a.missing.length > 0 && (
              <div style={{ marginTop: '10px' }}>
                <div style={{ fontSize: '10px', color: '#fca5a5', fontWeight: '700', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Missing ({a.missing.length})
                </div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {a.missing.map(s => (
                    <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '3px 8px', borderRadius: '99px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }}>
                      <StudentAvatar name={s.name} riskLevel="RED" size={16} />
                      <span style={{ fontSize: '10px', color: '#fca5a5' }}>{s.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── SECTION: Attendance ─────────────────────────────────────────────────────
function AttendanceSection({ students, classFilter }) {
  const [attendanceData, setAttendanceData] = useState({});
  const [loading, setLoading] = useState(false);
  const [selectedClass, setSelectedClass] = useState(classFilter !== 'all' ? classFilter : CLASSES[0]);

  useEffect(() => {
    const cls = classFilter !== 'all' ? classFilter : selectedClass;
    if (attendanceData[cls]) return;
    setLoading(true);
    Promise.all([
      api.attendance.getClass(cls).catch(() => []),
      api.attendance.getDefaulters(cls).catch(() => []),
    ]).then(([records, defaulters]) => {
      setAttendanceData(prev => ({ ...prev, [cls]: { records, defaulters } }));
      setLoading(false);
    });
  }, [selectedClass, classFilter]);

  const cls = classFilter !== 'all' ? classFilter : selectedClass;
  const data = attendanceData[cls] || { records: [], defaulters: [] };
  const classStudents = students.filter(s => s.class_id === cls);

  // Build per-student attendance summary from records
  const byStudent = {};
  (data.records || []).forEach(r => {
    const key = r.student_id || r.roll_no;
    if (!byStudent[key]) byStudent[key] = { name: r.student_name || r.name, attended: 0, total: 0, pct: 0 };
    byStudent[key].attended += r.total_attended || 0;
    byStudent[key].total += r.out_of || 0;
  });
  Object.values(byStudent).forEach(s => {
    s.pct = s.total > 0 ? Math.round((s.attended / s.total) * 100) : 0;
  });

  const defaulterCount = data.defaulters?.length || 0;
  const avgPct = Object.values(byStudent).length
    ? Math.round(Object.values(byStudent).reduce((a, s) => a + s.pct, 0) / Object.values(byStudent).length)
    : 0;

  return (
    <div>
      {classFilter === 'all' && (
        <div style={{ display: 'flex', gap: '6px', marginBottom: '16px' }}>
          {CLASSES.map(c => (
            <button key={c} onClick={() => setSelectedClass(c)} style={{
              padding: '6px 14px', borderRadius: '7px', fontSize: '12px', fontWeight: '600', cursor: 'pointer',
              border: `1.5px solid ${selectedClass === c ? '#5B5BD6' : 'rgba(255,255,255,0.08)'}`,
              background: selectedClass === c ? 'rgba(91,91,214,0.12)' : 'transparent',
              color: selectedClass === c ? '#A8A8F8' : 'var(--text-muted)',
            }}>{c}</button>
          ))}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '20px' }}>
        <KpiCard label="Class Size" value={classStudents.length} sub={cls} color="#5B5BD6" icon={Users} />
        <KpiCard label="Defaulters" value={defaulterCount} sub="Below 75%" color="#ef4444" icon={AlertTriangle} />
        <KpiCard label="Avg Attendance" value={avgPct ? `${avgPct}%` : '—'} sub="Across uploaded records" color={avgPct < 75 ? '#ef4444' : '#22c55e'} icon={BarChart3} />
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
          <Loader2 size={20} style={{ animation: 'spin 0.8s linear infinite', color: '#5B5BD6' }} />
        </div>
      ) : data.defaulters?.length > 0 ? (
        <div>
          <div style={{ fontSize: '12px', fontWeight: '700', color: '#f87171', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <AlertTriangle size={12} /> Defaulters — below 75%
          </div>
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '14px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  {['Student', 'Roll No', 'Attended', 'Out Of', 'Attendance %'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.defaulters.map((d, i) => {
                  const pct = d.avg_attendance_pct ?? d.attendance_pct ?? 0;
                  return (
                    <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '10px 14px', fontSize: '12px', fontWeight: '600' }}>{d.student_name || d.name || '—'}</td>
                      <td style={{ padding: '10px 14px', fontSize: '11px', color: 'var(--text-muted)' }}>{d.roll_no || '—'}</td>
                      <td style={{ padding: '10px 14px', fontSize: '12px' }}>{d.total_attended ?? '—'}</td>
                      <td style={{ padding: '10px 14px', fontSize: '12px' }}>{d.out_of ?? '—'}</td>
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <ProgressBar value={pct} color="#ef4444" height={4} />
                          <span style={{ fontSize: '11px', color: '#f87171', fontWeight: '700', whiteSpace: 'nowrap' }}>{Math.round(pct)}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '40px', fontSize: '12px', color: 'var(--text-muted)', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: '12px' }}>
          <BarChart3 size={24} style={{ margin: '0 auto 10px', opacity: 0.3 }} /><br />
          No attendance records uploaded yet for {cls}.<br />
          <span style={{ fontSize: '11px' }}>Upload via the Attendance page to see defaulters here.</span>
        </div>
      )}
    </div>
  );
}

// ─── SECTION: Analytics ──────────────────────────────────────────────────────
function AnalyticsSection({ classFilter }) {
  const [metric, setMetric] = useState('combined');
  const [topN, setTopN] = useState(10);
  const [period, setPeriod] = useState('this_month');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetch = async () => {
    setLoading(true); setError('');
    try {
      const params = { metric, top_n: topN, period };
      if (classFilter !== 'all') params.class_id = classFilter;
      const res = await api.analytics.getTopStudents(params);
      setData(res);
    } catch (e) { setError(e.message || 'Failed to load analytics'); }
    setLoading(false);
  };

  useEffect(() => { fetch(); }, [metric, topN, period, classFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  const MEDAL = ['🥇', '🥈', '🥉'];

  const metricLabel = { assignments: 'Submission Rate (%)', coding: 'V-Score (0–1000)', attendance: 'Attendance (%)', combined: 'Combined Score' }[metric];

  const barMax = data?.students?.length
    ? Math.max(...data.students.map(s => s.score), 1)
    : 100;

  return (
    <div>
      {/* Controls */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '20px', padding: '14px 16px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Metric</span>
          <div style={{ display: 'flex', gap: '4px' }}>
            {[['combined', 'Combined'], ['assignments', 'Assignments'], ['coding', 'Coding'], ['attendance', 'Attendance']].map(([k, l]) => (
              <button key={k} onClick={() => setMetric(k)} style={{ padding: '5px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', border: `1.5px solid ${metric === k ? '#5B5BD6' : 'rgba(255,255,255,0.08)'}`, background: metric === k ? 'rgba(91,91,214,0.12)' : 'transparent', color: metric === k ? '#A8A8F8' : 'var(--text-muted)' }}>{l}</button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Period</span>
          <div style={{ display: 'flex', gap: '4px' }}>
            {[['this_month', 'This Month'], ['last_month', 'Last Month'], ['all_time', 'All Time']].map(([k, l]) => (
              <button key={k} onClick={() => setPeriod(k)} style={{ padding: '5px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', border: `1.5px solid ${period === k ? '#22c55e' : 'rgba(255,255,255,0.08)'}`, background: period === k ? 'rgba(34,197,94,0.1)' : 'transparent', color: period === k ? '#86efac' : 'var(--text-muted)' }}>{l}</button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Top N</span>
          <div style={{ display: 'flex', gap: '4px' }}>
            {[5, 10, 20].map(n => (
              <button key={n} onClick={() => setTopN(n)} style={{ padding: '5px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', border: `1.5px solid ${topN === n ? '#f59e0b' : 'rgba(255,255,255,0.08)'}`, background: topN === n ? 'rgba(245,158,11,0.1)' : 'transparent', color: topN === n ? '#fbbf24' : 'var(--text-muted)' }}>Top {n}</button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
          <Loader2 size={24} style={{ animation: 'spin 0.8s linear infinite', color: '#5B5BD6' }} />
        </div>
      ) : error ? (
        <div style={{ textAlign: 'center', padding: '40px', fontSize: '12px', color: '#f87171' }}>{error}</div>
      ) : !data?.students?.length ? (
        <div style={{ textAlign: 'center', padding: '60px', fontSize: '12px', color: 'var(--text-muted)', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: '12px' }}>
          <Trophy size={28} style={{ margin: '0 auto 12px', opacity: 0.3 }} /><br />No student data for this period
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {data.students.map((s, i) => {
            const pct = (s.score / barMax) * 100;
            const color = i === 0 ? '#f59e0b' : i === 1 ? '#94a3b8' : i === 2 ? '#cd7f32' : '#5B5BD6';
            return (
              <div key={s.student_id} style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${i < 3 ? `${color}30` : 'rgba(255,255,255,0.07)'}`, borderRadius: '12px', padding: '14px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                  <span style={{ fontSize: i < 3 ? '18px' : '13px', width: '24px', textAlign: 'center', flexShrink: 0 }}>
                    {MEDAL[i] || <span style={{ color: 'var(--text-muted)', fontWeight: 700 }}>#{s.rank}</span>}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '13px', fontWeight: 700 }}>{s.name}</span>
                      {s.class_id && <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '99px', background: 'rgba(79,142,247,0.12)', color: '#4f8ef7' }}>{s.class_id}</span>}
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{s.email}</div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: '20px', fontWeight: 800, color, fontFamily: 'Space Grotesk, sans-serif', lineHeight: 1 }}>{s.score}</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{metricLabel}</div>
                  </div>
                </div>
                <ProgressBar value={pct} color={color} height={4} />
                {/* Detail chips */}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
                  {s.details.assignments_submitted != null && (
                    <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '99px', background: 'rgba(91,91,214,0.1)', color: '#A8A8F8' }}>
                      📋 {s.details.assignments_submitted}/{s.details.assignments_total} assignments
                    </span>
                  )}
                  {s.details.coding > 0 && (
                    <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '99px', background: 'rgba(34,197,94,0.1)', color: '#86efac' }}>
                      ⚡ V-Score {Math.round(s.details.coding)}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

// ─── ROOT DASHBOARD ───────────────────────────────────────────────────────────
const TABS = [
  { key: 'overview',     label: 'Overview',    icon: LayoutDashboard },
  { key: 'students',     label: 'Students',    icon: Users },
  { key: 'assignments',  label: 'Assignments', icon: BookOpen },
  { key: 'attendance',   label: 'Attendance',  icon: BarChart3 },
  { key: 'analytics',    label: 'Analytics',   icon: Trophy },
];

export default function TeacherDashboard() {
  const {
    students, fetchStudents,
    assignments, fetchAssignments,
    alerts, fetchAlerts,
    leaderboard, leaderboardLoading, fetchLeaderboard,
    currentUser,
  } = useAppStore();

  const [tab, setTab] = useState('overview');
  const [classFilter, setClassFilter] = useState('all');
  const [submissionsByAssignment, setSubmissionsByAssignment] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchStudents(), fetchAssignments(), fetchAlerts(), fetchLeaderboard()])
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (assignments.length === 0) return;
    Promise.all(
      assignments.map(a =>
        api.assignments.listSubmissions(a.id).then(d => [a.id, d]).catch(() => [a.id, []])
      )
    ).then(entries => setSubmissionsByAssignment(Object.fromEntries(entries)));
  }, [assignments]);

  const classStudents = useMemo(() =>
    students.filter(s => s.role === 'student'),
    [students]
  );

  // Global KPIs for header
  const totalMissing = useMemo(() => {
    return assignments.reduce((acc, a) => {
      const cs = classStudents.filter(s => s.class_id === a.class_id);
      const subs = submissionsByAssignment[a.id] || [];
      const ids = new Set(subs.map(s => s.student_id));
      return acc + cs.filter(s => !ids.has(s.id)).length;
    }, 0);
  }, [assignments, classStudents, submissionsByAssignment]);

  const unreadAlerts = alerts.filter(a => !a.is_read).length;

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <Loader2 size={28} style={{ animation: 'spin 0.8s linear infinite', color: '#5B5BD6' }} />
    </div>
  );

  const name = currentUser?.name?.split(' ').slice(-1)[0] || 'there';

  return (
    <div className="fade-in-up" style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', paddingBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.06)', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '22px', fontWeight: '800', marginBottom: '3px' }}>
            Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, {name}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
            {unreadAlerts > 0 && <span style={{ color: '#f87171' }}>⚠ {unreadAlerts} unread alert{unreadAlerts !== 1 ? 's' : ''}</span>}
            {totalMissing > 0 && <span style={{ color: '#fbbf24' }}>📋 {totalMissing} missing submissions</span>}
            <span style={{ color: 'var(--text-muted)' }}>{classStudents.length} students across {CLASSES.length} classes</span>
          </div>
        </div>
        {/* Class filter */}
        <div style={{ display: 'flex', gap: '6px' }}>
          {['all', ...CLASSES].map(c => (
            <button key={c} onClick={() => setClassFilter(c)} style={{
              padding: '6px 14px', borderRadius: '8px', fontSize: '11px', fontWeight: '600', cursor: 'pointer',
              border: `1.5px solid ${classFilter === c ? '#5B5BD6' : 'rgba(255,255,255,0.08)'}`,
              background: classFilter === c ? 'rgba(91,91,214,0.12)' : 'transparent',
              color: classFilter === c ? '#A8A8F8' : 'var(--text-muted)',
            }}>{c === 'all' ? 'All Classes' : c}</button>
          ))}
        </div>
      </div>

      {/* Section tabs */}
      <SectionTab
        tabs={TABS.map(t => ({ ...t, icon: t.key === 'overview' ? LayoutDashboard : t.icon }))}
        active={tab}
        onChange={setTab}
      />

      {/* Sections */}
      {tab === 'overview' && (
        <OverviewSection
          students={classStudents} assignments={assignments}
          submissionsByAssignment={submissionsByAssignment}
          alerts={alerts} leaderboard={leaderboard} classFilter={classFilter}
        />
      )}
      {tab === 'students' && (
        <StudentsSection
          students={classStudents} alerts={alerts} leaderboard={leaderboard}
          leaderboardLoading={leaderboardLoading}
          submissionsByAssignment={submissionsByAssignment} assignments={assignments}
          classFilter={classFilter}
        />
      )}
      {tab === 'assignments' && (
        <AssignmentsSection
          students={classStudents} assignments={assignments}
          submissionsByAssignment={submissionsByAssignment} classFilter={classFilter}
        />
      )}
      {tab === 'attendance' && (
        <AttendanceSection students={classStudents} classFilter={classFilter} />
      )}
      {tab === 'analytics' && (
        <AnalyticsSection classFilter={classFilter} />
      )}
    </div>
  );
}
