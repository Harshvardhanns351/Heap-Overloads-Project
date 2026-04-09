import React, { useState, useEffect } from 'react';
import { PageHeader, ProgressBar } from '../../components/UI';
import { Code2, TrendingUp, Zap, Award, ExternalLink, Check, RefreshCw, Loader2, GitCommit, Clock } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { api } from '../../api';

const PLATFORMS = [
  { id: 'leetcode',   label: 'LeetCode',   color: '#f59e0b', placeholder: 'your_username' },
  { id: 'github',     label: 'GitHub',     color: '#6e7681', placeholder: 'github_username' },
  { id: 'codeforces', label: 'Codeforces', color: '#4f8ef7', placeholder: 'cf_handle' },
  { id: 'codechef',   label: 'CodeChef',   color: '#5b4638', placeholder: 'cc_username' },
];

const PLATFORM_COLORS = { leetcode: '#f59e0b', github: '#6e7681', codeforces: '#4f8ef7', codechef: '#5b4638' };

function timeAgo(iso) {
  if (!iso) return 'Never';
  const diff = Date.now() - new Date(iso).getTime();
  const d = Math.floor(diff / 86400000);
  if (d === 0) return 'Today';
  if (d === 1) return 'Yesterday';
  if (d < 7) return `${d}d ago`;
  if (d < 30) return `${Math.floor(d / 7)}w ago`;
  return `${Math.floor(d / 30)}mo ago`;
}

