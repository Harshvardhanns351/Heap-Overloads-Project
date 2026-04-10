import React, { useEffect, useState } from 'react';
import useAppStore from '../../store';
import { StatCard, PageHeader, ProgressBar } from '../../components/UI';
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer,
} from 'recharts';
import { Activity, BookOpen, Code2, Zap, TrendingUp, Timer, Loader2 } from 'lucide-react';

export default function StudentDashboard() {
  const {
    currentUser,
    marks, riskScore, roadmapNodes, assignments, sprintStats, codingSummary,
    fetchMarks, fetchRiskScore, fetchRoadmap, fetchSprintStats, fetchAssignments, fetchCodingSummary,
  } = useAppStore();

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetchMarks(), fetchRiskScore(), fetchRoadmap(), fetchSprintStats(), fetchAssignments(), fetchCodingSummary(),
    ]).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
      </div>
    );
  }

  const name = currentUser?.name?.split(' ')[0] || 'Student';
  const completedNodes = roadmapNodes?.filter(n => n.status === 'completed').length || 0;
  const totalNodes = roadmapNodes?.length || 0;

  const subjectScores = {};
  marks?.forEach(m => {
    if (m.max_score > 0) subjectScores[m.subject] = Math.round((m.score / m.max_score) * 100);
  });

  const radarData = Object.entries(subjectScores).map(([subject, score]) => ({ subject, score }));
  const pendingAssignments = assignments?.filter(a => a.submission_status !== 'submitted').length || 0;
  const overdueAssignments = assignments?.filter(a => {
    if (a.submission_status === 'submitted') return false;
    return new Date(a.deadline) < new Date();
  }).length || 0;

  const riskLevel = riskScore?.level || 'GREEN';
  const riskColor = riskLevel === 'RED' ? 'var(--status-err)' : riskLevel === 'YELLOW' ? 'var(--status-warn)' : 'var(--status-ok)';
  const sprintHours = Math.round((sprintStats?.this_week_minutes || 0) / 60);
  const codingHours = codingSummary?.total_weekly_hours || 0;
  const studyHours = +(sprintHours + codingHours).toFixed(1);
  const totalProblems = codingSummary?.total_problems_solved || 0;
  const recentActivity = codingSummary?.recent_submissions?.slice(0, 3) || [];

  return (
    <div className="fade-in-up">
      <PageHeader
        title={`Good morning, ${name} 👋`}
        subtitle="Here's your academic snapshot for today."
      />

      {currentUser?.pending_nudge && (
        <div style={{ padding: '14px 18px', marginBottom: '24px', display: 'flex', alignItems: 'flex-start', gap: '12px', background: 'rgba(255,255,255,0.04)', borderRadius: '12px', borderLeft: '3px solid rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ width: '30px', height: '30px', background: 'rgba(255,255,255,0.06)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Zap size={14} color="rgba(255,255,255,0.5)" />
          </div>
          <div>
            <div style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Your Veloris nudge</div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>{currentUser.pending_nudge}</div>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <StatCard label="Wellbeing Risk" value={riskLevel} sub={riskScore ? `Score: ${riskScore.score}/100` : 'Calculated nightly'} color={riskColor} icon={Activity} />
        <StatCard label="Roadmap Progress" value={`${completedNodes}/${totalNodes}`} sub="Nodes completed" color="rgba(255,255,255,0.5)" icon={TrendingUp} />
        <StatCard label="Study Time" value={`${studyHours}h`} sub="This week (sprints + coding)" color="rgba(255,255,255,0.5)" icon={Timer} />
        <StatCard label="Problems Solved" value={totalProblems || pendingAssignments} sub={totalProblems ? "Across all platforms" : (overdueAssignments > 0 ? `${overdueAssignments} overdue` : 'All on track')} color={totalProblems ? 'var(--accent)' : (pendingAssignments > 0 ? 'var(--status-err)' : 'var(--status-ok)')} icon={totalProblems ? Code2 : BookOpen} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>Subject Performance</div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '16px' }}>Your scores · out of 100</div>
          {radarData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="rgba(255,255,255,0.05)" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#8b8ba0', fontSize: 11 }} />
                <Radar dataKey="score" stroke="rgba(255,255,255,0.5)" fill="rgba(255,255,255,0.05)" fillOpacity={1} strokeWidth={1.5} dot={{ fill: 'rgba(255,255,255,0.6)', r: 3 }} />
              </RadarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[200px] text-slate-500 text-sm">Upload a marksheet to see your radar</div>
          )}
        </div>

        <div className="card" style={{ padding: '20px' }}>
          <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>Weekly Activity</div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '16px' }}>Sprints + coding platforms</div>
          <div className="flex items-center justify-center" style={{ height: '120px' }}>
            <div className="text-center">
              <div style={{ fontSize: '52px', fontWeight: '500', color: 'rgba(255,255,255,0.7)', fontFamily: 'Space Grotesk, sans-serif' }}>{studyHours}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>hours this week</div>
              {sprintStats?.total_sprints > 0 && (
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{sprintStats.total_sprints} sprints · {codingHours}h coding</div>
              )}
            </div>
          </div>
          {recentActivity.length > 0 && (
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '12px', marginTop: '4px' }}>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Recent commits / submissions</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {recentActivity.map((s, i) => (
                  <a key={i} href={s.url || '#'} target="_blank" rel="noreferrer"
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: 'var(--text-secondary)', textDecoration: 'none' }}>
                    <span style={{ fontSize: '9px', padding: '1px 5px', borderRadius: '4px', background: 'rgba(255,255,255,0.06)', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{s.platform}</span>
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.title}</span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '16px' }}>Subject Breakdown</div>
          {Object.keys(subjectScores).length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {Object.entries(subjectScores).map(([sub, score]) => (
                <div key={sub}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '12px', fontWeight: '500' }}>{sub}</span>
                    <span style={{ fontSize: '12px', color: score < 60 ? 'var(--status-err)' : score < 75 ? 'var(--status-warn)' : 'var(--status-ok)', fontWeight: '600' }}>{score}%</span>
                  </div>
                  <ProgressBar value={score} color={score < 60 ? 'var(--status-err)' : score < 75 ? 'var(--status-warn)' : 'var(--status-ok)'} height={5} />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-slate-500 text-sm text-center py-8">Upload a marksheet to see your subjects</div>
          )}
        </div>

        <div className="card" style={{ padding: '20px' }}>
          <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '16px' }}>Recent Assignments</div>
          {assignments && assignments.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {assignments.slice(0, 4).map((a) => (
                <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', background: 'var(--bg-elevated)', borderRadius: '8px' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '12px', fontWeight: '500', marginBottom: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.title}</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{a.subject} · Due {new Date(a.deadline).toLocaleDateString()}</div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap ${a.submission_status === 'submitted' ? 'badge-green' : a.submission_status === 'late' ? 'badge-red' : 'badge-yellow'}`}>
                    {a.submission_status || 'pending'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-slate-500 text-sm text-center py-8">No assignments yet</div>
          )}
        </div>
      </div>
    </div>
  );
}
