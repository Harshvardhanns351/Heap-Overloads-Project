import React from 'react';
import useAppStore from '../../store';
import { PageHeader } from '../../components/UI';
import { CheckCircle2, Circle, PlayCircle, ChevronDown, ChevronUp, Clock, BookOpen, Zap } from 'lucide-react';

const TYPE_COLORS = { concept: '#4f8ef7', practice: '#8b5cf6', project: '#14b8a6' };
const TYPE_ICONS = { concept: BookOpen, practice: Zap, project: PlayCircle };

function NodeIcon({ status, size = 22 }) {
  if (status === 'completed') return <CheckCircle2 size={size} color="#22c55e" />;
  if (status === 'current') return <PlayCircle size={size} color="#4f8ef7" className="pulse-ring" />;
  return <Circle size={size} color="var(--text-muted)" />;
}

export default function Roadmap() {
  const { roadmapNodes, expandedNode, setExpandedNode, markNodeComplete } = useAppStore();

  return (
    <div className="fade-in-up" style={{ maxWidth: '680px', margin: '0 auto' }}>
      <PageHeader
        title="My Learning Roadmap"
        subtitle="AI-generated based on your marks, goals, and skill gaps"
        action={
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Goal: Crack Placements · Sem 6 CSE</span>
            <button className="btn btn-ghost" style={{ fontSize: '11px', padding: '5px 12px' }}>Regenerate</button>
          </div>
        }
      />

      {/* Progress bar */}
      <div className="card" style={{ padding: '16px 20px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: '12px', fontWeight: '500' }}>Overall Progress</span>
            <span style={{ fontSize: '12px', fontWeight: '700', color: '#4f8ef7' }}>2 / 6 completed</span>
          </div>
          <div style={{ background: 'var(--bg-elevated)', borderRadius: '99px', height: '6px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: '33%', background: 'linear-gradient(90deg, #4f8ef7, #8b5cf6)', borderRadius: '99px', transition: 'width 0.5s ease' }} />
          </div>
        </div>
        <div style={{ fontSize: '24px', fontWeight: '700', fontFamily: 'Space Grotesk, sans-serif', color: '#f0f0f8' }}>33%</div>
      </div>

      {/* Vertical ladder */}
      <div style={{ position: 'relative' }}>
        {/* Connector line */}
        <div style={{ position: 'absolute', left: '21px', top: '22px', bottom: '22px', width: '2px', background: 'linear-gradient(180deg, #22c55e 0%, #22c55e 33%, rgba(79,142,247,0.5) 33%, rgba(79,142,247,0.5) 50%, rgba(255,255,255,0.06) 50%)', borderRadius: '1px' }} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {roadmapNodes.map((node, idx) => {
            const isExpanded = expandedNode === node.id;
            const Icon = TYPE_ICONS[node.type] || BookOpen;
            const typeColor = TYPE_COLORS[node.type];

            return (
              <div key={node.id} className="roadmap-node" style={{ opacity: node.status === 'upcoming' && idx > 3 ? 0.5 : 1 }}>
                <div
                  onClick={() => setExpandedNode(node.id)}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: '14px', padding: '14px 16px',
                    background: node.status === 'current' ? 'rgba(79,142,247,0.06)' : 'var(--bg-card)',
                    border: `1px solid ${node.status === 'current' ? 'rgba(79,142,247,0.2)' : node.status === 'completed' ? 'rgba(34,197,94,0.15)' : 'var(--border)'}`,
                    borderRadius: '12px', cursor: 'pointer', transition: 'all 0.18s', paddingLeft: '16px',
                  }}
                >
                  {/* Icon */}
                  <div style={{ marginTop: '1px', zIndex: 1, flexShrink: 0, background: 'var(--bg-card)', padding: '2px' }}>
                    <NodeIcon status={node.status} />
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '13px', fontWeight: '600' }}>{node.title}</span>
                      <span style={{ fontSize: '10px', padding: '1px 7px', borderRadius: '99px', background: `${typeColor}15`, color: typeColor, border: `1px solid ${typeColor}25`, fontWeight: '600' }}>
                        {node.type}
                      </span>
                      {node.status === 'current' && (
                        <span className="badge-blue" style={{ fontSize: '10px', padding: '1px 7px', borderRadius: '99px', fontWeight: '600' }}>Current</span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={10} /> {node.hours}h estimated
                      </span>
                    </div>
                  </div>

                  <div style={{ color: 'var(--text-muted)', flexShrink: 0 }}>
                    {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </div>
                </div>

                {/* Expanded panel */}
                {isExpanded && (
                  <div className="fade-in-up" style={{ margin: '4px 0 4px 44px', padding: '16px', background: 'var(--bg-elevated)', border: '1px solid var(--border-soft)', borderRadius: '10px' }}>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '14px' }}>{node.description}</p>

                    <div style={{ marginBottom: '14px' }}>
                      <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Resources</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {node.resources.map((r, i) => (
                          <span key={i} style={{ fontSize: '11px', padding: '3px 10px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '6px', color: '#4f8ef7', cursor: 'pointer' }}>
                            🔗 {r}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      {node.status === 'current' && (
                        <button className="btn btn-primary" onClick={() => markNodeComplete(node.id)} style={{ fontSize: '12px', padding: '6px 14px' }}>
                          <CheckCircle2 size={13} /> Mark Complete
                        </button>
                      )}
                      {node.status === 'completed' && (
                        <span style={{ fontSize: '12px', color: '#22c55e', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <CheckCircle2 size={13} /> Completed
                        </span>
                      )}
                      {node.status === 'upcoming' && (
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Complete previous nodes to unlock</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
