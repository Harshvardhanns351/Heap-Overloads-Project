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
  const riskColor = riskLevel === 'RED' ? '#ef4444' : riskLevel === 'YELLOW' ? '#f59e0b' : '#22c55e';
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
        <div style={{ padding: '14px 18px', marginBottom: '24px', display: 'flex', alignItems: 'flex-start', gap: '12px', background: '#FAEEDA', borderRadius: '12px', borderLeft: '4px solid #EF9F27' }}>
          <div style={{ width: '32px', height: '32px', background: 'rgba(239,159,39,0.2)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Zap size={15} color="#EF9F27" />
          </div>
          <div>
            <div style={{ fontSize: '11px', fontWeight: '600', color: '#854F0B', marginBottom: '2px' }}>Your Veloris nudge</div>
            <div style={{ fontSize: '13px', color: '#1a1a1a', lineHeight: '1.5' }}>{currentUser.pending_nudge}</div>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <StatCard label="Wellbeing Risk" value={riskLevel} sub={riskScore ? `Score: ${riskScore.score}/100` : 'Calculated nightly'} color={riskColor} icon={Activity} />
        <StatCard label="Roadmap Progress" value={`${completedNodes}/${totalNodes}`} sub="Nodes completed" color="#8b5cf6" icon={TrendingUp} />
        <StatCard label="Study Time" value={`${studyHours}h`} sub="This week (sprints + coding)" color="#f59e0b" icon={Timer} />
        <StatCard label="Problems Solved" value={totalProblems || pendingAssignments} sub={totalProblems ? "Across all platforms" : (overdueAssignments > 0 ? `${overdueAssignments} overdue` : 'All on track')} color={totalProblems ? '#22c55e' : (pendingAssignments > 0 ? '#ef4444' : '#22c55e')} icon={totalProblems ? Code2 : BookOpen} />
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
                <Radar dataKey="score" stroke="#4f8ef7" fill="#4f8ef7" fillOpacity={0.15} strokeWidth={2} dot={{ fill: '#4f8ef7', r: 3 }} />
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
              <div style={{ fontSize: '52px', fontWeight: '500', color: '#8b5cf6', fontFamily: 'Space Grotesk, sans-serif' }}>{studyHours}</div>
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
                    <span style={{ fontSize: '12px', color: score < 60 ? '#ef4444' : score < 75 ? '#f59e0b' : '#22c55e', fontWeight: '600' }}>{score}%</span>
                  </div>
                  <ProgressBar value={score} color={score < 60 ? '#ef4444' : score < 75 ? '#f59e0b' : '#22c55e'} height={5} />
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
                  <span style={{
                    padding: '2px 8px', borderRadius: '99px', fontSize: '10px', fontWeight: '600', whiteSpace: 'nowrap',
                    background: a.submission_status === 'submitted' ? '#E1F5EE' : a.submission_status === 'late' ? '#FCEBEB' : '#FAEEDA',
                    color: a.submission_status === 'submitted' ? '#0F6E56' : a.submission_status === 'late' ? '#A32D2D' : '#854F0B',
                  }}>
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
