import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ProgressBar } from '../../components/UI';
import {
  ExternalLink, Check, RefreshCw, Loader2, Clock,
  ChevronLeft, Trophy, Link2,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { api } from '../../api';

// ── Constants ─────────────────────────────────────────────────────────────────
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

// ── Veloris Score Card ────────────────────────────────────────────────────────
function VelorisCard({ score }) {
  const [open, setOpen] = useState(false);
  if (!score) return null;
  const total = score.veloris_score ?? 0;
  const tier  = getTier(total);
  const bd    = score.breakdown ?? {};
  const segs  = [
    { label: 'LeetCode',   val: bd.lc ?? 0,       max: 350, color: '#f59e0b' },
    { label: 'Codeforces', val: bd.cf ?? 0,       max: 250, color: '#4f8ef7' },
    { label: 'CodeChef',   val: bd.cc ?? 0,       max: 150, color: '#cd7f32' },
    { label: 'GitHub',     val: bd.gh ?? 0,       max: 150, color: '#8b949e' },
    { label: 'Activity',   val: bd.activity ?? 0, max: 100, color: '#22c55e' },
  ];
  return (
    <div className="card" onClick={() => setOpen(o => !o)}
      style={{ padding: '16px 20px', marginBottom: '20px', cursor: 'pointer', border: `1px solid ${tier.color}30`, background: `linear-gradient(135deg,var(--bg-elevated),${tier.color}10)` }}>
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

// ── Link Form ─────────────────────────────────────────────────────────────────
function LinkForm({ platform, onLinked, compact }) {
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
    <div style={{ padding: compact ? '12px' : '20px' }}>
      {!compact && <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '10px' }}>Enter your {meta?.label} username</div>}
      <div style={{ display: 'flex', gap: '8px' }}>
        <input className="input" placeholder={`@${meta?.placeholder}`} value={val} onChange={e => setVal(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !busy && val.trim() && submit()} style={{ flex: 1, fontSize: '12px' }} autoFocus={compact} />
        <button className="btn btn-primary" disabled={busy || !val.trim()} onClick={submit} style={{ fontSize: '12px', whiteSpace: 'nowrap' }}>
          {busy ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
          {busy ? 'Linking…' : 'Save'}
        </button>
      </div>
      {err && <div style={{ fontSize: '11px', color: '#ef4444', marginTop: '6px' }}>{err}</div>}
    </div>
  );
}

// ── Platform Connect Card (2×2 grid) ─────────────────────────────────────────
function PlatformCard({ platform, profile, onLinked, onTabSwitch }) {
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
  return (
    <div className="card" style={{ border: '1px dashed rgba(255,255,255,0.10)', background: 'rgba(255,255,255,0.015)', overflow: 'hidden' }}>
      {!showForm ? (
        <div style={{ padding: '20px', textAlign: 'center', cursor: 'pointer' }} onClick={() => setShowForm(true)}>
          <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: `${meta.color}15`, border: `1px solid ${meta.color}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
            <Link2 size={16} color={meta.color} style={{ opacity: 0.7 }} />
          </div>
          <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '8px' }}>{meta.label}</div>
          <button className="btn" style={{ fontSize: '11px', padding: '5px 14px', background: `${meta.color}15`, color: meta.color, border: `1px solid ${meta.color}35` }}
            onClick={e => { e.stopPropagation(); setShowForm(true); }}>+ Connect</button>
        </div>
      ) : (
        <div>
          <div style={{ padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: '600', color: meta.color }}>{meta.label}</span>
            <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '11px' }}>Cancel</button>
          </div>
          <LinkForm platform={platform} compact onLinked={() => { setShowForm(false); onLinked(); }} />
        </div>
      )}
    </div>
  );
}

// ── Recent Submissions ────────────────────────────────────────────────────────
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

// ── Leaderboard ───────────────────────────────────────────────────────────────
function Leaderboard() {
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
      {[...Array(5)].map((_, i) => <div key={i} style={{ height: '56px', borderRadius: '8px', background: 'rgba(255,255,255,0.04)', animation: 'pulse 1.5s ease-in-out infinite', animationDelay: `${i*0.1}s` }} />)}
    </div>
  );
  if (!board.length) return (
    <div className="card" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
      <Trophy size={28} style={{ margin: '0 auto 12px', opacity: 0.3, display: 'block' }} />
      No profiles ranked yet — link your platforms to appear here.
    </div>
  );

  const me = board.find(r => r.is_me);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {me && (
        <div style={{ padding: '12px 16px', borderRadius: '10px', background: `${getTier(me.veloris_score??0).color}15`, border: `1px solid ${getTier(me.veloris_score??0).color}40` }}>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '4px' }}>Your Rank</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '22px', fontWeight: '800', fontFamily: 'Space Grotesk', color: getTier(me.veloris_score??0).color }}>#{me.rank}</span>
            <span style={{ fontSize: '16px', fontWeight: '700', color: getTier(me.veloris_score??0).color }}>{me.veloris_score} pts</span>
            <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '12px', background: `${getTier(me.veloris_score??0).color}20`, color: getTier(me.veloris_score??0).color, border: `1px solid ${getTier(me.veloris_score??0).color}40` }}>⚡ {getTier(me.veloris_score??0).label}</span>
          </div>
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: '44px 1fr 110px 80px 80px 80px', gap: '8px', padding: '4px 12px', fontSize: '10px', color: 'var(--text-muted)', fontWeight: '600', letterSpacing: '0.05em' }}>
        <span>RANK</span><span>STUDENT</span><span>SCORE</span><span style={{ textAlign: 'center' }}>PROBLEMS</span><span style={{ textAlign: 'center' }}>CF</span><span style={{ textAlign: 'right' }}>ACTIVE</span>
      </div>
      {board.map(row => {
        const tier = getTier(row.veloris_score ?? 0);
        return (
          <div key={row.rank} style={{ display: 'grid', gridTemplateColumns: '44px 1fr 110px 80px 80px 80px', gap: '8px', padding: '10px 12px', borderRadius: '8px', background: row.is_me ? `${tier.color}12` : 'rgba(255,255,255,0.02)', border: row.is_me ? `1px solid ${tier.color}40` : '1px solid rgba(255,255,255,0.05)', borderLeft: row.is_me ? `3px solid ${tier.color}` : undefined, alignItems: 'center' }}>
            <span style={{ fontSize: row.rank <= 3 ? '18px' : '13px', fontWeight: '700', textAlign: 'center' }}>{MEDAL[row.rank] || `#${row.rank}`}</span>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: '13px', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {row.name || 'Anonymous'}{row.is_me && <span style={{ marginLeft: '6px', fontSize: '9px', color: tier.color }}>(you)</span>}
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

// ── Main Export ───────────────────────────────────────────────────────────────
export default function CodingProfile() {
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState([]);
  const [summary, setSummary] = useState(null);
  const [veloris, setVeloris] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview');
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

  const sync = async (platform) => {
    const p = profiles.find(x => x.platform === platform);
    if (!p) return;
    setSyncing(platform);
    try {
      await { leetcode: () => api.coding.syncLeetcode(p.username), github: () => api.coding.syncGithub(p.username), codeforces: () => api.coding.syncCodeforces(p.username), codechef: () => api.coding.syncCodechef(p.username) }[platform]();
      await fetchAll();
    } catch (e) { console.error(e); }
    setSyncing('');
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-violet-500" /></div>;

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
    <div className="fade-in-up">
      {/* Back */}
      <button onClick={() => navigate(-1)} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '12px', padding: '0 0 12px 0', transition: 'color 0.15s' }}
        onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
        onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}>
        <ChevronLeft size={14} /> Back
      </button>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
        <div>
          <div style={{ fontFamily: 'Space Grotesk,sans-serif', fontSize: '22px', fontWeight: '700', marginBottom: '4px' }}>Coding Profile</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Track your activity across LeetCode, GitHub, Codeforces & CodeChef</div>
        </div>
        {linked.includes(tab) && (
          <button className="btn btn-ghost" onClick={() => sync(tab)} disabled={!!syncing} style={{ fontSize: '12px', gap: '6px' }}>
            <RefreshCw size={12} style={{ animation: syncing === tab ? 'spin 1s linear infinite' : 'none' }} />
            {syncing === tab ? 'Syncing...' : 'Sync'}
          </button>
        )}
      </div>

      {/* Veloris Score */}
      <VelorisCard score={veloris} />

      {/* Stats row */}
      {summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px', marginBottom: '20px' }}>
          {[
            { label: 'Weekly Coding Hours', value: safeH(summary.total_weekly_hours), color: summary.total_weekly_hours > 0 ? '#8b5cf6' : 'var(--text-muted)' },
            { label: 'Total Problems Solved', value: summary.total_problems_solved ?? 0, color: '#22c55e' },
            { label: 'Last Active', value: timeAgo(summary.last_activity_at), color: (summary.days_since_activity ?? 99) > 7 ? '#ef4444' : '#f59e0b' },
            { label: 'Platforms Linked', value: `${linked.length}/4`, color: '#4f8ef7' },
          ].map(({ label, value, color }) => (
            <div key={label} className="stat-card" style={{ padding: '14px' }}>
              <div style={{ fontSize: '20px', fontWeight: '700', fontFamily: 'Space Grotesk,sans-serif', color }}>{value}</div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '2px', marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.06)', overflowX: 'auto' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ padding: '8px 14px', fontSize: '12px', background: 'transparent', border: 'none', borderBottom: tab === t.id ? '2px solid #5B5BD6' : '2px solid transparent', color: tab === t.id ? '#fff' : 'var(--text-muted)', cursor: 'pointer', marginBottom: '-1px', whiteSpace: 'nowrap', transition: 'color 0.15s' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '12px' }}>
            {PLATFORMS.map(plat => (
              <PlatformCard key={plat.id} platform={plat.id}
                profile={profiles.find(p => p.platform === plat.id) || null}
                onLinked={() => { fetchAll(); setTab(plat.id); }}
                onTabSwitch={setTab} />
            ))}
          </div>
          <div className="card" style={{ padding: '16px' }}>
            <div style={{ fontSize: '12px', fontWeight: '600', marginBottom: '12px' }}>Recent Activity (all platforms)</div>
            <RecentList items={summary?.recent_submissions || []} />
          </div>
        </div>
      )}

      {tab === 'leetcode'   && lc && <LCPanel p={lc} />}
      {tab === 'github'     && gh && <GHPanel p={gh} />}
      {tab === 'codeforces' && cf && <CFPanel p={cf} />}
      {tab === 'codechef'   && cc && <CCPanel p={cc} />}
      {tab === 'leaderboard' && <Leaderboard />}

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}@keyframes pulse{0%,100%{opacity:.4}50%{opacity:.8}}`}</style>
    </div>
  );
}
