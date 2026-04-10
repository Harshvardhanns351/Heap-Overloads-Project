import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import {
  ExternalLink, Check, RefreshCw, Loader2, Clock, Trophy, Link2,
  Edit3, X, Save, Camera, UserCircle2, Eye, EyeOff, ChevronRight,
  Briefcase, Plus, Trash2, CheckCircle, AlertTriangle, Flame, Zap,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  LineChart, Line, ReferenceLine,
} from 'recharts';
import { ProgressBar } from '../../components/UI';
import { api } from '../../api';
import useAppStore from '../../store';

// ── Constants (mirrored from CodingProfile) ───────────────────────────────────
const PLATFORMS = [
  { id: 'leetcode',   label: 'LeetCode',   color: '#f59e0b', placeholder: 'your_username',  url: u => `https://leetcode.com/u/${u}` },
  { id: 'github',     label: 'GitHub',     color: '#8b949e', placeholder: 'github_username', url: u => `https://github.com/${u}` },
  { id: 'codeforces', label: 'Codeforces', color: '#4f8ef7', placeholder: 'cf_handle',       url: u => `https://codeforces.com/profile/${u}` },
  { id: 'codechef',   label: 'CodeChef',   color: '#cd7f32', placeholder: 'cc_username',     url: u => `https://codechef.com/users/${u}` },
];

const TIERS = [
  { min: 950, label: 'Legend',   color: '#ef4444' },
  { min: 800, label: 'Elite',    color: '#f59e0b' },
  { min: 600, label: 'Expert',   color: '#a855f7' },
  { min: 400, label: 'Coder',    color: '#3b82f6' },
  { min: 200, label: 'Learner',  color: '#22c55e' },
  { min: 0,   label: 'Beginner', color: '#94a3b8' },
];

const CF_RANK_COLORS = {
  grandmaster: '#ff0000', master: '#ff8c00', 'candidate master': '#a855f7',
  expert: '#3b82f6', specialist: '#22d3ee', pupil: '#22c55e', newbie: '#94a3b8',
};

const getTier = s => TIERS.find(t => s >= t.min) || TIERS[TIERS.length - 1];
const cfColor = r => { const k = Object.keys(CF_RANK_COLORS).find(k => (r||'').toLowerCase().includes(k)); return k ? CF_RANK_COLORS[k] : '#94a3b8'; };
const safeH = v => (v != null && !isNaN(v) && v > 0) ? `${Number(v).toFixed(1)}h` : '0h';

function timeAgo(iso) {
  if (!iso) return 'Never';
  const d = Math.floor((Date.now() - new Date(iso)) / 86400000);
  if (d === 0) return 'Today';
  if (d === 1) return 'Yesterday';
  if (d < 7)  return `${d}d ago`;
  if (d < 30) return `${Math.floor(d/7)}w ago`;
  return `${Math.floor(d/30)}mo ago`;
}

// ── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ msg, type = 'success', onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, [onClose]);
  const bg = type === 'success' ? '#22c55e20' : '#ef444420';
  const border = type === 'success' ? '#22c55e40' : '#ef444440';
  const color = type === 'success' ? '#22c55e' : '#ef4444';
  return (
    <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999, padding: '12px 18px', borderRadius: '10px', background: bg, border: `1px solid ${border}`, color, fontSize: '13px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
      {type === 'success' ? <Check size={14} /> : <AlertTriangle size={14} />} {msg}
    </div>
  );
}

