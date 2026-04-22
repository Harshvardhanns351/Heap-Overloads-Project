import { useState, useEffect, useCallback } from "react";

const API = "http://localhost:8000/api";
const tok = () => localStorage.getItem("token");
const authFetch = (url, opts = {}) =>
  fetch(`${API}${url}`, {
    ...opts,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${tok()}`, ...(opts.headers || {}) },
  });

// ── Constants ─────────────────────────────────────────────────────────────────
const GOALS = [
  { id: "crack placements", label: "Crack Placements", icon: "◈", color: "#a78bfa" },
  { id: "system design", label: "System Design", icon: "◉", color: "#34d399" },
  { id: "competitive programming", label: "Competitive Programming", icon: "◆", color: "#f87171" },
  { id: "web development", label: "Full Stack Dev", icon: "◇", color: "#fbbf24" },
  { id: "machine learning", label: "Machine Learning", icon: "◎", color: "#f472b6" },
  { id: "startup intern", label: "Startup Internship", icon: "◌", color: "#60a5fa" },
];
const DIFFICULTIES = [
  { id: "beginner", label: "Basics", desc: "Fundamentals first", color: "#34d399" },
  { id: "intermediate", label: "Intermediate", desc: "Balanced depth", color: "#a78bfa" },
  { id: "advanced", label: "Advanced", desc: "Deep mastery", color: "#f87171" },
];
const TIMEFRAMES = [
  { days: 1, label: "1 Day", sub: "Quick overview" },
  { days: 5, label: "5 Days", sub: "Crash course" },
  { days: 10, label: "10 Days", sub: "Focused sprint" },
  { days: 15, label: "15 Days", sub: "Solid foundation" },
  { days: 30, label: "1 Month", sub: "Comprehensive" },
];
const TYPE_COLORS = {
  concept: { bg: "rgba(167,139,250,0.1)", text: "#a78bfa", border: "rgba(167,139,250,0.2)" },
  practice: { bg: "rgba(251,191,36,0.1)", text: "#fbbf24", border: "rgba(251,191,36,0.2)" },
  project: { bg: "rgba(52,211,153,0.1)", text: "#34d399", border: "rgba(52,211,153,0.2)" },
};
const STATUS_CFG = {
  complete: { label: "Done", color: "#34d399", bg: "rgba(52,211,153,0.1)", border: "rgba(52,211,153,0.3)" },
  in_progress: { label: "In Progress", color: "#a78bfa", bg: "rgba(167,139,250,0.1)", border: "rgba(167,139,250,0.3)" },
  pending: { label: "Pending", color: "var(--text-muted)", bg: "rgba(255,255,255,0.04)", border: "rgba(255,255,255,0.08)" },
};

// ── Wizard ────────────────────────────────────────────────────────────────────
function Wizard({ onGenerated, onCancel, slotsUsed, maxSlots }) {
  const [step, setStep] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [cfg, setCfg] = useState({ goal: "", customGoal: "", difficulty: "intermediate", timeframe_days: 30, branch: "CSE", semester: 6 });

  const STEPS = ["Choose Goal", "Difficulty & Timeframe", "Confirm"];

  const handleGenerate = async () => {
    setGenerating(true); setError("");
    try {
      const goal = cfg.customGoal || cfg.goal;
      const res = await authFetch("/roadmap/generate", {
        method: "POST",
        body: JSON.stringify({ goal, difficulty: cfg.difficulty, timeframe_days: cfg.timeframe_days, branch: cfg.branch, semester: cfg.semester }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Generation failed");
      onGenerated(data.roadmap);
    } catch (e) { setError(e.message); setGenerating(false); }
  };

  return (
    <div style={{ maxWidth: "680px", margin: "0 auto", padding: "2rem 1rem" }}>
      {/* Step bar */}
      <div style={{ display: "flex", alignItems: "center", marginBottom: "2rem" }}>
        {STEPS.map((s, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", flex: i < STEPS.length - 1 ? 1 : "none" }}>
            <div style={{ width: "30px", height: "30px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 600, flexShrink: 0, background: i < step ? "var(--status-ok)" : i === step ? "var(--accent)" : "rgba(255,255,255,0.06)", color: i <= step ? "#0a0a0a" : "var(--text-muted)", boxShadow: i === step ? "0 0 0 3px var(--accent-bg)" : "none" }}>
              {i < step ? "✓" : i + 1}
            </div>
            <span style={{ fontSize: "12px", color: i === step ? "var(--text-primary)" : "var(--text-muted)", marginLeft: "8px", whiteSpace: "nowrap" }}>{s}</span>
            {i < STEPS.length - 1 && <div style={{ flex: 1, height: "1px", background: i < step ? "var(--status-ok)" : "rgba(255,255,255,0.08)", margin: "0 10px", minWidth: "20px" }} />}
          </div>
        ))}
      </div>

      {/* Slot indicator */}
      <div style={{ display: "flex", gap: "6px", marginBottom: "20px" }}>
        {Array.from({ length: maxSlots }).map((_, i) => (
          <div key={i} style={{ flex: 1, height: "4px", borderRadius: "2px", background: i < slotsUsed ? "var(--accent)" : "rgba(255,255,255,0.08)" }} />
        ))}
      </div>
      <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "20px" }}>Roadmap {slotsUsed + 1} of {maxSlots}</div>

      {/* Step 0: Goal */}
      {step === 0 && (
        <div className="fade-in-up">
          <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "22px", fontWeight: 700, marginBottom: "6px" }}>What do you want to learn?</div>
          <div style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "20px" }}>Pick a goal — your roadmap depth and topics are built around this.</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "10px", marginBottom: "16px" }}>
            {GOALS.map(g => (
              <div key={g.id} onClick={() => setCfg(c => ({ ...c, goal: g.id, customGoal: "" }))}
                style={{ background: cfg.goal === g.id ? `${g.color}15` : "var(--bg-card)", border: `1.5px solid ${cfg.goal === g.id ? g.color : "var(--border)"}`, borderRadius: "12px", padding: "14px", cursor: "pointer", transition: "all 0.15s" }}>
                <div style={{ fontSize: "18px", marginBottom: "4px" }}>{g.icon}</div>
                <div style={{ fontSize: "13px", fontWeight: 600 }}>{g.label}</div>
              </div>
            ))}
          </div>
          <input className="input" placeholder="Or type a custom goal..." value={cfg.customGoal || ""}
            onChange={e => setCfg(c => ({ ...c, customGoal: e.target.value, goal: e.target.value ? "__custom__" : c.goal }))}
            style={{ marginBottom: "20px" }} />
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <button className="btn" onClick={onCancel}>Cancel</button>
            <button className="btn-primary" disabled={!cfg.goal && !cfg.customGoal} onClick={() => setStep(1)}>Next →</button>
          </div>
        </div>
      )}

      {/* Step 1: Difficulty + Timeframe */}
      {step === 1 && (
        <div className="fade-in-up">
          <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "22px", fontWeight: 700, marginBottom: "6px" }}>Difficulty & Timeframe</div>
          <div style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "20px" }}>These control the depth of concepts and number of nodes.</div>

          <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "10px" }}>Difficulty Level</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "10px", marginBottom: "24px" }}>
            {DIFFICULTIES.map(d => (
              <div key={d.id} onClick={() => setCfg(c => ({ ...c, difficulty: d.id }))}
                style={{ background: cfg.difficulty === d.id ? `${d.color}15` : "var(--bg-card)", border: `1.5px solid ${cfg.difficulty === d.id ? d.color : "var(--border)"}`, borderRadius: "12px", padding: "16px", cursor: "pointer", textAlign: "center" }}>
                <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "15px", fontWeight: 700, color: cfg.difficulty === d.id ? d.color : "var(--text-primary)", marginBottom: "4px" }}>{d.label}</div>
                <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>{d.desc}</div>
              </div>
            ))}
          </div>

          <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "10px" }}>Timeframe</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: "8px", marginBottom: "24px" }}>
            {TIMEFRAMES.map(t => (
              <div key={t.days} onClick={() => setCfg(c => ({ ...c, timeframe_days: t.days }))}
                style={{ background: cfg.timeframe_days === t.days ? "var(--accent-bg)" : "var(--bg-card)", border: `1.5px solid ${cfg.timeframe_days === t.days ? "var(--accent-border)" : "var(--border)"}`, borderRadius: "10px", padding: "12px 8px", cursor: "pointer", textAlign: "center" }}>
                <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "14px", fontWeight: 700, color: cfg.timeframe_days === t.days ? "var(--accent)" : "var(--text-primary)" }}>{t.label}</div>
                <div style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "2px" }}>{t.sub}</div>
              </div>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "20px" }}>
            <div>
              <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "6px" }}>Branch</div>
              <select className="input" value={cfg.branch} onChange={e => setCfg(c => ({ ...c, branch: e.target.value }))}>
                {["CSE","IT","ECE","EEE","MECH","CIVIL","AIDS","AIML"].map(b => <option key={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "6px" }}>Semester</div>
              <select className="input" value={cfg.semester} onChange={e => setCfg(c => ({ ...c, semester: parseInt(e.target.value) }))}>
                {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>Semester {s}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <button className="btn" onClick={() => setStep(0)}>← Back</button>
            <button className="btn-primary" onClick={() => setStep(2)}>Review →</button>
          </div>
        </div>
      )}

      {/* Step 2: Confirm */}
      {step === 2 && (
        <div className="fade-in-up">
          <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "22px", fontWeight: 700, marginBottom: "6px" }}>Ready to generate</div>
          <div style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "20px" }}>AI will personalize this using your uploaded marks.</div>
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "12px", overflow: "hidden", marginBottom: "20px" }}>
            {[
              { k: "Goal", v: cfg.customGoal || GOALS.find(g => g.id === cfg.goal)?.label || cfg.goal },
              { k: "Difficulty", v: DIFFICULTIES.find(d => d.id === cfg.difficulty)?.label },
              { k: "Timeframe", v: TIMEFRAMES.find(t => t.days === cfg.timeframe_days)?.label },
              { k: "Branch & Semester", v: `${cfg.branch} · Semester ${cfg.semester}` },
            ].map(({ k, v }) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "12px 16px", borderBottom: `1px solid var(--border)` }}>
                <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>{k}</span>
                <span style={{ fontSize: "13px", fontWeight: 500 }}>{v}</span>
              </div>
            ))}
          </div>
          {error && <div style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: "10px", padding: "10px 14px", fontSize: "13px", color: "var(--status-err)", marginBottom: "16px" }}>{error}</div>}
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <button className="btn" onClick={() => setStep(1)} disabled={generating}>← Back</button>
            <button className="btn-primary" onClick={handleGenerate} disabled={generating}>
              {generating ? "Generating..." : "Generate Roadmap →"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Roadmap Card (dashboard) ──────────────────────────────────────────────────
function RoadmapCard({ rm, onActivate, onView, onDelete, activating }) {
  const goalObj = GOALS.find(g => g.id === rm.goal);
  const diffColor = DIFFICULTIES.find(d => d.id === rm.difficulty)?.color || "var(--text-muted)";
  
  return (
    <div className="premium-card group" style={{ borderColor: rm.is_active ? "var(--accent)" : "var(--border)" }}>
      {rm.is_active && <div style={{ position: "absolute", top: "12px", right: "12px", fontSize: "9px", padding: "3px 8px", borderRadius: "20px", background: "var(--accent-bg)", color: "var(--accent)", fontWeight: 800 }}>ACTIVE</div>}
      {rm.is_completed && !rm.is_active && <div style={{ position: "absolute", top: "12px", right: "12px", fontSize: "9px", padding: "3px 8px", borderRadius: "20px", background: "rgba(52,211,153,0.1)", color: "var(--status-ok)", fontWeight: 800 }}>COMPLETED</div>}

      <div style={{ fontSize: "22px", marginBottom: "8px" }}>{goalObj?.icon || "◈"}</div>
      <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "16px", fontWeight: 700, marginBottom: "4px" }}>{goalObj?.label || rm.goal}</div>
      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "14px" }}>
        <span style={{ fontSize: "10px", padding: "2px 8px", borderRadius: "20px", background: `${diffColor}15`, color: diffColor, border: `1px solid ${diffColor}30` }}>{rm.difficulty}</span>
        <span className="badge-blue">{TIMEFRAMES.find(t => t.days === rm.timeframe_days)?.label || `${rm.timeframe_days}d`}</span>
        <span className="badge-blue">{rm.branch}</span>
      </div>

      {/* Progress bar */}
      <div style={{ marginBottom: "16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
          <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>{rm.completed_nodes}/{rm.total_nodes} nodes</span>
          <span style={{ fontSize: "11px", fontWeight: 700, color: rm.is_completed ? "var(--status-ok)" : "var(--text-primary)" }}>{rm.completion_pct}%</span>
        </div>
        <div style={{ height: "4px", background: "rgba(255,255,255,0.05)", borderRadius: "2px", overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${rm.completion_pct}%`, background: rm.is_completed ? "var(--status-ok)" : "var(--accent)", borderRadius: "2px", transition: "width 0.5s" }} />
        </div>
      </div>

      <div style={{ display: "flex", gap: "8px" }}>
        <button onClick={() => onView(rm)} style={{ flex: 1 }} className={rm.is_active ? "btn-primary" : "btn"}>
          {rm.is_active ? "Continue" : "View"}
        </button>
        {!rm.is_active && (
          <button onClick={() => onActivate(rm.id)} disabled={activating} className="btn" style={{ flex: 1 }}>
            {activating ? "..." : "Switch"}
          </button>
        )}
        <button onClick={() => onDelete(rm.id)} className="btn" style={{ color: "var(--status-err)", borderColor: "rgba(248,113,113,0.15)", padding: "0 10px" }}>✕</button>
      </div>
    </div>
  );
}