// ── Link form for a single platform ──────────────────────────────────────────
function LinkForm({ platform, onLinked }) {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const p = PLATFORMS.find(p => p.id === platform);

  const handleLink = async () => {
    if (!username.trim()) return;
    setLoading(true); setError('');
    try {
      const syncFn = {
        leetcode: () => api.coding.syncLeetcode(username.trim()),
        github: () => api.coding.syncGithub(username.trim()),
        codeforces: () => api.coding.syncCodeforces(username.trim()),
        codechef: () => api.coding.syncCodechef(username.trim()),
      }[platform];
      await syncFn();
      onLinked();
    } catch (e) {
      setError('Username not found or API unavailable.');
    }
    setLoading(false);
  };

  return (
    <div style={{ padding: '24px', maxWidth: '420px' }}>
      <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>Link {p?.label}</div>
      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px' }}>Enter your {p?.label} username to sync stats</div>
      <div style={{ display: 'flex', gap: '8px' }}>
        <input className="input" placeholder={p?.placeholder} value={username}
          onChange={e => setUsername(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !loading && username.trim() && handleLink()}
          style={{ flex: 1 }} />
        <button className="btn btn-primary" disabled={loading || !username.trim()} onClick={handleLink} style={{ fontSize: '12px', whiteSpace: 'nowrap' }}>
          {loading ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
          {loading ? 'Linking...' : 'Link'}
        </button>
      </div>
      {error && <div style={{ fontSize: '11px', color: '#ef4444', marginTop: '8px' }}>{error}</div>}
    </div>
  );
}

// ── Recent submissions list ───────────────────────────────────────────────────
function RecentSubmissions({ submissions }) {
  if (!submissions?.length) return <div style={{ fontSize: '12px', color: 'var(--text-muted)', padding: '12px 0' }}>No recent activity</div>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {submissions.map((s, i) => (
        <a key={i} href={s.url || '#'} target="_blank" rel="noreferrer"
          style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', textDecoration: 'none', color: 'var(--text-primary)' }}>
          <span style={{ fontSize: '9px', padding: '2px 6px', borderRadius: '4px', background: `${PLATFORM_COLORS[s.platform] || '#555'}22`, color: PLATFORM_COLORS[s.platform] || '#aaa', whiteSpace: 'nowrap' }}>{s.platform}</span>
          <span style={{ flex: 1, fontSize: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.title}</span>
          <span style={{ fontSize: '10px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{timeAgo(s.time)}</span>
          <ExternalLink size={10} color="var(--text-muted)" />
        </a>
      ))}
    </div>
  );
}

// ── Platform detail panels ────────────────────────────────────────────────────
function LeetCodePanel({ p, onSync, syncing }) {
  const skillData = [
    { tag: 'Easy', solved: p.easy, color: '#22c55e' },
    { tag: 'Medium', solved: p.medium, color: '#f59e0b' },
    { tag: 'Hard', solved: p.hard, color: '#ef4444' },
  ];
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px', marginBottom: '20px' }}>
        {[{ label: 'Total', value: p.solved_total, color: '#4f8ef7' }, { label: 'Easy', value: p.easy, color: '#22c55e' }, { label: 'Medium', value: p.medium, color: '#f59e0b' }, { label: 'Hard', value: p.hard, color: '#ef4444' }].map(({ label, value, color }) => (
          <div key={label} className="stat-card" style={{ textAlign: 'center', padding: '14px' }}>
            <div style={{ fontSize: '22px', fontWeight: '700', fontFamily: 'Space Grotesk, sans-serif', color }}>{value}</div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>{label}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div className="card" style={{ padding: '16px' }}>
          <div style={{ fontSize: '12px', fontWeight: '600', marginBottom: '12px' }}>Difficulty Breakdown</div>
          {skillData.map(({ tag, solved, color }) => (
            <div key={tag} style={{ marginBottom: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ fontSize: '11px' }}>{tag}</span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{solved}</span>
              </div>
              <ProgressBar value={solved} max={Math.max(p.solved_total, 1)} color={color} height={4} />
            </div>
          ))}
        </div>
        <div className="card" style={{ padding: '16px' }}>
          <div style={{ fontSize: '12px', fontWeight: '600', marginBottom: '12px' }}>By Difficulty</div>
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={skillData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="tag" tick={{ fill: '#8b8ba0', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#8b8ba0', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '11px' }} />
              <Bar dataKey="solved" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function GitHubPanel({ p }) {
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '12px', marginBottom: '20px' }}>
        {[
          { label: 'Public Repos', value: p.public_repos },
          { label: 'Commits (year)', value: p.total_commits_year },
          { label: 'Top Language', value: p.top_language || '—' },
        ].map(({ label, value }) => (
          <div key={label} className="stat-card" style={{ textAlign: 'center', padding: '14px' }}>
            <div style={{ fontSize: '20px', fontWeight: '700', fontFamily: 'Space Grotesk, sans-serif', color: '#6e7681' }}>{value}</div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>{label}</div>
          </div>
        ))}
      </div>
      <div className="card" style={{ padding: '16px' }}>
        <div style={{ fontSize: '12px', fontWeight: '600', marginBottom: '12px' }}>Recent Commits</div>
        <RecentSubmissions submissions={p.recent_submissions} />
      </div>
    </div>
  );
}

function CodeforcesPanel({ p }) {
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '12px', marginBottom: '20px' }}>
        {[
          { label: 'Rating', value: p.cf_rating || '—' },
          { label: 'Rank', value: p.cf_rank || '—' },
          { label: 'Problems Solved', value: p.cf_problems_solved },
        ].map(({ label, value }) => (
          <div key={label} className="stat-card" style={{ textAlign: 'center', padding: '14px' }}>
            <div style={{ fontSize: '20px', fontWeight: '700', fontFamily: 'Space Grotesk, sans-serif', color: '#4f8ef7' }}>{value}</div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>{label}</div>
          </div>
        ))}
      </div>
      <div className="card" style={{ padding: '16px' }}>
        <div style={{ fontSize: '12px', fontWeight: '600', marginBottom: '12px' }}>Recent AC Submissions</div>
        <RecentSubmissions submissions={p.recent_submissions} />
      </div>
    </div>
  );
}

function CodeChefPanel({ p }) {
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '12px', marginBottom: '20px' }}>
        {[
          { label: 'Rating', value: p.cc_rating || '—' },
          { label: 'Stars', value: p.cc_stars || '—' },
          { label: 'Problems Solved', value: p.cc_problems_solved },
        ].map(({ label, value }) => (
          <div key={label} className="stat-card" style={{ textAlign: 'center', padding: '14px' }}>
            <div style={{ fontSize: '20px', fontWeight: '700', fontFamily: 'Space Grotesk, sans-serif', color: '#cd7f32' }}>{value}</div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>{label}</div>
          </div>
        ))}
      </div>
      <div className="card" style={{ padding: '16px' }}>
        <div style={{ fontSize: '12px', fontWeight: '600', marginBottom: '12px' }}>Recent Contests</div>
        <RecentSubmissions submissions={p.recent_submissions} />
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function CodingProfile() {
  const [profiles, setProfiles] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [syncing, setSyncing] = useState('');

  const fetchAll = async () => {
    try {
      const [profs, sum] = await Promise.all([api.coding.getProfiles(), api.coding.getSummary()]);
      setProfiles(Array.isArray(profs) ? profs : []);
      setSummary(sum);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const handleSync = async (platform) => {
    const p = profiles.find(x => x.platform === platform);
    if (!p) return;
    setSyncing(platform);
    try {
      const syncFn = {
        leetcode: () => api.coding.syncLeetcode(p.username),
        github: () => api.coding.syncGithub(p.username),
        codeforces: () => api.coding.syncCodeforces(p.username),
        codechef: () => api.coding.syncCodechef(p.username),
      }[platform];
      await syncFn();
      await fetchAll();
    } catch (e) { console.error(e); }
    setSyncing('');
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
    </div>
  );

  const linkedPlatforms = profiles.map(p => p.platform);
  const tabs = ['overview', ...linkedPlatforms, 'link'];

  const lc = profiles.find(p => p.platform === 'leetcode');
  const gh = profiles.find(p => p.platform === 'github');
  const cf = profiles.find(p => p.platform === 'codeforces');
  const cc = profiles.find(p => p.platform === 'codechef');

  return (
    <div className="fade-in-up">
      <PageHeader
        title="Coding Profile"
        subtitle="Track your activity across LeetCode, GitHub, Codeforces & CodeChef"
        action={
          activeTab !== 'overview' && activeTab !== 'link' && (
            <button className="btn btn-ghost" onClick={() => handleSync(activeTab)} disabled={!!syncing} style={{ fontSize: '12px', gap: '6px' }}>
              <RefreshCw size={12} style={{ animation: syncing === activeTab ? 'spin 1s linear infinite' : 'none' }} />
              {syncing === activeTab ? 'Syncing...' : 'Sync'}
            </button>
          )
        }
      />

      {/* Summary bar */}
      {summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px', marginBottom: '20px' }}>
          {[
            { label: 'Weekly Coding Hours', value: `${summary.total_weekly_hours}h`, color: '#8b5cf6' },
            { label: 'Total Problems Solved', value: summary.total_problems_solved, color: '#22c55e' },
            { label: 'Last Active', value: timeAgo(summary.last_activity_at), color: summary.days_since_activity > 7 ? '#ef4444' : '#f59e0b' },
            { label: 'Platforms Linked', value: `${linkedPlatforms.length}/4`, color: '#4f8ef7' },
          ].map(({ label, value, color }) => (
            <div key={label} className="stat-card" style={{ padding: '14px' }}>
              <div style={{ fontSize: '20px', fontWeight: '700', fontFamily: 'Space Grotesk, sans-serif', color }}>{value}</div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '0' }}>
        {[
          { id: 'overview', label: 'Overview' },
          ...PLATFORMS.filter(p => linkedPlatforms.includes(p.id)).map(p => ({ id: p.id, label: p.label })),
          { id: 'link', label: '+ Link Platform' },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            style={{ padding: '8px 14px', fontSize: '12px', background: 'transparent', border: 'none', borderBottom: activeTab === tab.id ? '2px solid #5B5BD6' : '2px solid transparent', color: activeTab === tab.id ? '#fff' : 'var(--text-muted)', cursor: 'pointer', marginBottom: '-1px' }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'overview' && (
        <div>
          {profiles.length === 0 ? (
            <div className="card" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
              No platforms linked yet. Click "+ Link Platform" to get started.
            </div>
          ) : (
            <div>
              {/* Platform cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: '12px', marginBottom: '20px' }}>
                {profiles.map(p => {
                  const meta = PLATFORMS.find(x => x.id === p.platform);
                  const mainStat = p.platform === 'leetcode' ? `${p.solved_total} solved`
                    : p.platform === 'github' ? `${p.total_commits_year} commits`
                    : p.platform === 'codeforces' ? `${p.cf_rating} rating`
                    : `${p.cc_rating} rating`;
                  return (
                    <div key={p.id} className="card" style={{ padding: '16px', cursor: 'pointer', borderColor: activeTab === p.platform ? meta?.color : undefined }}
                      onClick={() => setActiveTab(p.platform)}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                        <div style={{ fontSize: '12px', fontWeight: '600' }}>{meta?.label}</div>
                        <a href={`https://${p.platform === 'github' ? 'github.com' : p.platform === 'codeforces' ? 'codeforces.com/profile' : p.platform === 'codechef' ? 'codechef.com/users' : 'leetcode.com'}/${p.username}`}
                          target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}>
                          <ExternalLink size={12} color="var(--text-muted)" />
                        </a>
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px' }}>@{p.username}</div>
                      <div style={{ fontSize: '18px', fontWeight: '700', color: meta?.color, fontFamily: 'Space Grotesk, sans-serif' }}>{mainStat}</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <Clock size={9} /> {timeAgo(p.last_activity_at)}
                        </span>
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{p.estimated_weekly_hours}h/wk</span>
                      </div>
                    </div>
                  );
                })}
              </div>
              {/* All recent activity */}
              <div className="card" style={{ padding: '16px' }}>
                <div style={{ fontSize: '12px', fontWeight: '600', marginBottom: '12px' }}>Recent Activity (all platforms)</div>
                <RecentSubmissions submissions={summary?.recent_submissions || []} />
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'leetcode' && lc && <LeetCodePanel p={lc} onSync={() => handleSync('leetcode')} syncing={syncing === 'leetcode'} />}
      {activeTab === 'github' && gh && <GitHubPanel p={gh} />}
      {activeTab === 'codeforces' && cf && <CodeforcesPanel p={cf} />}
      {activeTab === 'codechef' && cc && <CodeChefPanel p={cc} />}

      {activeTab === 'link' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: '16px' }}>
          {PLATFORMS.filter(p => !linkedPlatforms.includes(p.id)).map(p => (
            <div key={p.id} className="card" style={{ padding: '0' }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', fontSize: '12px', fontWeight: '600', color: p.color }}>{p.label}</div>
              <LinkForm platform={p.id} onLinked={() => { fetchAll(); setActiveTab(p.id); }} />
            </div>
          ))}
          {PLATFORMS.filter(p => !linkedPlatforms.includes(p.id)).length === 0 && (
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', padding: '16px' }}>All platforms linked ✓</div>
          )}
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