// ── Veloris Card ──────────────────────────────────────────────────────────────
function VelorisCard({ coding }) {
  const [open, setOpen] = useState(false);
  if (!coding) return null;
  const total = coding.veloris_score ?? 0;
  const tier  = getTier(total);
  const bd    = coding.breakdown ?? {};
  const segs  = [
    { label: 'LeetCode',   val: bd.lc ?? 0,       max: 350, color: '#f59e0b' },
    { label: 'Codeforces', val: bd.cf ?? 0,       max: 250, color: '#4f8ef7' },
    { label: 'CodeChef',   val: bd.cc ?? 0,       max: 150, color: '#cd7f32' },
    { label: 'GitHub',     val: bd.gh ?? 0,       max: 150, color: '#8b949e' },
    { label: 'Activity',   val: bd.activity ?? 0, max: 100, color: '#22c55e' },
  ];
  return (
    <div className="card" onClick={() => setOpen(o => !o)}
      style={{ padding: '16px 20px', marginBottom: '16px', cursor: 'pointer', border: `1px solid ${tier.color}30`, background: `linear-gradient(135deg,var(--bg-elevated),${tier.color}10)` }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
          <div style={{ fontSize: '44px', fontWeight: '800', fontFamily: 'Space Grotesk,sans-serif', color: tier.color, lineHeight: 1 }}>{total}</div>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Veloris Score</div>
            <div style={{ marginTop: '3px', fontSize: '11px', fontWeight: '600', padding: '2px 8px', borderRadius: '12px', background: `${tier.color}20`, color: tier.color, border: `1px solid ${tier.color}40`, display: 'inline-block' }}>⚡ {tier.label}</div>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '6px' }}>{open ? 'Hide ▲' : 'Breakdown ▼'}</div>
          <div style={{ display: 'flex', gap: '2px', height: '6px', borderRadius: '3px', overflow: 'hidden', width: '140px' }}>
            {segs.map(s => <div key={s.label} style={{ flex: s.max, background: s.val > 0 ? s.color : 'rgba(255,255,255,0.06)', opacity: s.val > 0 ? Math.max(0.3, s.val / s.max) : 1 }} />)}
          </div>
        </div>
      </div>
      {open && (
        <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: '8px' }}>
          {segs.map(s => (
            <div key={s.label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '16px', fontWeight: '700', color: s.color, fontFamily: 'Space Grotesk,sans-serif' }}>{Math.round(s.val)}</div>
              <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>/ {s.max}</div>
              <div style={{ fontSize: '9px', color: 'var(--text-muted)', marginBottom: '4px' }}>{s.label}</div>
              <div style={{ height: '3px', borderRadius: '2px', background: 'rgba(255,255,255,0.06)' }}>
                <div style={{ width: `${Math.min((s.val/s.max)*100,100)}%`, height: '100%', background: s.color, borderRadius: '2px' }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Recent List ───────────────────────────────────────────────────────────────
function RecentList({ items }) {
  const PC = { leetcode: '#f59e0b', github: '#8b949e', codeforces: '#4f8ef7', codechef: '#cd7f32' };
  if (!items?.length) return <div style={{ fontSize: '12px', color: 'var(--text-muted)', padding: '10px 0' }}>No recent activity</div>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {items.map((s, i) => (
        <a key={i} href={s.url || '#'} target="_blank" rel="noreferrer"
          style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', textDecoration: 'none', color: 'var(--text-primary)', transition: 'background 0.15s' }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}>
          <span style={{ fontSize: '9px', padding: '2px 6px', borderRadius: '4px', background: `${PC[s.platform]||'#555'}22`, color: PC[s.platform]||'#aaa', whiteSpace: 'nowrap', flexShrink: 0 }}>{s.platform}</span>
          <span style={{ flex: 1, fontSize: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.title}</span>
          <span style={{ fontSize: '10px', color: 'var(--text-muted)', whiteSpace: 'nowrap', flexShrink: 0 }}>{timeAgo(s.time)}</span>
          <ExternalLink size={10} color="var(--text-muted)" style={{ flexShrink: 0 }} />
        </a>
      ))}
    </div>
  );
}

// ── Link Form ─────────────────────────────────────────────────────────────────
function LinkForm({ platform, onLinked }) {
  const [val, setVal] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const meta = PLATFORMS.find(p => p.id === platform);
  const submit = async () => {
    if (!val.trim()) return;
    setBusy(true); setErr('');
    try {
      await { leetcode: () => api.coding.syncLeetcode(val.trim()), github: () => api.coding.syncGithub(val.trim()), codeforces: () => api.coding.syncCodeforces(val.trim()), codechef: () => api.coding.syncCodechef(val.trim()) }[platform]();
      onLinked();
    } catch { setErr('Not found or API unavailable.'); }
    setBusy(false);
  };
  return (
    <div style={{ padding: '12px' }}>
      <div style={{ display: 'flex', gap: '8px' }}>
        <input className="input" placeholder={`@${meta?.placeholder}`} value={val} onChange={e => setVal(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !busy && val.trim() && submit()} style={{ flex: 1, fontSize: '12px' }} autoFocus />
        <button className="btn btn-primary" disabled={busy || !val.trim()} onClick={submit} style={{ fontSize: '12px', whiteSpace: 'nowrap' }}>
          {busy ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
          {busy ? 'Linking…' : 'Save'}
        </button>
      </div>
      {err && <div style={{ fontSize: '11px', color: '#ef4444', marginTop: '6px' }}>{err}</div>}
    </div>
  );
}

// ── Platform Card ─────────────────────────────────────────────────────────────
function PlatformCard({ platform, profile, onLinked, onTabSwitch, isOwn }) {
  const [showForm, setShowForm] = useState(false);
  const meta = PLATFORMS.find(p => p.id === platform);
  if (profile) {
    const stat = platform === 'leetcode' ? `${profile.solved_total ?? 0} solved`
      : platform === 'github'     ? `${profile.total_commits_year ?? 0} commits`
      : platform === 'codeforces' ? `${profile.cf_rating ?? '—'} rating`
      : `${profile.cc_rating ?? '—'} rating`;
    const sub = platform === 'leetcode' ? `${profile.easy ?? 0}E · ${profile.medium ?? 0}M · ${profile.hard ?? 0}H`
      : platform === 'github'     ? `${profile.public_repos ?? 0} repos · ${profile.top_language || '—'}`
      : platform === 'codeforces' ? profile.cf_rank || ''
      : profile.cc_stars ? `${'★'.repeat(Math.min(parseInt(profile.cc_stars)||0,5))} ${profile.cc_stars}` : '';
    return (
      <div className="card" onClick={() => onTabSwitch(platform)}
        style={{ padding: '14px 16px', cursor: 'pointer', border: `1px solid ${meta.color}30`, transition: 'transform 0.15s, border-color 0.15s' }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.borderColor = `${meta.color}60`; }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = `${meta.color}30`; }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
              <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: meta.color }} />
              <span style={{ fontSize: '12px', fontWeight: '600', color: meta.color }}>{meta.label}</span>
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>@{profile.username}</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
            <span style={{ fontSize: '9px', padding: '1px 6px', borderRadius: '4px', background: '#22c55e20', color: '#22c55e', border: '1px solid #22c55e30' }}>✓ Connected</span>
            <a href={meta.url(profile.username)} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}>
              <ExternalLink size={11} color="var(--text-muted)" />
            </a>
          </div>
        </div>
        <div style={{ fontSize: '20px', fontWeight: '700', color: meta.color, fontFamily: 'Space Grotesk,sans-serif', marginBottom: '4px' }}>{stat}</div>
        {sub && <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '6px' }}>{sub}</div>}
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '3px' }}><Clock size={9} /> {timeAgo(profile.last_activity_at)}</span>
          <span style={{ fontSize: '10px', color: profile.estimated_weekly_hours > 0 ? '#8b5cf6' : 'var(--text-muted)' }}>{safeH(profile.estimated_weekly_hours)}/wk</span>
        </div>
      </div>
    );
  }
  if (!isOwn) return (
    <div className="card" style={{ padding: '20px', textAlign: 'center', border: '1px dashed rgba(255,255,255,0.08)', opacity: 0.5 }}>
      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{meta.label} — Not connected</div>
    </div>
  );
  return (
    <div className="card" style={{ border: '1px dashed rgba(255,255,255,0.10)', background: 'rgba(255,255,255,0.015)', overflow: 'hidden' }}>
      {!showForm ? (
        <div style={{ padding: '20px', textAlign: 'center', cursor: 'pointer' }} onClick={() => setShowForm(true)}>
          <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: `${meta.color}15`, border: `1px solid ${meta.color}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
            <Link2 size={16} color={meta.color} style={{ opacity: 0.7 }} />
          </div>
          <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '8px' }}>{meta.label}</div>
          <button className="btn" style={{ fontSize: '11px', padding: '5px 14px', background: `${meta.color}15`, color: meta.color, border: `1px solid ${meta.color}35` }}>+ Connect</button>
        </div>
      ) : (
        <div>
          <div style={{ padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: '600', color: meta.color }}>{meta.label}</span>
            <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '11px' }}>Cancel</button>
          </div>
          <LinkForm platform={platform} onLinked={() => { setShowForm(false); onLinked(); }} />
        </div>
      )}
    </div>
  );
}

// ── Platform Panels ───────────────────────────────────────────────────────────
function LCPanel({ p }) {
  const data = [{ tag: 'Easy', solved: p.easy??0, color:'#22c55e' }, { tag: 'Medium', solved: p.medium??0, color:'#f59e0b' }, { tag: 'Hard', solved: p.hard??0, color:'#ef4444' }];
  const total = p.solved_total ?? 0;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px' }}>
        {[{l:'Total',v:total,c:'#4f8ef7'},{l:'Easy',v:p.easy??0,c:'#22c55e'},{l:'Medium',v:p.medium??0,c:'#f59e0b'},{l:'Hard',v:p.hard??0,c:'#ef4444'}].map(({l,v,c})=>(
          <div key={l} className="stat-card" style={{textAlign:'center',padding:'14px'}}>
            <div style={{fontSize:'22px',fontWeight:'700',fontFamily:'Space Grotesk,sans-serif',color:c}}>{v}</div>
            <div style={{fontSize:'10px',color:'var(--text-muted)',marginTop:'2px'}}>{l}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div className="card" style={{padding:'16px'}}>
          <div style={{fontSize:'12px',fontWeight:'600',marginBottom:'12px'}}>Difficulty Breakdown</div>
          {data.map(({tag,solved,color})=>(
            <div key={tag} style={{marginBottom:'10px'}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:'4px'}}>
                <span style={{fontSize:'11px'}}>{tag}</span><span style={{fontSize:'11px',color:'var(--text-muted)'}}>{solved}</span>
              </div>
              <ProgressBar value={solved} max={Math.max(total,1)} color={color} height={4} />
            </div>
          ))}
        </div>
        <div className="card" style={{padding:'16px'}}>
          <div style={{fontSize:'12px',fontWeight:'600',marginBottom:'12px'}}>By Difficulty</div>
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="tag" tick={{fill:'#8b8ba0',fontSize:10}} axisLine={false} tickLine={false} />
              <YAxis tick={{fill:'#8b8ba0',fontSize:10}} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{background:'var(--bg-elevated)',border:'1px solid var(--border)',borderRadius:'8px',fontSize:'11px'}} />
              <Bar dataKey="solved" fill="#f59e0b" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="card" style={{padding:'16px'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'12px'}}>
          <div style={{fontSize:'12px',fontWeight:'600'}}>Recent Submissions</div>
          <a href={`https://leetcode.com/u/${p.username}`} target="_blank" rel="noreferrer" style={{fontSize:'11px',color:'#f59e0b',display:'flex',alignItems:'center',gap:'4px',textDecoration:'none'}}>View on LeetCode <ExternalLink size={10}/></a>
        </div>
        <RecentList items={p.recent_submissions} />
      </div>
    </div>
  );
}

function GHPanel({ p }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px' }}>
        {[{l:'Public Repos',v:p.public_repos??0},{l:'Commits (year)',v:p.total_commits_year??0},{l:'Top Language',v:p.top_language||'—'},{l:'Weekly Hours',v:safeH(p.estimated_weekly_hours)}].map(({l,v})=>(
          <div key={l} className="stat-card" style={{textAlign:'center',padding:'14px'}}>
            <div style={{fontSize:'18px',fontWeight:'700',fontFamily:'Space Grotesk,sans-serif',color:'#8b949e'}}>{v}</div>
            <div style={{fontSize:'10px',color:'var(--text-muted)',marginTop:'2px'}}>{l}</div>
          </div>
        ))}
      </div>
      <div className="card" style={{padding:'16px'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'12px'}}>
          <div style={{fontSize:'12px',fontWeight:'600'}}>Recent Commits</div>
          <a href={`https://github.com/${p.username}`} target="_blank" rel="noreferrer" style={{fontSize:'11px',color:'#8b949e',display:'flex',alignItems:'center',gap:'4px',textDecoration:'none'}}>View on GitHub <ExternalLink size={10}/></a>
        </div>
        <RecentList items={p.recent_submissions} />
      </div>
    </div>
  );
}

