import React, { useEffect, useState } from 'react';
import useAppStore from '../../store';
import { StatCard, PageHeader, ProgressBar } from '../../components/UI';
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid
} from 'recharts';
import { Activity, BookOpen, Code2, Zap, TrendingUp, Timer, Loader2 } from 'lucide-react';

const CustomTooltip = ({ active, payload }) => {
  if (active && payload?.length) {
    return (
      <div style={{ background: 'rgba(15,15,20,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '8px 12px', fontSize: '12px', backdropFilter: 'blur(8px)' }}>
        <div style={{ color: '#fff', fontWeight: '600' }}>{payload[0].value} events</div>
      </div>
    );
  }
  return null;
};

export default function StudentDashboard() {
  const { 
    currentUser, 
    marks, 
    riskScore, 
    roadmapNodes, 
    assignments, 
    sprintStats,
    fetchMarks, 
    fetchRiskScore, 
    fetchRoadmap,
    fetchSprintStats,
    fetchAssignments 
  } = useAppStore();
  
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      await Promise.all([
        fetchMarks(),
        fetchRiskScore(),
        fetchRoadmap(),
        fetchSprintStats(),
        fetchAssignments(),
      ]);
      setLoading(false);
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
      </div>
    );
  }

  const name = currentUser?.name?.split(' ')[0] || 'Student';
  
  const completedNodes = roadmapNodes?.filter(n => n.status === 'complete').length || 0;
  const totalNodes = roadmapNodes?.length || 0;
  
  const subjectScores = {};
  marks?.forEach(m => {
    if (m.score !== undefined && m.max_score > 0) {
      const pct = (m.score / m.max_score) * 100;
      subjectScores[m.subject] = pct;
    }
  });

  const radarData = Object.entries(subjectScores).map(([subject, score]) => ({
    subject,
    score: Math.round(score),
  }));

  const pendingAssignments = assignments?.filter(a => a.status !== 'submitted').length || 0;
  const overdueAssignments = assignments?.filter(a => {
    if (!a.due_date || a.status === 'submitted') return false;
    return new Date(a.due_date) < new Date();
  }).length || 0;

  const riskLevel = riskScore?.level || 'GREEN';
  const riskColor = riskLevel === 'RED' ? '#ef4444' : riskLevel === 'YELLOW' ? '#f59e0b' : '#22c55e';

  return (
    <div className="fade-in-up">
      <PageHeader
        title={`Good morning, ${name} 👋`}
        subtitle="Here's your academic snapshot for today."
      />

      {/* Nudge card - from user pending_nudge */}
      {currentUser?.pending_nudge && (
        <div style={{ 
          padding: '14px 18px', 
          marginBottom: '24px', 
          display: 'flex', 
          alignItems: 'flex-start', 
          gap: '12px',
          background: '#FAEEDA',
          borderRadius: '12px',
          borderLeft: '4px solid #EF9F27',
        }}>
          <div style={{ width: '32px', height: '32px', background: 'rgba(239,159,39,0.2)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Zap size={15} color="#EF9F27" />
          </div>
          <div>
            <div style={{ fontSize: '11px', fontWeight: '600', color: '#854F0B', marginBottom: '2px' }}>Your Veloris nudge</div>
            <div style={{ fontSize: '13px', color: '#1a1a1a', lineHeight: '1.5' }}>{currentUser.pending_nudge}</div>
          </div>
        </div>
      )}

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <StatCard label="Wellbeing Risk" value={riskLevel} sub={riskScore ? `Score: ${riskScore.score}/100` : 'Calculated daily'} color={riskColor} icon={Activity} />
        <StatCard label="Roadmap Progress" value={`${completedNodes}/${totalNodes}`} sub="Nodes completed" color="#8b5cf6" icon={TrendingUp} />
        <StatCard label="Study Time" value={`${Math.round((sprintStats?.this_week_minutes || 0) / 60)}h`} sub="This week" color="#f59e0b" icon={Timer} />
        <StatCard label="Pending Assignments" value={pendingAssignments} sub={overdueAssignments > 0 ? `${overdueAssignments} overdue` : 'All on track'} color={pendingAssignments > 0 ? '#ef4444' : '#22c55e'} icon={BookOpen} />
      </div>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
        {/* Radar chart */}
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
            <div className="flex items-center justify-center h-[200px] text-slate-500 text-sm">No marks uploaded yet</div>
          )}
        </div>

        {/* Sprint stats placeholder - could be activity data later */}
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>Weekly Sprint Time</div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '16px' }}>Focus sessions this week</div>
          <div className="flex items-center justify-center h-[200px]">
            <div className="text-center">
              <div style={{ fontSize: '48px', fontWeight: '500', color: '#8b5cf6' }}>{Math.round((sprintStats?.this_week_minutes || 0) / 60)}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>hours focused</div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* Subject bars */}
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '16px' }}>Subject Breakdown</div>
          {Object.keys(subjectScores).length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {Object.entries(subjectScores).map(([sub, score]) => (
                <div key={sub}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '12px', fontWeight: '500' }}>{sub}</span>
                    <span style={{ fontSize: '12px', color: score < 60 ? '#ef4444' : score < 75 ? '#f59e0b' : '#22c55e', fontWeight: '600' }}>{Math.round(score)}%</span>
                  </div>
                  <ProgressBar value={score} color={score < 60 ? '#ef4444' : score < 75 ? '#f59e0b' : '#22c55e'} height={5} />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-slate-500 text-sm text-center py-8">Upload a marksheet to see your subjects</div>
          )}
        </div>

        {/* Assignments */}
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '16px' }}>Recent Assignments</div>
          {assignments && assignments.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {assignments.slice(0, 3).map((a, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', background: 'var(--bg-elevated)', borderRadius: '8px' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '12px', fontWeight: '500', marginBottom: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.title}</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{a.subject || 'General'} · {a.due_date ? `Due ${a.due_date}` : 'No deadline'}</div>
                  </div>
                  <span style={{ 
                    padding: '2px 8px', 
                    borderRadius: '99px', 
                    fontSize: '10px', 
                    fontWeight: '600',
                    background: a.status === 'submitted' ? '#E1F5EE' : a.status === 'late' ? '#FCEBEB' : '#FAEEDA',
                    color: a.status === 'submitted' ? '#0F6E56' : a.status === 'late' ? '#A32D2D' : '#854F0B',
                  }}>
                    {a.status || 'pending'}
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