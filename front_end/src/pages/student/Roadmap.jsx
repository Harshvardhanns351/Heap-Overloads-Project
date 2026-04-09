import React, { useState } from 'react';
import useAppStore from '../../store';
import { CheckCircle2, Clock, BookOpen, Zap, PlayCircle, ChevronRight, RefreshCw, Target, Loader2, Edit3, X } from 'lucide-react';
import { authHeaders, buildApiUrl } from '../../api';

const TYPE_COLOR = { concept: '#4f8ef7', practice: '#8b5cf6', project: '#14b8a6' };
const TYPE_ICON = { concept: BookOpen, practice: Zap, project: PlayCircle };

const STATUS_STYLES = {
  completed: { border: '#22c55e', bg: 'rgba(34,197,94,0.06)', dot: '#22c55e', label: 'Complete', labelBg: 'rgba(34,197,94,0.12)', labelColor: '#22c55e' },
  in_progress: { border: '#4f8ef7', bg: 'rgba(79,142,247,0.06)', dot: '#4f8ef7', label: 'In Progress', labelBg: 'rgba(79,142,247,0.12)', labelColor: '#4f8ef7' },
  pending: { border: 'rgba(255,255,255,0.08)', bg: 'transparent', dot: 'rgba(255,255,255,0.2)', label: 'Pending', labelBg: 'rgba(255,255,255,0.06)', labelColor: 'var(--text-muted)' },
};