function CFPanel({ p }) {
  const rc = cfColor(p.cf_rank);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '12px' }}>
        {[{l:'Rating',v:p.cf_rating??'—',c:rc},{l:'Rank',v:p.cf_rank||'—',c:rc},{l:'Problems Solved',v:p.cf_problems_solved??0,c:'#4f8ef7'}].map(({l,v,c})=>(
          <div key={l} className="stat-card" style={{textAlign:'center',padding:'14px'}}>
            <div style={{fontSize:'20px',fontWeight:'700',fontFamily:'Space Grotesk,sans-serif',color:c}}>{v}</div>
            <div style={{fontSize:'10px',color:'var(--text-muted)',marginTop:'2px'}}>{l}</div>
          </div>
        ))}
      </div>
      <div className="card" style={{padding:'16px'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'12px'}}>
          <div style={{fontSize:'12px',fontWeight:'600'}}>Recent AC Submissions</div>
          <a href={`https://codeforces.com/profile/${p.username}`} target="_blank" rel="noreferrer" style={{fontSize:'11px',color:'#4f8ef7',display:'flex',alignItems:'center',gap:'4px',textDecoration:'none'}}>View on Codeforces <ExternalLink size={10}/></a>
        </div>
        <RecentList items={p.recent_submissions} />
      </div>
    </div>
  );
}

function CCPanel({ p }) {
  const stars = Math.min(parseInt(p.cc_stars||'0',10),5);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '12px' }}>
        {[{l:'Rating',v:p.cc_rating??'—'},{l:'Stars',v:'★'.repeat(stars)||'—'},{l:'Problems Solved',v:p.cc_problems_solved??0}].map(({l,v})=>(
          <div key={l} className="stat-card" style={{textAlign:'center',padding:'14px'}}>
            <div style={{fontSize:'20px',fontWeight:'700',fontFamily:'Space Grotesk,sans-serif',color:'#cd7f32'}}>{v}</div>
            <div style={{fontSize:'10px',color:'var(--text-muted)',marginTop:'2px'}}>{l}</div>
          </div>
        ))}
      </div>
      <div className="card" style={{padding:'16px'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'12px'}}>
          <div style={{fontSize:'12px',fontWeight:'600'}}>Recent Contests</div>
          <a href={`https://codechef.com/users/${p.username}`} target="_blank" rel="noreferrer" style={{fontSize:'11px',color:'#cd7f32',display:'flex',alignItems:'center',gap:'4px',textDecoration:'none'}}>View on CodeChef <ExternalLink size={10}/></a>
        </div>
        <RecentList items={p.recent_submissions} />
      </div>
    </div>
  );
}

// ── Leaderboard Tab ───────────────────────────────────────────────────────────
function LeaderboardTab({ highlightUserId }) {
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {[...Array(5)].map((_, i) => <div key={i} style={{ height: '56px', borderRadius: '8px', background: 'rgba(255,255,255,0.04)', animation: 'pulse 1.5s ease-in-out infinite' }} />)}
    </div>
  );
  if (!board.length) return (
    <div className="card" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
      <Trophy size={28} style={{ margin: '0 auto 12px', opacity: 0.3, display: 'block' }} />
      No profiles ranked yet.
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '44px 1fr 110px 80px 80px 80px', gap: '8px', padding: '4px 12px', fontSize: '10px', color: 'var(--text-muted)', fontWeight: '600', letterSpacing: '0.05em' }}>
        <span>RANK</span><span>STUDENT</span><span>SCORE</span><span style={{ textAlign: 'center' }}>PROBLEMS</span><span style={{ textAlign: 'center' }}>CF</span><span style={{ textAlign: 'right' }}>ACTIVE</span>
      </div>
      {board.map(row => {
        const tier = getTier(row.veloris_score ?? 0);
        const isHighlighted = highlightUserId ? row.user_id === highlightUserId : row.is_me;
        return (
          <div key={row.rank} style={{ display: 'grid', gridTemplateColumns: '44px 1fr 110px 80px 80px 80px', gap: '8px', padding: '10px 12px', borderRadius: '8px', background: isHighlighted ? `${tier.color}12` : 'rgba(255,255,255,0.02)', border: isHighlighted ? `1px solid ${tier.color}40` : '1px solid rgba(255,255,255,0.05)', borderLeft: isHighlighted ? `3px solid ${tier.color}` : undefined, alignItems: 'center' }}>
            <span style={{ fontSize: row.rank <= 3 ? '18px' : '13px', fontWeight: '700', textAlign: 'center' }}>{MEDAL[row.rank] || `#${row.rank}`}</span>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: '13px', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {row.name || 'Anonymous'}{isHighlighted && <span style={{ marginLeft: '6px', fontSize: '9px', color: tier.color }}>{highlightUserId ? '(this student)' : '(you)'}</span>}
              </div>
              {row.branch && <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{row.branch}</div>}
            </div>
            <div>
              <div style={{ fontSize: '15px', fontWeight: '700', color: tier.color, fontFamily: 'Space Grotesk' }}>{row.veloris_score}</div>
              <div style={{ fontSize: '9px', color: tier.color, opacity: 0.7 }}>{tier.label}</div>
            </div>
            <div style={{ textAlign: 'center', fontSize: '12px', fontWeight: '600' }}>{row.problems_solved ?? '—'}</div>
            <div style={{ textAlign: 'center', fontSize: '12px', color: '#4f8ef7', fontWeight: '600' }}>{row.cf_rating || '—'}</div>
            <div style={{ textAlign: 'right', fontSize: '10px', color: 'var(--text-muted)' }}>{timeAgo(row.last_activity_at)}</div>
          </div>
        );
      })}
    </div>
  );
}

