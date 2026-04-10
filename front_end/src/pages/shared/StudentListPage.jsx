import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Loader2 } from 'lucide-react';
import { api } from '../../api';
import useAppStore from '../../store';

function timeAgo(iso) {
  if (!iso) return 'Never';
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (d === 0) return 'Today';
  if (d === 1) return 'Yesterday';
  if (d < 7)  return `${d}d ago`;
  return `${Math.floor(d / 7)}w ago`;
}

const TIERS = [
  { min: 950, label: 'Legend',   color: '#ef4444' },
  { min: 800, label: 'Elite',    color: '#f59e0b' },
  { min: 600, label: 'Expert',   color: '#a855f7' },
  { min: 400, label: 'Coder',    color: '#3b82f6' },
  { min: 200, label: 'Learner',  color: '#22c55e' },
  { min: 0,   label: 'Beginner', color: '#94a3b8' },
];
const getTier = s => TIERS.find(t => s >= t.min) || TIERS[5];
const LIMIT = 20;

export default function StudentListPage() {
  const navigate = useNavigate();
  const role     = useAppStore(s => s.role);
  const [students, setStudents] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');
  const [dept,     setDept]     = useState('');
  const [year,     setYear]     = useState('');
  const [page,     setPage]     = useState(1);
  const [total,    setTotal]    = useState(0);

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: LIMIT };
      if (dept)   params.department = dept;
      if (year)   params.year       = year;
      const res = await api.profile.getStudentsList(params);
      const list = Array.isArray(res) ? res : (res.students ?? res.items ?? []);
      setStudents(list);
      setTotal(res.total ?? list.length ?? 0);
    } catch { setStudents([]); }
    setLoading(false);
  }, [dept, year, page]);

  useEffect(() => { fetchStudents(); }, [fetchStudents]);

  const viewProfile = (userId) => {
    const base = role === 'admin' ? '/admin/students' : '/teacher/students';
    navigate(`${base}/${userId}`);
  };

  const filtered = search
    ? students.filter(s =>
        s.name?.toLowerCase().includes(search.toLowerCase()) ||
        s.roll_number?.toLowerCase().includes(search.toLowerCase()))
    : students;

  return (
    <div className="fade-in-up">
      {/* Header + filters */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <h1 style={{ margin: 0, fontSize: '22px', fontWeight: '700', fontFamily: 'Space Grotesk,sans-serif' }}>Students</h1>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative' }}>
            <Search size={13} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input className="input" placeholder="Search name or roll..." value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft: '30px', fontSize: '12px', width: '200px' }} />
          </div>
          <select className="input" value={dept} onChange={e => { setDept(e.target.value); setPage(1); }} style={{ fontSize: '12px', minWidth: '100px' }}>
            <option value="">All Depts</option>
            {['CSE','ECE','ME','CE','EE','IT'].map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <select className="input" value={year} onChange={e => { setYear(e.target.value); setPage(1); }} style={{ fontSize: '12px', minWidth: '90px' }}>
            <option value="">All Years</option>
            {['1','2','3','4'].map(y => <option key={y} value={y}>Year {y}</option>)}
          </select>
        </div>
      </div>

      {/* Table header */}
      <div style={{ display: 'grid', gridTemplateColumns: '40px 1fr 100px 60px 110px 90px 80px 90px', gap: '8px', padding: '6px 12px', fontSize: '10px', color: 'var(--text-muted)', fontWeight: '600', letterSpacing: '0.05em', borderBottom: '1px solid rgba(255,255,255,0.06)', marginBottom: '4px' }}>
        <span>#</span><span>STUDENT</span><span>VELORIS</span><span>YEAR</span><span>PROBLEMS</span><span>ATTEND%</span><span>CGPA</span><span>ACTIVE</span>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} style={{ height: '56px', borderRadius: '8px', background: 'rgba(255,255,255,0.04)', animation: 'pulse 1.5s ease-in-out infinite', animationDelay: `${i * 0.08}s` }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>No students found.</div>
      ) : filtered.map((s, i) => {
        const tier     = getTier(s.veloris_score ?? 0);
        const att      = s.attendance_percentage ?? null;
        const attColor = att == null ? 'var(--text-muted)' : att >= 75 ? '#22c55e' : att >= 60 ? '#f59e0b' : '#ef4444';
        return (
          <div key={s.user_id} onClick={() => viewProfile(s.user_id)}
            style={{ display: 'grid', gridTemplateColumns: '40px 1fr 100px 60px 110px 90px 80px 90px', gap: '8px', padding: '10px 12px', borderRadius: '8px', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.04)', marginBottom: '4px', alignItems: 'center', transition: 'background 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center' }}>{(page - 1) * LIMIT + i + 1}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
              <div style={{ width: '32px', height: '32px', flexShrink: 0, borderRadius: '50%', background: 'linear-gradient(135deg,#5B5BD6,#a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '700', color: '#fff', overflow: 'hidden' }}>
                {s.avatar_url ? <img src={s.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" /> : (s.name?.[0] || '?').toUpperCase()}
              </div>
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontSize: '13px', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{s.roll_number} · {s.department}</div>
              </div>
            </div>
            <div><span style={{ fontSize: '13px', fontWeight: '700', color: tier.color, fontFamily: 'Space Grotesk,sans-serif' }}>{s.veloris_score ?? 0}</span><div style={{ fontSize: '9px', color: tier.color }}>{tier.label}</div></div>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center' }}>{s.year_of_study ?? '—'}</span>
            <span style={{ fontSize: '12px', fontWeight: '600', color: '#22c55e', textAlign: 'center' }}>{s.problems_solved ?? '—'}</span>
            <span style={{ fontSize: '12px', fontWeight: '600', color: attColor, textAlign: 'center' }}>{att != null ? `${att.toFixed(0)}%` : '—'}</span>
            <span style={{ fontSize: '12px', fontWeight: '600', color: '#4f8ef7', textAlign: 'center' }}>{s.cgpa ?? '—'}</span>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'right' }}>{timeAgo(s.last_activity_at)}</span>
          </div>
        );
      })}

      {/* Pagination */}
      {total > LIMIT && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '20px' }}>
          <button className="btn btn-ghost" disabled={page === 1} onClick={() => setPage(p => p - 1)} style={{ fontSize: '12px' }}>← Prev</button>
          <span style={{ fontSize: '12px', padding: '6px 12px', color: 'var(--text-muted)' }}>Page {page} of {Math.ceil(total / LIMIT)}</span>
          <button className="btn btn-ghost" disabled={page >= Math.ceil(total / LIMIT)} onClick={() => setPage(p => p + 1)} style={{ fontSize: '12px' }}>Next →</button>
        </div>
      )}
      <style>{`@keyframes pulse{0%,100%{opacity:.4}50%{opacity:.8}}`}</style>
    </div>
  );
}