function NodeCard({ node, index, onStart, onComplete, isStarting }) {
  const [expanded, setExpanded] = useState(false);
  const style = STATUS_STYLES[node.status] || STATUS_STYLES.pending;
  const Icon = TYPE_ICON[node.node_type] || BookOpen;
  const typeColor = TYPE_COLOR[node.node_type] || '#4f8ef7';
  const resources = (() => { try { return JSON.parse(node.resources_json || '[]'); } catch { return []; } })();

  return (
    <div
      style={{
        background: style.bg,
        border: `1px solid ${style.border}`,
        borderRadius: '14px',
        padding: '20px',
        transition: 'all 0.2s',
        cursor: 'pointer',
        position: 'relative',
        overflow: 'hidden',
      }}
      onClick={() => setExpanded(e => !e)}
    >
      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', marginBottom: expanded ? '16px' : 0 }}>
        {/* Index badge */}
        <div style={{
          width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0,
          background: node.status === 'completed' ? 'rgba(34,197,94,0.15)' : node.status === 'in_progress' ? 'rgba(79,142,247,0.15)' : 'rgba(255,255,255,0.06)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '13px', fontWeight: '700',
          color: node.status === 'completed' ? '#22c55e' : node.status === 'in_progress' ? '#4f8ef7' : 'var(--text-muted)',
        }}>
          {node.status === 'completed' ? <CheckCircle2 size={18} /> : String(index + 1).padStart(2, '0')}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
            <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>{node.title}</span>
            <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '99px', background: `${typeColor}15`, color: typeColor, border: `1px solid ${typeColor}25`, fontWeight: '600' }}>
              {node.node_type}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Clock size={10} /> {node.hours}h
            </span>
            <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '99px', background: style.labelBg, color: style.labelColor, fontWeight: '600' }}>
              {style.label}
            </span>
          </div>
        </div>

        <ChevronRight size={14} color="var(--text-muted)" style={{ transform: expanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0, marginTop: '4px' }} />
      </div>

      {/* Expanded content */}
      {expanded && (
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '16px' }}>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '14px' }}>{node.description}</p>

          {resources.length > 0 && (
            <div style={{ marginBottom: '14px' }}>
              <div style={{ fontSize: '10px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>Resources</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {resources.map((r, i) => (
                  <span key={i} style={{ fontSize: '11px', padding: '4px 10px', background: 'rgba(79,142,247,0.08)', border: '1px solid rgba(79,142,247,0.2)', borderRadius: '6px', color: '#4f8ef7' }}>
                    🔗 {r}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: '8px' }} onClick={e => e.stopPropagation()}>
            {node.status === 'in_progress' && (
              <>
                <button
                  className="btn btn-primary"
                  onClick={() => onStart(node.id)}
                  disabled={isStarting}
                  style={{ fontSize: '12px', padding: '7px 14px' }}
                >
                  {isStarting ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />}
                  Start 25-min Sprint
                </button>
                <button className="btn btn-ghost" onClick={() => onComplete(node.id)} style={{ fontSize: '12px', padding: '7px 14px' }}>
                  <CheckCircle2 size={12} /> Mark Complete
                </button>
              </>
            )}
            {node.status === 'completed' && (
              <span style={{ fontSize: '12px', color: '#22c55e', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '600' }}>
                <CheckCircle2 size={13} /> Completed
              </span>
            )}
            {node.status === 'pending' && (
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Complete previous nodes to unlock</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Roadmap() {
  const { roadmapNodes, fetchRoadmap, markNodeComplete, startSprint, currentUser } = useAppStore();
  const [regenerating, setRegenerating] = useState(false);
  const [startingNode, setStartingNode] = useState(null);
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalForm, setGoalForm] = useState({ goal: '', semester: '', branch: '' });
  const [savingGoal, setSavingGoal] = useState(false);

  const completed = roadmapNodes.filter(n => n.status === 'completed').length;
  const total = roadmapNodes.length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const currentNode = roadmapNodes.find(n => n.status === 'in_progress');

  const handleRegenerate = async () => {
    setRegenerating(true);
    try {
      await fetch(buildApiUrl('/roadmap/regenerate'), {
        method: 'POST',
        headers: authHeaders(),
      });
      await fetchRoadmap();
    } catch (e) { console.error(e); }
    finally { setRegenerating(false); }
  };

  const handleStartSprint = async (nodeId) => {
    setStartingNode(nodeId);
    try { await startSprint(nodeId); } catch (e) { console.error(e); }
    finally { setStartingNode(null); }
  };

  const handleSaveGoal = async () => {
    setSavingGoal(true);
    try {
      await fetch(buildApiUrl('/roadmap/goal'), {
        method: 'PATCH',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          goal: goalForm.goal,
          semester: goalForm.semester ? parseInt(goalForm.semester) : undefined,
          branch: goalForm.branch || undefined,
        }),
      });
      await fetchRoadmap();
      setEditingGoal(false);
    } catch (e) { console.error(e); }
    finally { setSavingGoal(false); }
  };

  return (
    <div className="fade-in-up">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '28px', paddingBottom: '24px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '600', color: 'white', marginBottom: '6px' }}>My Learning Roadmap</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Goal: <span style={{ color: '#4f8ef7', fontWeight: '500' }}>{currentUser?.goal || 'Crack Placements'}</span>
            </span>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>·</span>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Sem {currentUser?.semester || 6} · {currentUser?.branch || 'CSE'}
            </span>
            {currentNode && (
              <>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>·</span>
                <span style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#4f8ef7', display: 'inline-block', animation: 'pulse 2s infinite' }} />
                  <span style={{ color: '#4f8ef7', fontWeight: '500' }}>Now: {currentNode.title}</span>
                </span>
              </>
            )}
          </div>
        </div>
        <button
          className="btn btn-ghost"
          onClick={handleRegenerate}
          disabled={regenerating}
          style={{ fontSize: '12px', gap: '6px' }}
        >
          <RefreshCw size={12} className={regenerating ? 'spin' : ''} />
          {regenerating ? 'Regenerating...' : 'Regenerate'}
        </button>
      </div>

      {/* Goal editor */}
      {editingGoal ? (
        <div style={{ marginBottom: '24px', padding: '20px', background: 'rgba(79,142,247,0.06)', border: '1px solid rgba(79,142,247,0.2)', borderRadius: '12px' }}>
          <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '14px' }}>Update your learning goal</div>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '10px', marginBottom: '12px' }}>
            <div>
              <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Goal</label>
              <input className="input" placeholder="e.g. crack placements, startup intern" value={goalForm.goal}
                onChange={e => setGoalForm(f => ({ ...f, goal: e.target.value }))} />
            </div>
            <div>
              <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Semester</label>
              <input className="input" type="number" min="1" max="8" placeholder="6" value={goalForm.semester}
                onChange={e => setGoalForm(f => ({ ...f, semester: e.target.value }))} />
            </div>
            <div>
              <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Branch</label>
              <input className="input" placeholder="CSE" value={goalForm.branch}
                onChange={e => setGoalForm(f => ({ ...f, branch: e.target.value }))} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-primary" onClick={handleSaveGoal} disabled={savingGoal || !goalForm.goal} style={{ fontSize: '12px' }}>
              {savingGoal ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
              {savingGoal ? 'Saving...' : 'Save & Regenerate'}
            </button>
            <button className="btn btn-ghost" onClick={() => setEditingGoal(false)} style={{ fontSize: '12px' }}>
              <X size={12} /> Cancel
            </button>
          </div>
        </div>
      ) : (
        <div style={{ marginBottom: '24px', padding: '14px 18px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Target size={16} color="#4f8ef7" />
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Current goal: </span>
            <span style={{ fontSize: '12px', color: '#4f8ef7', fontWeight: '600' }}>{currentUser?.goal || 'crack placements'}</span>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}> · Sem {currentUser?.semester || 6} · {currentUser?.branch || 'CSE'}</span>
          </div>
          <button className="btn btn-ghost" onClick={() => { setGoalForm({ goal: currentUser?.goal || '', semester: currentUser?.semester || '', branch: currentUser?.branch || '' }); setEditingGoal(true); }} style={{ fontSize: '11px', padding: '5px 10px' }}>
            <Edit3 size={11} /> Change Goal
          </button>
        </div>
      )}

      {/* Progress bar */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <span style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-secondary)' }}>Overall Progress</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{completed} / {total} nodes</span>
            <span style={{ fontSize: '20px', fontWeight: '700', color: '#4f8ef7', fontFamily: 'Space Grotesk, sans-serif' }}>{pct}%</span>
          </div>
        </div>
        <div style={{ height: '8px', background: 'rgba(255,255,255,0.06)', borderRadius: '99px', overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${pct}%`,
            background: 'linear-gradient(90deg, #4f8ef7, #8b5cf6)',
            borderRadius: '99px',
            transition: 'width 0.6s ease',
            boxShadow: '0 0 12px rgba(79,142,247,0.4)',
          }} />
        </div>
        {/* Step indicators */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
          {roadmapNodes.map((n, i) => (
            <div key={n.id} style={{
              width: `${100 / Math.max(total, 1)}%`,
              height: '3px',
              background: n.status === 'completed' ? '#22c55e' : n.status === 'in_progress' ? '#4f8ef7' : 'rgba(255,255,255,0.06)',
              borderRadius: '99px',
              transition: 'background 0.3s',
            }} />
          ))}
        </div>
      </div>

      {/* Empty state */}
      {total === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <Target size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
          <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>No roadmap yet</div>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px' }}>Upload a marksheet or set your goal to generate a personalized roadmap</div>
          <button className="btn btn-primary" onClick={handleRegenerate} disabled={regenerating}>
            <RefreshCw size={13} /> Generate Roadmap
          </button>
        </div>
      )}

      {/* Node grid */}
      {total > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
          {roadmapNodes.map((node, i) => (
            <NodeCard
              key={node.id}
              node={node}
              index={i}
              onStart={handleStartSprint}
              onComplete={markNodeComplete}
              isStarting={startingNode === node.id}
            />
          ))}
        </div>
      )}

      <style>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
      `}</style>
    </div>
  );
}