// ── Attendance Tab ────────────────────────────────────────────────────────────
function AttendanceTab({ attendance }) {
  if (!attendance || attendance.overall_percentage === null) {
    return (
      <div className="card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
        No attendance data synced yet.
      </div>
    );
  }
  const pct = attendance.overall_percentage ?? 0;
  const color = pct >= 75 ? '#22c55e' : pct >= 60 ? '#f59e0b' : '#ef4444';
  const totalPresent = attendance.by_subject?.reduce((a, s) => a + s.present, 0) ?? 0;
  const totalClasses = attendance.by_subject?.reduce((a, s) => a + s.total, 0) ?? 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Overall gauge */}
      <div className="card" style={{ padding: '28px', textAlign: 'center' }}>
        <div style={{ fontSize: '64px', fontWeight: '800', fontFamily: 'Space Grotesk,sans-serif', color, lineHeight: 1 }}>{pct}%</div>
        <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '8px' }}>Overall Attendance</div>
        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>{totalPresent} present out of {totalClasses} total classes</div>
        {pct < 75 && (
          <div style={{ marginTop: '16px', padding: '10px 16px', borderRadius: '8px', background: '#ef444420', border: '1px solid #ef444440', color: '#ef4444', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <AlertTriangle size={14} /> Below required 75% threshold
          </div>
        )}
      </div>

      {/* Subject breakdown */}
      {attendance.by_subject?.length > 0 && (
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '16px' }}>Subject Breakdown</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {attendance.by_subject.map(s => {
              const c = s.percentage >= 75 ? '#22c55e' : s.percentage >= 60 ? '#f59e0b' : '#ef4444';
              return (
                <div key={s.subject}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '12px' }}>{s.subject}</span>
                    <span style={{ fontSize: '12px', color: c, fontWeight: '600' }}>{s.present}/{s.total} ({s.percentage}%)</span>
                  </div>
                  <ProgressBar value={s.percentage} color={c} height={4} />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent absences */}
      {attendance.recent_absences?.length > 0 && (
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '12px' }}>Recent Absences</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {attendance.recent_absences.map((a, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 12px', background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: '8px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444', flexShrink: 0 }} />
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{a.date}</span>
                <span style={{ fontSize: '12px' }}>{a.subject}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Academics Tab ─────────────────────────────────────────────────────────────
function AcademicsTab({ academics }) {
  const [openSem, setOpenSem] = useState(null);
  if (!academics || (!academics.cgpa && !academics.semesters?.length)) {
    return (
      <div className="card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
        No academic data available yet.
      </div>
    );
  }
  const gradeColor = g => {
    if (!g) return 'var(--text-muted)';
    const u = g.toUpperCase();
    if (u === 'O' || u === 'A+') return '#22c55e';
    if (u === 'A' || u === 'B') return '#3b82f6';
    if (u === 'C' || u === 'D') return '#f59e0b';
    if (u === 'F') return '#ef4444';
    return 'var(--text-muted)';
  };
  const chartData = academics.semesters?.map(s => ({ name: `Sem ${s.sem_no}`, sgpa: s.sgpa })) || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '12px' }}>
        {[
          { l: 'CGPA', v: academics.cgpa ?? '—', c: '#5B5BD6' },
          { l: 'Current SGPA', v: academics.current_sgpa ?? '—', c: '#22c55e' },
          { l: 'Semesters', v: academics.semesters?.length ?? 0, c: '#f59e0b' },
        ].map(({ l, v, c }) => (
          <div key={l} className="stat-card" style={{ textAlign: 'center', padding: '20px' }}>
            <div style={{ fontSize: '28px', fontWeight: '800', fontFamily: 'Space Grotesk,sans-serif', color: c }}>{v}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>{l}</div>
          </div>
        ))}
      </div>

      {chartData.length > 1 && (
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '16px' }}>SGPA Trend</div>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="name" tick={{ fill: '#8b8ba0', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 10]} tick={{ fill: '#8b8ba0', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '11px' }} />
              <Line type="monotone" dataKey="sgpa" stroke="#5B5BD6" strokeWidth={2} dot={{ fill: '#5B5BD6', r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {academics.semesters?.map(sem => (
        <div key={sem.sem_no} className="card" style={{ overflow: 'hidden' }}>
          <div onClick={() => setOpenSem(openSem === sem.sem_no ? null : sem.sem_no)}
            style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', fontWeight: '600' }}>Semester {sem.sem_no}</span>
              <span style={{ fontSize: '12px', color: '#22c55e' }}>SGPA: {sem.sgpa}</span>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{sem.subjects?.length ?? 0} subjects</span>
            </div>
            <ChevronRight size={14} style={{ transform: openSem === sem.sem_no ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s', color: 'var(--text-muted)' }} />
          </div>
          {openSem === sem.sem_no && sem.subjects?.length > 0 && (
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '0 20px 16px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', marginTop: '12px' }}>
                <thead>
                  <tr style={{ color: 'var(--text-muted)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    <th style={{ textAlign: 'left', padding: '4px 0', fontWeight: '600' }}>Code</th>
                    <th style={{ textAlign: 'left', padding: '4px 0', fontWeight: '600' }}>Subject</th>
                    <th style={{ textAlign: 'center', padding: '4px 0', fontWeight: '600' }}>Grade</th>
                    <th style={{ textAlign: 'center', padding: '4px 0', fontWeight: '600' }}>Credits</th>
                  </tr>
                </thead>
                <tbody>
                  {sem.subjects.map((sub, i) => (
                    <tr key={i} style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '8px 0', color: 'var(--text-muted)' }}>{sub.code}</td>
                      <td style={{ padding: '8px 0' }}>{sub.name}</td>
                      <td style={{ padding: '8px 0', textAlign: 'center', fontWeight: '700', color: gradeColor(sub.grade) }}>{sub.grade}</td>
                      <td style={{ padding: '8px 0', textAlign: 'center', color: 'var(--text-muted)' }}>{sub.credits}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Internships Tab ───────────────────────────────────────────────────────────
function InternshipsTab({ internships: initialInternships, isOwn, viewerRole, onRefresh }) {
  const [internships, setInternships] = useState(initialInternships || []);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ company: '', role: '', start_date: '', end_date: '', description: '', tech_stack: '', currently_working: false });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => { setInternships(initialInternships || []); }, [initialInternships]);

  const resetForm = () => setForm({ company: '', role: '', start_date: '', end_date: '', description: '', tech_stack: '', currently_working: false });

  const openAdd = () => { resetForm(); setEditId(null); setShowForm(true); };
  const openEdit = (item) => {
    setForm({ company: item.company, role: item.role, start_date: item.start_date || '', end_date: item.end_date || '', description: item.description || '', tech_stack: item.tech_stack || '', currently_working: !item.end_date });
    setEditId(item.id);
    setShowForm(true);
  };

  const save = async () => {
    if (!form.company || !form.role || !form.start_date) return;
    setSaving(true);
    try {
      const payload = { company: form.company, role: form.role, start_date: form.start_date, end_date: form.currently_working ? null : (form.end_date || null), description: form.description || null, tech_stack: form.tech_stack || null };
      if (editId) {
        await api.profile.updateInternship(editId, payload);
      } else {
        await api.profile.addInternship(payload);
      }
      const updated = await api.profile.getMyInternships();
      setInternships(updated);
      setShowForm(false); resetForm(); setEditId(null);
      setToast({ msg: editId ? 'Internship updated' : 'Internship added', type: 'success' });
    } catch { setToast({ msg: 'Failed to save', type: 'error' }); }
    setSaving(false);
  };

  const del = async (id) => {
    try {
      await api.profile.deleteInternship(id);
      setInternships(prev => prev.filter(i => i.id !== id));
      setToast({ msg: 'Deleted', type: 'success' });
    } catch { setToast({ msg: 'Failed to delete', type: 'error' }); }
  };

  const verify = async (id) => {
    try {
      const updated = await api.profile.verifyInternship(id);
      setInternships(prev => prev.map(i => i.id === id ? updated : i));
      setToast({ msg: 'Internship verified', type: 'success' });
    } catch { setToast({ msg: 'Failed to verify', type: 'error' }); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: '14px', fontWeight: '600' }}>Internship Experience</div>
        {isOwn && <button className="btn btn-primary" onClick={openAdd} style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}><Plus size={13} /> Add Internship</button>}
      </div>

      {showForm && (
        <div className="card" style={{ padding: '20px', border: '1px solid rgba(91,91,214,0.3)' }}>
          <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '16px' }}>{editId ? 'Edit' : 'Add'} Internship</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div>
              <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Company *</label>
              <input className="input" value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} placeholder="Company name" style={{ width: '100%', fontSize: '12px' }} />
            </div>
            <div>
              <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Role *</label>
              <input className="input" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} placeholder="Position / Role" style={{ width: '100%', fontSize: '12px' }} />
            </div>
            <div>
              <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Start Date *</label>
              <input className="input" type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} style={{ width: '100%', fontSize: '12px' }} />
            </div>
            <div>
              <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>End Date</label>
              <input className="input" type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} disabled={form.currently_working} style={{ width: '100%', fontSize: '12px', opacity: form.currently_working ? 0.4 : 1 }} />
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px', fontSize: '11px', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <input type="checkbox" checked={form.currently_working} onChange={e => setForm(f => ({ ...f, currently_working: e.target.checked, end_date: '' }))} />
                Currently working here
              </label>
            </div>
          </div>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Tech Stack (comma-separated)</label>
            <input className="input" value={form.tech_stack} onChange={e => setForm(f => ({ ...f, tech_stack: e.target.value }))} placeholder="React, Python, FastAPI..." style={{ width: '100%', fontSize: '12px' }} />
          </div>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Description</label>
            <textarea className="input" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="What did you work on?" rows={3} style={{ width: '100%', fontSize: '12px', resize: 'vertical' }} />
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-primary" onClick={save} disabled={saving || !form.company || !form.role || !form.start_date} style={{ fontSize: '12px' }}>
              {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} {saving ? 'Saving…' : 'Save'}
            </button>
            <button className="btn btn-ghost" onClick={() => { setShowForm(false); resetForm(); setEditId(null); }} style={{ fontSize: '12px' }}>Cancel</button>
          </div>
        </div>
      )}

      {internships.length === 0 && !showForm && (
        <div className="card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <Briefcase size={28} style={{ margin: '0 auto 12px', opacity: 0.3, display: 'block' }} />
          {isOwn ? 'No internships added yet. Add your first experience.' : 'No internship experience listed.'}
        </div>
      )}

      {internships.map(item => (
        <div key={item.id} className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: '#5B5BD620', border: '1px solid #5B5BD640', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: '700', color: '#5B5BD6', flexShrink: 0 }}>
                {item.company[0]?.toUpperCase()}
              </div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: '700' }}>{item.company}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{item.role}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  {item.start_date} – {item.end_date || 'Present'}
                </div>
                {item.tech_stack && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '8px' }}>
                    {item.tech_stack.split(',').map(t => t.trim()).filter(Boolean).map(t => (
                      <span key={t} style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '4px', background: 'rgba(91,91,214,0.15)', color: '#5B5BD6', border: '1px solid rgba(91,91,214,0.25)' }}>{t}</span>
                    ))}
                  </div>
                )}
                {item.description && <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px', lineHeight: '1.5' }}>{item.description}</div>}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
              {item.verified ? (
                <span style={{ fontSize: '10px', padding: '3px 8px', borderRadius: '6px', background: '#22c55e20', color: '#22c55e', border: '1px solid #22c55e40', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <CheckCircle size={10} /> Verified
                </span>
              ) : (
                <span style={{ fontSize: '10px', padding: '3px 8px', borderRadius: '6px', background: '#f59e0b20', color: '#f59e0b', border: '1px solid #f59e0b40' }}>⏳ Pending</span>
              )}
              {isOwn && (
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button className="btn btn-ghost" onClick={() => openEdit(item)} style={{ fontSize: '11px', padding: '4px 10px' }}><Edit3 size={11} /></button>
                  <button className="btn btn-ghost" onClick={() => del(item.id)} style={{ fontSize: '11px', padding: '4px 10px', color: '#ef4444' }}><Trash2 size={11} /></button>
                </div>
              )}
              {!isOwn && !item.verified && (viewerRole === 'teacher' || viewerRole === 'admin') && (
                <button className="btn btn-primary" onClick={() => verify(item.id)} style={{ fontSize: '11px', padding: '4px 12px' }}>
                  <CheckCircle size={11} /> Verify
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Activity Heatmap ─────────────────────────────────────────────────────────

const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAY_LABELS   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

/** Build dateMap + streaks from all platform submissions for a given year */
function buildActivityMap(codingData, year) {
  const dateMap = {};
  const addDate = (isoStr) => {
    if (!isoStr) return;
    const d = isoStr.slice(0, 10);
    if (!year || d.startsWith(String(year))) dateMap[d] = (dateMap[d] || 0) + 1;
  };
  (codingData?.platforms || []).forEach(p => (p.recent_submissions || []).forEach(s => addDate(s.time)));
  (codingData?.summary?.recent_submissions || []).forEach(s => addDate(s.time));

  // Streaks (always computed on full data regardless of year filter)
  const allDates = {};
  (codingData?.platforms || []).forEach(p => (p.recent_submissions || []).forEach(s => { if (s.time) allDates[s.time.slice(0,10)] = 1; }));
  (codingData?.summary?.recent_submissions || []).forEach(s => { if (s.time) allDates[s.time.slice(0,10)] = 1; });

  const today = new Date(); today.setHours(0,0,0,0);
  let cur = 0, longest = 0, tmp = 0;
  for (let i = 0; i < 730; i++) {
    const d = new Date(today); d.setDate(d.getDate() - i);
    const k = d.toISOString().slice(0,10);
    if (allDates[k]) { tmp++; if (i === 0 || cur > 0) cur = tmp; }
    else { if (i === 0) cur = 0; longest = Math.max(longest, tmp); tmp = 0; }
  }
  longest = Math.max(longest, tmp);

  const totalDays   = Object.keys(dateMap).length;
  const totalEvents = Object.values(dateMap).reduce((a,b) => a+b, 0);
  return { dateMap, currentStreak: cur, longestStreak: longest, totalDays, totalEvents };
}

/** Build 52-week Sunday-aligned grid for a given year */
function buildYearGrid(year) {
  const isCurrentYear = year === new Date().getFullYear();
  const end   = isCurrentYear ? new Date() : new Date(year, 11, 31);
  const start = new Date(year, 0, 1);
  // Align start to Sunday
  start.setDate(start.getDate() - start.getDay());
  end.setHours(23,59,59,999);

  const weeks = [];
  let week = [];
  const cur = new Date(start);
  while (cur <= end) {
    week.push(new Date(cur));
    if (week.length === 7) { weeks.push(week); week = []; }
    cur.setDate(cur.getDate() + 1);
  }
  if (week.length) { while (week.length < 7) { week.push(null); } weeks.push(week); }
  return weeks;
}

const CELL = 13; // px — cell size
const GAP  = 3;  // px — gap between cells

function HeatCell({ day, count, today, onHover, onLeave }) {
  if (!day) return <div style={{ width: CELL, height: CELL }} />;
  const isFuture = day > today;
  const isToday  = day.toISOString().slice(0,10) === today.toISOString().slice(0,10);

  const bg = isFuture ? 'transparent'
    : count === 0 ? '#161b22'
    : count === 1 ? '#0e4429'
    : count <= 3  ? '#006d32'
    : count <= 6  ? '#26a641'
    :               '#39d353';

  return (
    <div
      style={{
        width: CELL, height: CELL, borderRadius: '3px',
        background: bg,
        border: isToday ? '1px solid #39d353' : '1px solid rgba(255,255,255,0.04)',
        cursor: count > 0 ? 'pointer' : 'default',
        flexShrink: 0,
        transition: 'transform 0.1s, filter 0.1s',
      }}
      onMouseEnter={e => { e.currentTarget.style.filter = 'brightness(1.4)'; onHover(day, count, e); }}
      onMouseLeave={e => { e.currentTarget.style.filter = 'brightness(1)'; onLeave(); }}
    />
  );
}

function ActivityHeatmap({ codingData }) {
  const currentYear = new Date().getFullYear();
  const availableYears = [currentYear, currentYear-1, currentYear-2, currentYear-3, currentYear-4];
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [tooltip, setTooltip] = useState(null);

  const { dateMap, currentStreak, longestStreak, totalDays, totalEvents } = buildActivityMap(codingData, selectedYear);
  const weeks = buildYearGrid(selectedYear);
  const today = new Date(); today.setHours(0,0,0,0);

  // Month label positions
  const monthLabels = [];
  weeks.forEach((week, wi) => {
    const firstReal = week.find(d => d && d.getFullYear() === selectedYear);
    if (firstReal && firstReal.getDate() <= 7) {
      monthLabels[wi] = MONTHS_SHORT[firstReal.getMonth()];
    }
  });

  const yearTotal = Object.values(dateMap).reduce((a,b) => a+b, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* ── Streak stat cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px' }}>
        {[
          { label: 'Current Streak', value: `${currentStreak} days`, icon: '🔥', color: currentStreak > 0 ? '#f59e0b' : '#475569', glow: currentStreak > 0 },
          { label: 'Longest Streak', value: `${longestStreak} days`, icon: '🏆', color: '#a855f7', glow: false },
          { label: 'Active Days',    value: totalDays,                icon: '⚡', color: '#22c55e', glow: false },
          { label: 'Total Events',   value: totalEvents,              icon: '📌', color: '#4f8ef7', glow: false },
        ].map(({ label, value, icon, color, glow }) => (
          <div key={label} style={{
            padding: '16px 18px', borderRadius: '12px',
            background: `${color}12`, border: `1px solid ${color}28`,
            boxShadow: glow ? `0 0 24px ${color}35` : 'none',
          }}>
            <div style={{ fontSize: '10px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
              {icon} {label}
            </div>
            <div style={{ fontSize: '24px', fontWeight: '800', color, fontFamily: 'Space Grotesk,sans-serif' }}>{value}</div>
          </div>
        ))}
      </div>

      {/* ── GitHub-style heatmap ── */}
      <div style={{
        background: '#0d1117', border: '1px solid #30363d',
        borderRadius: '12px', padding: '20px 24px',
      }}>
        {/* Header row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ fontSize: '13px', color: '#e6edf3', fontWeight: '600' }}>
            <span style={{ color: '#e6edf3', fontWeight: '700' }}>{yearTotal.toLocaleString()}</span>
            <span style={{ color: '#8b949e', fontWeight: '400' }}> contributions in {selectedYear}</span>
          </div>
          {/* Year selector */}
          <div style={{ display: 'flex', gap: '4px' }}>
            {availableYears.map(y => (
              <button key={y} onClick={() => setSelectedYear(y)} style={{
                padding: '3px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: '600',
                cursor: 'pointer', border: '1px solid',
                background: y === selectedYear ? '#388bfd' : 'transparent',
                borderColor: y === selectedYear ? '#388bfd' : '#30363d',
                color: y === selectedYear ? '#fff' : '#8b949e',
                transition: 'all 0.15s',
              }}>{y}</button>
            ))}
          </div>
        </div>

        {/* Grid */}
        <div style={{ overflowX: 'auto' }}>
          <div style={{ display: 'inline-flex', gap: 0 }}>
            {/* Day-of-week labels */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: GAP, marginRight: '6px', paddingTop: `${CELL + GAP + 4}px` }}>
              {['','Mon','','Wed','','Fri',''].map((d, i) => (
                <div key={i} style={{ height: CELL, fontSize: '10px', color: '#8b949e', lineHeight: `${CELL}px`, textAlign: 'right', whiteSpace: 'nowrap' }}>{d}</div>
              ))}
            </div>

            {/* Weeks */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {/* Month labels row */}
              <div style={{ display: 'flex', gap: GAP, marginBottom: '4px', height: CELL }}>
                {weeks.map((_, wi) => (
                  <div key={wi} style={{ width: CELL, fontSize: '10px', color: '#8b949e', whiteSpace: 'nowrap', overflow: 'visible', flexShrink: 0 }}>
                    {monthLabels[wi] || ''}
                  </div>
                ))}
              </div>

              {/* Cell grid — weeks × days */}
              <div style={{ display: 'flex', gap: GAP }}>
                {weeks.map((week, wi) => (
                  <div key={wi} style={{ display: 'flex', flexDirection: 'column', gap: GAP }}>
                    {week.map((day, di) => {
                      const key   = day ? day.toISOString().slice(0,10) : null;
                      const count = key ? (dateMap[key] || 0) : 0;
                      return (
                        <HeatCell
                          key={di} day={day} count={count} today={today}
                          onHover={(d, c, e) => setTooltip({ date: d.toISOString().slice(0,10), count: c, x: e.clientX, y: e.clientY })}
                          onLeave={() => setTooltip(null)}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer: legend */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px', marginTop: '12px' }}>
          <span style={{ fontSize: '11px', color: '#8b949e' }}>Less</span>
          {['#161b22','#0e4429','#006d32','#26a641','#39d353'].map((c,i) => (
            <div key={i} style={{ width: CELL, height: CELL, borderRadius: '3px', background: c, border: '1px solid rgba(255,255,255,0.06)' }} />
          ))}
          <span style={{ fontSize: '11px', color: '#8b949e' }}>More</span>
        </div>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div style={{
          position: 'fixed', zIndex: 9999, pointerEvents: 'none',
          left: tooltip.x + 14, top: tooltip.y - 42,
          background: '#1c2128', border: '1px solid #444c56',
          borderRadius: '6px', padding: '6px 12px',
          fontSize: '12px', color: '#e6edf3',
          boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
        }}>
          <b style={{ color: '#39d353' }}>{tooltip.count} {tooltip.count === 1 ? 'contribution' : 'contributions'}</b>
          {' on '}
          {new Date(tooltip.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </div>
      )}

      {/* Monthly bar chart */}
      <div style={{ background: '#0d1117', border: '1px solid #30363d', borderRadius: '12px', padding: '20px 24px' }}>
        <div style={{ fontSize: '13px', color: '#e6edf3', fontWeight: '600', marginBottom: '16px' }}>Monthly Contributions</div>
        <ResponsiveContainer width="100%" height={130}>
          <BarChart data={(() => {
            const months = {};
            Object.entries(dateMap).forEach(([date, count]) => {
              const m = date.slice(0, 7);
              months[m] = (months[m] || 0) + count;
            });
            return Object.entries(months).sort().map(([m, v]) => ({
              month: MONTHS_SHORT[parseInt(m.slice(5,7)) - 1],
              contributions: v,
            }));
          })()}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="month" tick={{ fill: '#8b949e', fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#8b949e', fontSize: 10 }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ background: '#1c2128', border: '1px solid #444c56', borderRadius: '8px', fontSize: '11px', color: '#e6edf3' }}
              cursor={{ fill: 'rgba(255,255,255,0.04)' }}
            />
            <Bar dataKey="contributions" fill="#26a641" radius={[3,3,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ── Overview Tab ─────────────────────────────────────────────────────────────
function OverviewTab({ coding, attendance, academics, internships, tier, onTabSwitch }) {
  const attPct = attendance?.overall_percentage ?? null;
  const attColor = attPct == null ? '#94a3b8' : attPct >= 75 ? '#22c55e' : attPct >= 60 ? '#f59e0b' : '#ef4444';
  const worstSubject = attendance?.by_subject?.slice(0, 1)[0] || null;
  const recentActivity = coding?.summary?.recent_submissions?.slice(0, 5) || [];
  const recentInternships = internships?.slice(0, 2) || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Row 1 — 3 snapshot cards */}
      <div className="profile-bento" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '16px' }}>
        {/* Coding snapshot */}
        <div className="card" style={{ padding: '20px', border: `1px solid ${tier.color}25` }}>
          <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Coding</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginBottom: '8px' }}>
            <span style={{ fontSize: '36px', fontWeight: '800', color: tier.color, fontFamily: 'Space Grotesk,sans-serif', lineHeight: 1 }}>{coding?.veloris_score ?? 0}</span>
            <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '12px', background: `${tier.color}20`, color: tier.color, border: `1px solid ${tier.color}40` }}>⚡ {tier.label}</span>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px' }}>{coding?.summary?.total_problems_solved ?? 0} problems solved</div>
          <div style={{ display: 'flex', gap: '4px', height: '4px', borderRadius: '2px', overflow: 'hidden', marginBottom: '12px' }}>
            {[['lc','#f59e0b',350],['cf','#4f8ef7',250],['cc','#cd7f32',150],['gh','#8b949e',150],['activity','#22c55e',100]].map(([k,c,max]) => (
              <div key={k} style={{ flex: max, background: (coding?.breakdown?.[k] ?? 0) > 0 ? c : 'rgba(255,255,255,0.06)' }} />
            ))}
          </div>
          <button onClick={() => onTabSwitch('coding')} style={{ fontSize: '11px', color: '#5B5BD6', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>View Coding Details →</button>
        </div>

        {/* Attendance snapshot */}
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Attendance</div>
          <div style={{ fontSize: '36px', fontWeight: '800', color: attColor, fontFamily: 'Space Grotesk,sans-serif', lineHeight: 1, marginBottom: '6px' }}>
            {attPct != null ? `${attPct}%` : '—'}
          </div>
          {worstSubject && (
            <div style={{ fontSize: '10px', color: '#ef4444', marginBottom: '8px' }}>
              ⚠ {worstSubject.subject}: {worstSubject.percentage}%
            </div>
          )}
          <button onClick={() => onTabSwitch('attendance')} style={{ fontSize: '11px', color: '#5B5BD6', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>View Details →</button>
        </div>

        {/* Academics snapshot */}
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Academics</div>
          <div style={{ fontSize: '36px', fontWeight: '800', color: '#4f8ef7', fontFamily: 'Space Grotesk,sans-serif', lineHeight: 1, marginBottom: '6px' }}>
            {academics?.cgpa ?? '—'}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px' }}>
            SGPA: {academics?.current_sgpa ?? '—'}
          </div>
          <button onClick={() => onTabSwitch('academics')} style={{ fontSize: '11px', color: '#5B5BD6', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>View Details →</button>
        </div>
      </div>

      {/* Row 2 — heatmap preview + internships */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ fontSize: '12px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Flame size={13} style={{ color: '#f59e0b' }} /> Activity Heatmap
            </div>
            <button onClick={() => onTabSwitch('activity')} style={{ fontSize: '11px', color: '#5B5BD6', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>View Full →</button>
          </div>
          {/* Mini streak stats */}
          {(() => {
            const { currentStreak, longestStreak, totalDays } = buildActivityMap(coding);
            return (
              <div style={{ display: 'flex', gap: '16px', marginBottom: '12px' }}>
                {[
                  { label: 'Current', value: `${currentStreak}d 🔥`, color: currentStreak > 0 ? '#f59e0b' : '#64748b' },
                  { label: 'Longest', value: `${longestStreak}d`, color: '#a855f7' },
                  { label: 'Active Days', value: totalDays, color: '#22c55e' },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '16px', fontWeight: '700', color, fontFamily: 'Space Grotesk,sans-serif' }}>{value}</div>
                    <div style={{ fontSize: '9px', color: '#64748b' }}>{label}</div>
                  </div>
                ))}
              </div>
            );
          })()}
          <RecentList items={recentActivity} />
        </div>
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ fontSize: '12px', fontWeight: '600', marginBottom: '12px' }}>Internships</div>
          {recentInternships.length === 0 ? (
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>No internships listed.</div>
          ) : recentInternships.map(item => (
            <div key={item.id} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', marginBottom: '12px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#5B5BD620', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: '700', color: '#5B5BD6', flexShrink: 0 }}>{item.company[0]?.toUpperCase()}</div>
              <div>
                <div style={{ fontSize: '12px', fontWeight: '600' }}>{item.company}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{item.role} · {item.start_date?.slice(0,7)} – {item.end_date?.slice(0,7) || 'Present'}</div>
                {item.verified && <span style={{ fontSize: '9px', color: '#22c55e' }}>✓ Verified</span>}
              </div>
            </div>
          ))}
          <button onClick={() => onTabSwitch('internships')} style={{ fontSize: '11px', color: '#5B5BD6', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>View All →</button>
        </div>
      </div>
    </div>
  );
}

// ── Coding Tab ────────────────────────────────────────────────────────────────
function CodingTab({ codingData, isOwnProfile, onRefresh }) {
  const [profiles, setProfiles] = useState(codingData?.platforms || []);
  const [summary,  setSummary]  = useState(codingData?.summary   || null);
  const [veloris,  setVeloris]  = useState(codingData            || null);
  const [tab,      setTab]      = useState('overview');
  const [syncing,  setSyncing]  = useState('');

  useEffect(() => {
    setProfiles(codingData?.platforms || []);
    setSummary(codingData?.summary   || null);
    setVeloris(codingData            || null);
  }, [codingData]);

  const sync = async (platform) => {
    const p = profiles.find(x => x.platform === platform);
    if (!p) return;
    setSyncing(platform);
    try {
      await { leetcode: () => api.coding.syncLeetcode(p.username), github: () => api.coding.syncGithub(p.username), codeforces: () => api.coding.syncCodeforces(p.username), codechef: () => api.coding.syncCodechef(p.username) }[platform]();
      await onRefresh();
    } catch (e) { console.error(e); }
    setSyncing('');
  };

  const linked = profiles.map(p => p.platform);
  const lc = profiles.find(p => p.platform === 'leetcode');
  const gh = profiles.find(p => p.platform === 'github');
  const cf = profiles.find(p => p.platform === 'codeforces');
  const cc = profiles.find(p => p.platform === 'codechef');

  const TABS = [
    { id: 'overview', label: 'Overview' },
    ...PLATFORMS.filter(p => linked.includes(p.id)).map(p => ({ id: p.id, label: p.label })),
    { id: 'leaderboard', label: '🏆 Leaderboard' },
  ];

  return (
    <div>
      <VelorisCard coding={veloris} />
      {summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px', marginBottom: '20px' }}>
          {[
            { label: 'Weekly Hours',    value: summary.total_weekly_hours > 0 ? `${summary.total_weekly_hours.toFixed(1)}h` : '0h', color: '#8b5cf6' },
            { label: 'Problems Solved', value: summary.total_problems_solved ?? 0, color: '#22c55e' },
            { label: 'Last Active',     value: timeAgo(summary.last_activity_at), color: (summary.days_since_activity ?? 99) > 7 ? '#ef4444' : '#f59e0b' },
            { label: 'Platforms',       value: `${linked.length}/4`, color: '#4f8ef7' },
          ].map(({ label, value, color }) => (
            <div key={label} className="stat-card" style={{ padding: '14px' }}>
              <div style={{ fontSize: '20px', fontWeight: '700', fontFamily: 'Space Grotesk,sans-serif', color }}>{value}</div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>{label}</div>
            </div>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', gap: '2px', marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.06)', overflowX: 'auto' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ padding: '8px 14px', fontSize: '12px', background: 'transparent', border: 'none', borderBottom: tab === t.id ? '2px solid #5B5BD6' : '2px solid transparent', color: tab === t.id ? '#fff' : 'var(--text-muted)', cursor: 'pointer', marginBottom: '-1px', whiteSpace: 'nowrap', transition: 'color 0.15s' }}>
            {t.label}
          </button>
        ))}
        {isOwnProfile && linked.includes(tab) && (
          <button className="btn btn-ghost" onClick={() => sync(tab)} disabled={!!syncing} style={{ fontSize: '11px', marginLeft: 'auto' }}>
            <RefreshCw size={11} style={{ animation: syncing === tab ? 'spin 1s linear infinite' : 'none' }} />
            {syncing === tab ? 'Syncing…' : 'Sync'}
          </button>
        )}
      </div>
      {tab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '12px' }}>
            {PLATFORMS.map(plat => (
              <PlatformCard key={plat.id} platform={plat.id}
                profile={profiles.find(p => p.platform === plat.id) || null}
                onLinked={onRefresh} onTabSwitch={setTab} isOwn={isOwnProfile} />
            ))}
          </div>
          <div className="card" style={{ padding: '16px' }}>
            <div style={{ fontSize: '12px', fontWeight: '600', marginBottom: '12px' }}>Recent Activity (all platforms)</div>
            <RecentList items={summary?.recent_submissions || []} />
          </div>
        </div>
      )}
      {tab === 'leetcode'    && lc && <LCPanel p={lc} />}
      {tab === 'github'      && gh && <GHPanel p={gh} />}
      {tab === 'codeforces'  && cf && <CFPanel p={cf} />}
      {tab === 'codechef'    && cc && <CCPanel p={cc} />}
      {tab === 'leaderboard' && <LeaderboardTab highlightUserId={null} />}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function StudentProfilePage({ viewMode }) {
  const { userId }         = useParams();
  const [searchParams]     = useSearchParams();
  const isOwnProfile       = !userId && !viewMode;
  const [data,     setData]    = useState(null);
  const [loading,  setLoading] = useState(true);
  const [error,    setError]   = useState('');
  const [activeTab,setActiveTab] = useState(searchParams.get('tab') || 'overview');
  const [editMode, setEditMode] = useState(false);
  const [editFields, setEditFields] = useState({});
  const [saving,   setSaving]  = useState(false);
  const [toast,    setToast]   = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const result = isOwnProfile
        ? await api.profile.getMyProfile()
        : await api.profile.getStudentProfile(userId);
      setData(result);
      setEditFields({
        bio:               result.user?.bio               || '',
        phone:             result.user?.phone             || '',
        linkedin_url:      result.user?.linkedin_url      || '',
        github_url:        result.user?.github_url        || '',
        is_profile_public: result.user?.is_profile_public ?? true,
      });
    } catch { setError('Failed to load profile.'); }
    finally  { setLoading(false); }
  }, [userId, isOwnProfile]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.profile.updateMyProfile(editFields);
      setData(prev => ({ ...prev, user: { ...prev.user, ...editFields } }));
      setEditMode(false);
      setToast({ msg: 'Profile updated', type: 'success' });
    } catch { setToast({ msg: 'Failed to save', type: 'error' }); }
    setSaving(false);
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res = await api.profile.uploadAvatar(fd);
      setData(prev => ({ ...prev, user: { ...prev.user, avatar_url: res.avatar_url } }));
    } catch { setToast({ msg: 'Avatar upload failed', type: 'error' }); }
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <Loader2 size={32} className="animate-spin" style={{ color: '#5B5BD6' }} />
    </div>
  );
  if (error) return <div style={{ padding: '32px', color: '#ef4444', textAlign: 'center' }}>{error}</div>;

  const user        = data?.user        || {};
  const coding      = data?.coding      || {};
  const attendance  = data?.attendance  || {};
  const academics   = data?.academics   || {};
  const internships = data?.internships || [];
  const tier        = getTier(coding.veloris_score ?? 0);
  const viewerRole  = data?.viewer_role;

  const TABS = [
    { id: 'overview',    label: 'Overview'       },
    { id: 'activity',    label: '🔥 Activity'    },
    { id: 'coding',      label: 'Coding'         },
    { id: 'academics',   label: 'Academics'      },
    { id: 'attendance',  label: 'Attendance'     },
    { id: 'internships', label: 'Internships'    },
    { id: 'leaderboard', label: '🏆 Leaderboard' },
  ];

  return (
    <div className="fade-in-up" style={{ maxWidth: '1100px' }}>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {/* View-mode banner */}
      {!isOwnProfile && (
        <div style={{ background: 'rgba(79,142,247,0.1)', border: '1px solid rgba(79,142,247,0.3)', color: '#4f8ef7', padding: '10px 16px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px' }}>
          👁 You are viewing <strong>{user.name}</strong>'s profile (read-only)
        </div>
      )}

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <div className="card" style={{ padding: '24px', marginBottom: '16px', background: `linear-gradient(135deg,rgba(91,91,214,0.12) 0%, var(--bg-elevated) 60%)`, border: '1px solid rgba(91,91,214,0.2)', borderRadius: '12px' }}>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>

          {/* Avatar */}
          <label style={{ cursor: isOwnProfile && editMode ? 'pointer' : 'default', flexShrink: 0 }}>
            {isOwnProfile && editMode && <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarUpload} />}
            <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'linear-gradient(135deg,#5B5BD6,#a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', fontWeight: '700', color: '#fff', border: editMode ? '2px dashed #5B5BD6' : '2px solid rgba(255,255,255,0.15)', overflow: 'hidden', position: 'relative' }}>
              {user.avatar_url
                ? <img src={user.avatar_url} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : (user.name?.[0] || '?').toUpperCase()}
              {editMode && <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.55)', fontSize: '9px', textAlign: 'center', padding: '3px', color: '#fff' }}>Upload</div>}
            </div>
          </label>

          {/* Identity */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px', flexWrap: 'wrap' }}>
              <h1 style={{ margin: 0, fontSize: '22px', fontWeight: '700', fontFamily: 'Space Grotesk,sans-serif', color: 'var(--text-primary)' }}>{user.name || 'Unknown'}</h1>
              <span style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '12px', fontWeight: '600', background: `${tier.color}20`, color: tier.color, border: `1px solid ${tier.color}50` }}>⚡ {tier.label}</span>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>
              {[user.roll_number, user.department, user.year_of_study && `Year ${user.year_of_study}`, user.batch].filter(Boolean).join(' · ')}
            </div>
            <div style={{ fontSize: '13px', marginBottom: '10px' }}>
              <span style={{ color: tier.color, fontWeight: '700', fontSize: '18px', fontFamily: 'Space Grotesk,sans-serif' }}>{coding.veloris_score ?? 0}</span>
              <span style={{ color: 'var(--text-muted)', fontSize: '11px', marginLeft: '6px' }}>Veloris Score</span>
            </div>

            {/* Bio */}
            {editMode ? (
              <textarea value={editFields.bio} onChange={e => setEditFields(f => ({ ...f, bio: e.target.value }))}
                placeholder="Write a short bio..." maxLength={200} rows={2}
                style={{ width: '100%', resize: 'vertical', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '12px', padding: '8px', fontFamily: 'inherit', marginBottom: '10px' }} />
            ) : (
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 10px', lineHeight: '1.5' }}>
                {user.bio || (isOwnProfile ? 'No bio yet — click Edit Profile to add one.' : '')}
              </p>
            )}

            {/* Edit fields */}
            {editMode ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                {[
                  { key: 'linkedin_url', placeholder: 'LinkedIn URL (https://linkedin.com/in/...)' },
                  { key: 'github_url',   placeholder: 'GitHub URL (https://github.com/...)'       },
                  { key: 'phone',        placeholder: 'Phone'                                      },
                ].map(({ key, placeholder }) => (
                  <input key={key} className="input" placeholder={placeholder} value={editFields[key]}
                    onChange={e => setEditFields(f => ({ ...f, [key]: e.target.value }))}
                    style={{ fontSize: '12px' }} />
                ))}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Public profile</span>
                  <div onClick={() => setEditFields(f => ({ ...f, is_profile_public: !f.is_profile_public }))}
                    style={{ width: '36px', height: '20px', borderRadius: '10px', cursor: 'pointer', background: editFields.is_profile_public ? '#22c55e' : 'rgba(255,255,255,0.15)', position: 'relative', transition: 'all 0.2s' }}>
                    <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: '#fff', position: 'absolute', top: '2px', left: editFields.is_profile_public ? '18px' : '2px', transition: 'left 0.2s' }} />
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                {user.linkedin_url && <a href={user.linkedin_url} target="_blank" rel="noreferrer" style={{ fontSize: '11px', color: '#4f8ef7', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>🔗 LinkedIn <ExternalLink size={10} /></a>}
                {user.github_url   && <a href={user.github_url}   target="_blank" rel="noreferrer" style={{ fontSize: '11px', color: '#8b949e', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>🐙 GitHub <ExternalLink size={10} /></a>}
                {user.email        && <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>📧 {user.email}</span>}
                {!isOwnProfile     && <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>👁 {user.profile_views ?? 0} views</span>}
              </div>
            )}
          </div>

          {/* Edit / Save buttons */}
          {isOwnProfile && (
            <div style={{ flexShrink: 0 }}>
              {editMode ? (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="btn btn-primary" onClick={handleSave} disabled={saving} style={{ fontSize: '12px' }}>
                    {saving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} {saving ? 'Saving…' : 'Save'}
                  </button>
                  <button className="btn btn-ghost" onClick={() => setEditMode(false)} style={{ fontSize: '12px' }}>Cancel</button>
                </div>
              ) : (
                <button className="btn btn-ghost" onClick={() => setEditMode(true)} style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Edit3 size={12} /> Edit Profile
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── QUICK STATS ROW ──────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: '10px', marginBottom: '16px', overflowX: 'auto' }}>
        {[
          { label: 'Veloris Score',    value: coding.veloris_score ?? 0,                                                                    color: tier.color },
          { label: 'Problems Solved',  value: coding.summary?.total_problems_solved ?? 0,                                                   color: '#22c55e'  },
          { label: 'Attendance',       value: attendance.overall_percentage != null ? `${attendance.overall_percentage}%` : '—',            color: (attendance.overall_percentage ?? 0) >= 75 ? '#22c55e' : (attendance.overall_percentage ?? 0) >= 60 ? '#f59e0b' : '#ef4444' },
          { label: 'CGPA',             value: academics.cgpa ?? '—',                                                                        color: '#4f8ef7'  },
          { label: 'Last Active',      value: timeAgo(coding.summary?.last_activity_at),                                                    color: 'var(--text-primary)' },
        ].map(({ label, value, color }) => (
          <div key={label} className="stat-card" style={{ padding: '12px', textAlign: 'center', minWidth: '100px' }}>
            <div style={{ fontSize: '18px', fontWeight: '700', color, fontFamily: 'Space Grotesk,sans-serif' }}>{value}</div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* ── SECTION TABS ─────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: '2px', marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.06)', overflowX: 'auto', position: 'sticky', top: 0, zIndex: 10, background: 'var(--bg-primary)', paddingTop: '8px', backdropFilter: 'blur(8px)' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            style={{ padding: '8px 14px', fontSize: '12px', background: 'transparent', border: 'none', borderBottom: activeTab === t.id ? '2px solid #5B5BD6' : '2px solid transparent', color: activeTab === t.id ? '#fff' : 'var(--text-muted)', cursor: 'pointer', marginBottom: '-1px', whiteSpace: 'nowrap', transition: 'color 0.15s' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── TAB CONTENT ──────────────────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <OverviewTab coding={coding} attendance={attendance} academics={academics}
          internships={internships} tier={tier} onTabSwitch={setActiveTab} />
      )}
      {activeTab === 'activity' && (
        <ActivityHeatmap codingData={coding} />
      )}
      {activeTab === 'coding' && (
        <CodingTab codingData={coding} isOwnProfile={isOwnProfile} onRefresh={fetchData} />
      )}
      {activeTab === 'academics' && (
        <AcademicsTab academics={academics} />
      )}
      {activeTab === 'attendance' && (
        <AttendanceTab attendance={attendance} />
      )}
      {activeTab === 'internships' && (
        <InternshipsTab internships={internships} isOwn={isOwnProfile}
          viewerRole={viewerRole} onRefresh={fetchData} />
      )}
      {activeTab === 'leaderboard' && (
        <LeaderboardTab highlightUserId={!isOwnProfile ? Number(userId) : null} />
      )}

      <style>{`
        @keyframes spin  { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { opacity:.4; } 50% { opacity:.8; } }
        @media (max-width:768px) { .profile-bento { grid-template-columns:1fr !important; } }
      `}</style>
    </div>
  );
}