// ── Sprint Timer ──────────────────────────────────────────────────────────────
function SprintTimer({ onComplete }) {
  const [seconds, setSeconds] = useState(25 * 60);
  const [running, setRunning] = useState(true);
  useEffect(() => {
    if (!running || seconds <= 0) { if (seconds <= 0) onComplete(); return; }
    const t = setTimeout(() => setSeconds(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds, running]);
  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  return (
    <div style={{ background: "var(--bg-elevated)", border: "1px solid var(--accent-border)", borderRadius: "12px", padding: "16px", marginBottom: "20px", textAlign: "center" }}>
      <div style={{ fontSize: "10px", color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "6px", fontWeight: 800 }}>Sprint active</div>
      <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "32px", fontWeight: 800, color: "var(--text-primary)" }}>{mm}:{ss}</div>
      <button onClick={() => setRunning(r => !r)} className="btn" style={{ marginTop: "10px", padding: "4px 14px", fontSize: "11px" }}>
        {running ? "Pause" : "Resume"}
      </button>
    </div>
  );
}

// ── Node Panel ────────────────────────────────────────────────────────────────
function NodePanel({ node, onClose, onMarkComplete, onStartSprint, sprintActive, updating, onResourcesRegenerated }) {
  if (!node) return null;
  const tc = TYPE_COLORS[node.node_type] || TYPE_COLORS.concept;
  const sc = STATUS_CFG[node.status] || STATUS_CFG.pending;
  const resources = Array.isArray(node.resources) ? node.resources : [];
  const history = Array.isArray(node.resources_history) ? node.resources_history : [];
  const [regenLoading, setRegenLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const handleRegenResources = async () => {
    setRegenLoading(true);
    try {
      const res = await authFetch(`/roadmap/nodes/${node.id}/regenerate-resources`, { method: "POST" });
      if (!res.ok) throw new Error();
      const data = await res.json();
      onResourcesRegenerated(node.id, data.resources, data.history);
    } catch { /* silently fail — user can retry */ }
    setRegenLoading(false);
  };

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 100, backdropFilter: "blur(4px)" }} />
      <div className="custom-scrollbar" style={{ position: "fixed", right: 0, top: 0, bottom: 0, width: "min(500px,94vw)", background: "var(--bg-primary)", borderLeft: "1px solid var(--border)", zIndex: 101, overflowY: "auto", animation: "slideIn 0.25s cubic-bezier(0,0,0.2,1)" }}>
        <div style={{ padding: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
            <div>
              <div style={{ fontSize: "10px", color: "var(--text-muted)", marginBottom: "4px", fontWeight: 700, textTransform: "uppercase" }}>Node {String(node.order_index + 1).padStart(2, "0")}</div>
              <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "20px", fontWeight: 800, lineHeight: 1.2, marginBottom: "12px" }}>{node.title}</div>
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                <span style={{ fontSize: "10px", padding: "3px 8px", borderRadius: "20px", background: tc.bg, color: tc.text, border: `1px solid ${tc.border}`, fontWeight: 700 }}>{node.node_type}</span>
                <span style={{ fontSize: "10px", padding: "3px 8px", borderRadius: "20px", background: sc.bg, color: sc.color, border: `1px solid ${sc.border}`, fontWeight: 700 }}>{sc.label}</span>
                <span className="badge-blue">◷ {node.hours}h</span>
              </div>
            </div>
            <button onClick={onClose} className="btn" style={{ padding: "8px", borderRadius: "8px" }}>✕</button>
          </div>

          <div style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.7, marginBottom: "24px", background: "rgba(255,255,255,0.02)", borderRadius: "12px", padding: "16px", border: "1px solid var(--border)" }}>{node.description}</div>
          
          {sprintActive && <SprintTimer onComplete={() => {}} />}

          {/* Resources */}
          <div style={{ marginBottom: "24px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
              <div style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>Personalized Resources</div>
              <div style={{ display: "flex", gap: "6px" }}>
                {history.length > 0 && (
                  <button onClick={() => setShowHistory(h => !h)} className="btn" style={{ fontSize: "10px", padding: "3px 8px" }}>
                    {showHistory ? "Hide History" : `History (${history.length})`}
                  </button>
                )}
                <button onClick={handleRegenResources} disabled={regenLoading} className="btn" style={{ fontSize: "10px", padding: "3px 8px" }}>
                  {regenLoading ? "Working..." : "Regenerate"}
                </button>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {resources.map((r, i) => (
                <a key={i} href={r.url || "#"} target="_blank" rel="noopener noreferrer"
                  style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px", background: "rgba(255,255,255,0.02)", border: "1px solid var(--border)", borderRadius: "10px", textDecoration: "none", color: "var(--text-primary)", fontSize: "13px", transition: "all 0.2s" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-hover)'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; }}>
                  <div style={{ width: "24px", height: "24px", borderRadius: "6px", background: "var(--accent-bg)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", color: "var(--accent)", flexShrink: 0 }}>◈</div>
                  <span style={{ flex: 1, fontWeight: 500 }}>{r.label || r}</span>
                  {r.tag && <span className="badge-blue" style={{ fontSize: "9px" }}>{r.tag}</span>}
                  <ExternalLink size={12} color="var(--text-muted)" />
                </a>
              ))}
              {resources.length === 0 && !regenLoading && (
                <div style={{ fontSize: "12px", color: "var(--text-muted)", textAlign: "center", padding: "20px 0" }}>No resources — click Regenerate.</div>
              )}
            </div>

            {showHistory && history.length > 0 && (
              <div style={{ marginTop: "16px", padding: "12px", borderTop: "1px dashed var(--border)" }}>
                {history.map((batch, bi) => (
                  <div key={bi} style={{ marginBottom: "12px" }}>
                    <div style={{ fontSize: "10px", color: "var(--text-muted)", marginBottom: "6px" }}>Batch {bi + 1}</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                      {batch.map((r, ii) => (
                        <a key={ii} href={r.url || "#"} target="_blank" rel="noopener noreferrer" style={{ fontSize: "12px", color: "var(--text-muted)", textDecoration: "none" }}>• {r.label || r}</a>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: "flex", gap: "10px", paddingTop: "20px", borderTop: "1px solid var(--border)", flexWrap: "wrap" }}>
            {node.status !== "complete" ? (
              <>
                {!sprintActive && (
                  <button onClick={() => onStartSprint(node.id)} className="btn" style={{ flex: 1 }}>Start Sprint</button>
                )}
                <button onClick={() => onMarkComplete(node.id)} disabled={updating} className="btn-primary" style={{ flex: 1.5 }}>
                  {updating ? "Saving..." : "Mark Complete"}
                </button>
              </>
            ) : <div className="badge-green" style={{ width: "100%", textAlign: "center", padding: "8px" }}>✓ Topic Mastered</div>}
          </div>
        </div>
      </div>
    </>
  );
}

// ── Active Roadmap View ───────────────────────────────────────────────────────
function RoadmapView({ roadmap, onBack, onNodeUpdate }) {
  const [selectedNode, setSelectedNode] = useState(null);
  const [sprintNodeId, setSprintNodeId] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [toast, setToast] = useState(null);

  const nodes = roadmap.nodes || [];
  const completed = nodes.filter(n => n.status === "complete").length;
  const pct = nodes.length > 0 ? Math.round((completed / nodes.length) * 100) : 0;
  const currentNode = nodes.find(n => n.status === "in_progress");
  
  const diffObj = DIFFICULTIES.find(d => d.id === roadmap.difficulty) || DIFFICULTIES[1];

  const showToast = (msg, type = "") => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };

  const handleMarkComplete = async (nodeId) => {
    if (updating) return;
    setUpdating(true);
    try {
      const res = await authFetch(`/roadmap/nodes/${nodeId}/progress`, { method: "PATCH", body: JSON.stringify({ status: "complete" }) });
      if (!res.ok) throw new Error();
      await onNodeUpdate();
      setSelectedNode(null);
      setSprintNodeId(null);
      showToast("Node completed!", "success");
    } catch { showToast("Failed to update."); }
    setUpdating(false);
  };

  const handleResourcesRegenerated = (nodeId, newResources, newHistory) => {
    setSelectedNode(prev => prev && prev.id === nodeId
      ? { ...prev, resources: newResources, resources_history: newHistory }
      : prev
    );
  };

  return (
    <div className="fade-in-up" style={{ maxWidth: "1100px", margin: "0 auto", padding: "1.5rem 1rem" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "2rem", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <button onClick={onBack} className="btn" style={{ border: "none", padding: "0", background: "none", marginBottom: "12px", color: "var(--text-muted)" }}>← All Roadmaps</button>
          <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "24px", fontWeight: 800, marginBottom: "8px" }}>
            {GOALS.find(g => g.id === roadmap.goal)?.label || roadmap.goal}
          </div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "11px", padding: "3px 10px", borderRadius: "20px", background: `${diffObj.color}15`, color: diffObj.color, border: `1px solid ${diffObj.color}30`, fontWeight: 700 }}>{roadmap.difficulty}</span>
            <span className="badge-blue">{TIMEFRAMES.find(t => t.days === roadmap.timeframe_days)?.label || `${roadmap.timeframe_days}d`}</span>
            {currentNode && <span className="badge-accent" style={{ animation: "pulse 2s infinite" }}>▶ Playing: {currentNode.title}</span>}
          </div>
        </div>
      </div>

      {/* Progress */}
      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "16px", padding: "20px", marginBottom: "2rem", display: "flex", alignItems: "center", gap: "20px" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "20px", fontWeight: 800, fontFamily: "Space Grotesk" }}>{pct}%</div>
          <div style={{ fontSize: "10px", color: "var(--text-muted)", fontWeight: 700 }}>PROGRESS</div>
        </div>
        <div style={{ flex: 1, height: "8px", background: "rgba(255,255,255,0.05)", borderRadius: "4px", overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${pct}%`, background: roadmap.is_completed ? "var(--status-ok)" : "var(--accent)", borderRadius: "4px", transition: "width 0.8s cubic-bezier(0.4, 0, 0.2, 1)" }} />
        </div>
        <div style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 600 }}>{completed} / {nodes.length} nodes</div>
      </div>

      {roadmap.is_completed && (
        <div style={{ background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.3)", borderRadius: "12px", padding: "16px", marginBottom: "2rem", fontSize: "14px", color: "var(--status-ok)", textAlign: "center", fontWeight: 700 }}>
          🎉 Roadmap Mastered! Your knowledge is up to date.
        </div>
      )}

      {/* Node grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: "16px" }}>
        {nodes.map(node => {
          const tc = TYPE_COLORS[node.node_type] || TYPE_COLORS.concept;
          const sc = STATUS_CFG[node.status] || STATUS_CFG.pending;
          const isCurr = node.status === "in_progress";
          return (
            <div key={node.id} onClick={() => setSelectedNode(node)}
              className="premium-card group"
              style={{ cursor: "pointer", borderColor: isCurr ? "var(--accent)" : sc.border, position: "relative" }}>
              <div style={{ width: "28px", height: "28px", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Space Grotesk, sans-serif", fontSize: "11px", fontWeight: 800, marginBottom: "12px", background: node.status === "complete" ? "rgba(52,211,153,0.1)" : isCurr ? "var(--accent-bg)" : "rgba(255,255,255,0.06)", color: sc.color }}>
                {node.status === "complete" ? "✓" : String(node.order_index + 1).padStart(2, "0")}
              </div>
              <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "14px", fontWeight: 700, marginBottom: "6px", lineHeight: 1.3 }}>{node.title}</div>
              <div style={{ fontSize: "11px", color: "var(--text-muted)", lineHeight: 1.6, marginBottom: "14px", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{node.description}</div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "10px", padding: "2px 8px", borderRadius: "20px", background: tc.bg, color: tc.text, border: `1px solid ${tc.border}`, fontWeight: 700 }}>{node.node_type}</span>
                <span style={{ fontSize: "10px", color: "var(--text-muted)", fontWeight: 600 }}>◷ {node.hours}h</span>
              </div>
            </div>
          );
        })}
      </div>

      {selectedNode && (
        <NodePanel node={selectedNode} onClose={() => setSelectedNode(null)}
          onMarkComplete={handleMarkComplete} onStartSprint={id => setSprintNodeId(id)}
          sprintActive={sprintNodeId === selectedNode.id} updating={updating}
          onResourcesRegenerated={handleResourcesRegenerated} />
      )}
      {toast && (
        <div style={{ position: "fixed", bottom: "32px", right: "32px", background: "var(--bg-elevated)", border: `1px solid ${toast.type === "success" ? "var(--status-ok)" : "var(--border)"}`, borderRadius: "12px", padding: "12px 20px", fontSize: "13px", zIndex: 999, boxShadow: "0 10px 40px rgba(0,0,0,0.4)" }}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────
const Loader2 = ({ size = 24, className }) => <div style={{ width: size, height: size, border: "2px solid rgba(255,255,255,0.1)", borderTopColor: "var(--accent)", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} className={className} />;
const ExternalLink = ({ size = 12, color }) => <span style={{ fontSize: size, color }}>↗</span>;

export default function Roadmap() {
  const [phase, setPhase] = useState("loading"); // loading | dashboard | wizard | view
  const [roadmaps, setRoadmaps] = useState([]);
  const [activeRoadmap, setActiveRoadmap] = useState(null);
  const [canGenerate, setCanGenerate] = useState(true);
  const [slotsUsed, setSlotsUsed] = useState(0);
  const [activating, setActivating] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const fetchList = useCallback(async () => {
    try {
      const res = await authFetch("/roadmap/list");
      if (res.status === 401) { setPhase("dashboard"); return; }
      const data = await res.json();
      setRoadmaps(data.roadmaps || []);
      setCanGenerate(data.can_generate ?? true);
      setSlotsUsed(data.slots_used || 0);
      setPhase("dashboard");
    } catch { setPhase("dashboard"); }
  }, []);

  useEffect(() => { fetchList(); }, [fetchList]);

  const handleActivate = async (id) => {
    setActivating(id);
    try {
      const res = await authFetch(`/roadmap/activate/${id}`, { method: "POST" });
      const data = await res.json();
      setActiveRoadmap(data.roadmap);
      await fetchList();
      setPhase("view");
    } catch { console.error("Activate failed"); }
    setActivating(null);
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this roadmap?")) return;
    setDeleting(id);
    try {
      await authFetch(`/roadmap/${id}`, { method: "DELETE" });
      await fetchList();
    } catch { console.error("Delete failed"); }
    setDeleting(null);
  };

  const handleView = async (rm) => {
    if (!rm.is_active) {
      await handleActivate(rm.id);
    } else {
      setActiveRoadmap(rm);
      setPhase("view");
    }
  };

  const handleGenerated = (newRoadmap) => {
    setActiveRoadmap(newRoadmap);
    fetchList();
    setPhase("view");
  };

  const handleNodeUpdate = async () => {
    const res = await authFetch("/roadmap/me");
    const data = await res.json();
    const rm = data.roadmap || data;
    if (rm) setActiveRoadmap(rm);
    await fetchList();
  };

  if (phase === "loading") return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", gap: "16px" }}>
      <Loader2 size={32} />
      <div style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 600, letterSpacing: "0.1em" }}>SYNCING...</div>
    </div>
  );

  if (phase === "wizard") return (
    <Wizard onGenerated={handleGenerated} onCancel={() => setPhase("dashboard")} slotsUsed={slotsUsed} maxSlots={3} />
  );

  if (phase === "view" && activeRoadmap) return (
    <RoadmapView roadmap={activeRoadmap} onBack={() => setPhase("dashboard")} onNodeUpdate={handleNodeUpdate} />
  );

  return (
    <div className="fade-in-up" style={{ maxWidth: "960px", margin: "0 auto", padding: "1.5rem 1rem" }}>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: "2rem", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "28px", fontWeight: 800, marginBottom: "4px" }}>My Roadmaps</div>
          <div style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 600 }}>
            {slotsUsed} / 3 slots utilized {!canGenerate && "· Limit reached"}
          </div>
        </div>
        <button
          onClick={() => canGenerate ? setPhase("wizard") : null}
          disabled={!canGenerate}
          className={canGenerate ? "btn-primary" : "btn"}
          style={{ padding: "12px 24px" }}
        >
          {canGenerate ? "+ New Roadmap" : "Slots Full"}
        </button>
      </div>

      {/* Slot indicators */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "32px" }}>
        {Array.from({ length: 3 }).map((_, i) => {
          const activeRoadmaps = roadmaps.filter(r => !r.is_completed);
          const rm = activeRoadmaps[i];
          return (
            <div key={i} style={{ flex: 1, height: "6px", borderRadius: "3px", background: rm ? (rm.is_active ? "var(--accent)" : "var(--accent-bg)") : "rgba(255,255,255,0.06)", border: rm ? `1px solid var(--accent-border)` : "1px solid transparent" }} />
          );
        })}
      </div>

      {roadmaps.length === 0 ? (
        <div className="premium-card" style={{ textAlign: "center", padding: "80px 20px" }}>
          <div style={{ fontSize: "40px", marginBottom: "20px", color: "var(--accent)" }}>◈</div>
          <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "20px", fontWeight: 800, marginBottom: "8px" }}>Zero paths found.</div>
          <div style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "24px" }}>Kickoff your journey with a custom AI roadmap.</div>
          <button onClick={() => setPhase("wizard")} className="btn-primary">Generate First Roadmap</button>
        </div>
      ) : (
        <div className="fade-in-up">
          {/* Active (incomplete) roadmaps */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: "16px", marginBottom: "32px" }}>
            {roadmaps.filter(r => !r.is_completed).map(rm => (
              <RoadmapCard key={rm.id} rm={rm} onActivate={handleActivate} onView={handleView} onDelete={handleDelete} activating={activating === rm.id} />
            ))}
          </div>

          {/* Completed roadmaps */}
          {roadmaps.filter(r => r.is_completed).length > 0 && (
            <div>
              <div style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: "16px", fontWeight: 800 }}>Mastery History</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: "16px" }}>
                {roadmaps.filter(r => r.is_completed).map(rm => (
                  <RoadmapCard key={rm.id} rm={rm} onActivate={handleActivate} onView={handleView} onDelete={handleDelete} activating={activating === rm.id} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Global CSS for some keyframes if not in index.css */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes slideIn { from { transform: translateX(30px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }
      `}</style>
    </div>
  );
}
