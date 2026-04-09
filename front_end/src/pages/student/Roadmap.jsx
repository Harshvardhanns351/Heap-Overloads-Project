import { useState, useEffect, useCallback, useRef } from "react";

const API = "http://localhost:8000/api";
const tok = () => localStorage.getItem("token");
const authFetch = (url, opts = {}) =>
  fetch(`${API}${url}`, { ...opts, headers: { "Content-Type": "application/json", Authorization: `Bearer ${tok()}`, ...(opts.headers || {}) } });

// ── Constants ─────────────────────────────────────────────────────────────────
const GOALS = [
  { id: "crack placements", label: "Crack Placements", icon: "◈", desc: "FAANG & product companies", color: "#5B5BD6" },
  { id: "system design", label: "System Design", icon: "◉", desc: "Architect at scale", color: "#1D9E75" },
  { id: "competitive programming", label: "Competitive Programming", icon: "◆", desc: "ICPC, Codeforces", color: "#D85A30" },
  { id: "web development", label: "Full Stack Dev", icon: "◇", desc: "React + Node + Cloud", color: "#BA7517" },
  { id: "machine learning", label: "Machine Learning", icon: "◎", desc: "ML/AI, PyTorch, research", color: "#D4537E" },
  { id: "startup intern", label: "Startup Internship", icon: "◌", desc: "Generalist, ship fast", color: "#378ADD" },
];
const DURATIONS = [
  { weeks: 1, label: "1 Week", sub: "Crash course" },
  { weeks: 2, label: "2 Weeks", sub: "Focused sprint" },
  { weeks: 4, label: "1 Month", sub: "Comprehensive" },
  { weeks: 8, label: "2 Months", sub: "Deep mastery" },
];
const BRANCHES = ["CSE", "IT", "ECE", "EEE", "MECH", "CIVIL", "AIDS", "AIML"];
const TYPE_COLORS = {
  concept: { bg: "rgba(56,122,255,0.12)", text: "#7EB3FF", border: "rgba(56,122,255,0.25)" },
  practice: { bg: "rgba(239,159,39,0.12)", text: "#EF9F27", border: "rgba(239,159,39,0.25)" },
  project: { bg: "rgba(29,158,117,0.12)", text: "#1D9E75", border: "rgba(29,158,117,0.25)" },
};
const STATUS_CFG = {
  complete: { label: "Done", color: "#1D9E75", bg: "rgba(29,158,117,0.12)", border: "rgba(29,158,117,0.3)" },
  in_progress: { label: "In Progress", color: "#A8A8F8", bg: "rgba(91,91,214,0.12)", border: "rgba(91,91,214,0.4)" },
  pending: { label: "Pending", color: "#5A5A7A", bg: "rgba(255,255,255,0.04)", border: "rgba(255,255,255,0.08)" },
};

function getTopicsPreview(goal) {
  const g = (goal || "").toLowerCase();
  if (g.includes("placement") || g.includes("faang"))
    return ["Arrays & Strings", "Linked Lists", "Stacks & Queues", "Binary Trees", "Graph Algorithms", "Dynamic Programming", "System Design Basics", "Mock Interviews"];
  if (g.includes("system design"))
    return ["Distributed Systems", "Database Sharding", "Caching & Redis", "Message Queues", "Design URL Shortener", "Design Twitter Feed"];
  if (g.includes("web") || g.includes("full stack"))
    return ["HTML/CSS", "JavaScript Core", "React & Hooks", "Node.js & Express", "REST APIs", "PostgreSQL", "Deployment"];
  if (g.includes("ml") || g.includes("machine"))
    return ["Python & NumPy", "Linear Algebra", "ML Algorithms", "Scikit-learn", "Neural Networks", "PyTorch", "Model Deployment"];
  return ["CS Fundamentals", "Data Structures", "Algorithms", "DBMS & SQL", "OS Concepts", "Computer Networks", "Capstone Project"];
}

// ── Wizard Step 1: Goal ───────────────────────────────────────────────────────
function WizardGoal({ config, setConfig, onNext }) {
  return (
    <div>
      <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "26px", fontWeight: 700, marginBottom: "6px" }}>What's your goal?</div>
      <div style={{ fontSize: "14px", color: "var(--text-muted)", marginBottom: "24px" }}>Your roadmap is built around this.</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "12px", marginBottom: "20px" }}>
        {GOALS.map((g) => (
          <div key={g.id} onClick={() => setConfig(c => ({ ...c, goal: g.id, customGoal: "" }))}
            style={{ background: config.goal === g.id ? `${g.color}15` : "rgba(255,255,255,0.03)", border: `1.5px solid ${config.goal === g.id ? g.color : "rgba(255,255,255,0.08)"}`, borderRadius: "12px", padding: "16px", cursor: "pointer", transition: "all 0.15s" }}>
            <div style={{ fontSize: "20px", color: g.color, marginBottom: "8px" }}>{g.icon}</div>
            <div style={{ fontSize: "13px", fontWeight: 600, marginBottom: "4px" }}>{g.label}</div>
            <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>{g.desc}</div>
          </div>
        ))}
      </div>
      <div style={{ marginBottom: "24px" }}>
        <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Or describe your own</div>
        <input className="input" placeholder="e.g. get into a data science role at a fintech startup..."
          value={config.customGoal || ""}
          onChange={e => setConfig(c => ({ ...c, customGoal: e.target.value, goal: e.target.value ? "__custom__" : c.goal }))} />
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button className="btn btn-primary" disabled={!config.goal && !config.customGoal} onClick={onNext} style={{ fontSize: "13px" }}>Next — Duration →</button>
      </div>
    </div>
  );
}

// ── Wizard Step 2: Duration ───────────────────────────────────────────────────
function WizardDuration({ config, setConfig, onNext, onBack }) {
  const topics = getTopicsPreview(config.customGoal || config.goal);
  return (
    <div>
      <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "26px", fontWeight: 700, marginBottom: "6px" }}>Duration & details</div>
      <div style={{ fontSize: "14px", color: "var(--text-muted)", marginBottom: "24px" }}>How long do you have? Your roadmap adapts to fit.</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
        <div>
          <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "10px" }}>Duration</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "20px" }}>
            {DURATIONS.map(d => (
              <div key={d.weeks} onClick={() => setConfig(c => ({ ...c, durationWeeks: d.weeks }))}
                style={{ background: config.durationWeeks === d.weeks ? "rgba(91,91,214,0.12)" : "rgba(255,255,255,0.03)", border: `1.5px solid ${config.durationWeeks === d.weeks ? "#5B5BD6" : "rgba(255,255,255,0.08)"}`, borderRadius: "10px", padding: "14px", cursor: "pointer", textAlign: "center" }}>
                <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "16px", fontWeight: 700, color: config.durationWeeks === d.weeks ? "#A8A8F8" : "var(--text-primary)" }}>{d.label}</div>
                <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>{d.sub}</div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "10px" }}>Branch</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "20px" }}>
            {BRANCHES.map(b => (
              <span key={b} onClick={() => setConfig(c => ({ ...c, branch: b }))}
                style={{ padding: "5px 12px", borderRadius: "20px", fontSize: "12px", cursor: "pointer", background: config.branch === b ? "rgba(91,91,214,0.12)" : "rgba(255,255,255,0.04)", border: `1px solid ${config.branch === b ? "#5B5BD6" : "rgba(255,255,255,0.08)"}`, color: config.branch === b ? "#A8A8F8" : "var(--text-secondary)" }}>{b}</span>
            ))}
          </div>
          <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "6px" }}>Semester</div>
          <select className="input" value={config.semester} onChange={e => setConfig(c => ({ ...c, semester: parseInt(e.target.value) }))} style={{ cursor: "pointer" }}>
            {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>Semester {s}</option>)}
          </select>
        </div>
        <div>
          <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "10px" }}>Topics in your roadmap</div>
          <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px", padding: "14px" }}>
            {topics.map((t, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 0", fontSize: "13px", color: "var(--text-secondary)", borderBottom: i < topics.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: ["#5B5BD6","#1D9E75","#D85A30","#BA7517","#D4537E","#378ADD"][i % 6], flexShrink: 0, display: "inline-block" }} />
                {t}
              </div>
            ))}
            <div style={{ marginTop: "10px", fontSize: "11px", color: "rgba(255,255,255,0.25)" }}>AI personalizes this using your marks.</div>
          </div>
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: "24px" }}>
        <button className="btn btn-ghost" onClick={onBack} style={{ fontSize: "13px" }}>← Back</button>
        <button className="btn btn-primary" disabled={!config.durationWeeks || !config.branch} onClick={onNext} style={{ fontSize: "13px" }}>Review & Generate →</button>
      </div>
    </div>
  );
}

// ── Wizard Step 3: Confirm ────────────────────────────────────────────────────
function WizardConfirm({ config, setConfig, onGenerate, onBack, generating, error }) {
  const goalLabel = config.customGoal || GOALS.find(g => g.id === config.goal)?.label || config.goal;
  const durLabel = DURATIONS.find(d => d.weeks === config.durationWeeks)?.label || `${config.durationWeeks} weeks`;
  return (
    <div>
      <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "26px", fontWeight: 700, marginBottom: "6px" }}>Ready to generate</div>
      <div style={{ fontSize: "14px", color: "var(--text-muted)", marginBottom: "24px" }}>Review your selections. Your roadmap will be personalized using your academic marks.</div>
      <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px", overflow: "hidden", marginBottom: "20px" }}>
        {[
          { key: "Goal", val: goalLabel, step: 0 },
          { key: "Duration", val: durLabel, step: 1 },
          { key: "Branch & Semester", val: `${config.branch} · Semester ${config.semester}`, step: 1 },
        ].map(({ key, val, step }) => (
          <div key={key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <div>
              <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "3px" }}>{key}</div>
              <div style={{ fontSize: "14px", fontWeight: 500 }}>{val}</div>
            </div>
            <span onClick={() => setConfig(c => ({ ...c, _step: step }))} style={{ fontSize: "12px", color: "#5B5BD6", cursor: "pointer", padding: "3px 8px", borderRadius: "4px" }}>Edit</span>
          </div>
        ))}
      </div>
      <div style={{ background: "rgba(29,158,117,0.08)", border: "1px solid rgba(29,158,117,0.2)", borderRadius: "10px", padding: "12px 16px", fontSize: "13px", color: "#7DC9A8", marginBottom: "20px" }}>
        ◆ AI will analyze your uploaded marks to identify weak subjects and prioritize them.
      </div>
      {error && <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "10px", padding: "10px 14px", fontSize: "13px", color: "#F09595", marginBottom: "16px" }}>{error}</div>}
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <button className="btn btn-ghost" onClick={onBack} disabled={generating} style={{ fontSize: "13px" }}>← Back</button>
        <button onClick={onGenerate} disabled={generating} style={{ padding: "11px 24px", borderRadius: "10px", fontSize: "14px", fontWeight: 500, cursor: generating ? "not-allowed" : "pointer", background: generating ? "rgba(29,158,117,0.3)" : "#1D9E75", color: "#fff", border: "none", display: "flex", alignItems: "center", gap: "8px" }}>
          {generating ? <><span style={{ width: "14px", height: "14px", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.6s linear infinite", display: "inline-block" }} /> Generating...</> : "Start Generating →"}
        </button>
      </div>
    </div>
  );
}

// ── Wizard Orchestrator ───────────────────────────────────────────────────────
function Wizard({ onGenerated }) {
  const [step, setStep] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [config, setConfig] = useState({ goal: "", customGoal: "", durationWeeks: 4, branch: "CSE", semester: 6 });

  useEffect(() => {
    if (config._step !== undefined) {
      setStep(config._step);
      setConfig(c => { const n = { ...c }; delete n._step; return n; });
    }
  }, [config._step]);

  const STEPS = [{ label: "Choose goal" }, { label: "Duration & details" }, { label: "Confirm" }];

  const handleGenerate = async () => {
    setGenerating(true);
    setError("");
    try {
      const goal = config.customGoal || config.goal;
      const res = await authFetch("/roadmap/generate", {
        method: "POST",
        body: JSON.stringify({ goal, duration_weeks: config.durationWeeks, branch: config.branch, semester: config.semester }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Generation failed");
      onGenerated(data.roadmap);
    } catch (e) {
      setError(e.message || "Generation failed. Please try again.");
      setGenerating(false);
    }
  };

  return (
    <div style={{ maxWidth: "760px", margin: "0 auto", padding: "2rem 1rem" }}>
      {/* Step indicators */}
      <div style={{ display: "flex", alignItems: "center", marginBottom: "2.5rem" }}>
        {STEPS.map((s, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", flex: i < STEPS.length - 1 ? 1 : "none" }}>
            <div style={{ width: "32px", height: "32px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", fontWeight: 600, flexShrink: 0, background: i < step ? "#1D9E75" : i === step ? "#5B5BD6" : "rgba(255,255,255,0.06)", color: i <= step ? "#fff" : "var(--text-muted)", boxShadow: i === step ? "0 0 0 4px rgba(91,91,214,0.2)" : "none" }}>
              {i < step ? "✓" : i + 1}
            </div>
            <span style={{ fontSize: "13px", color: i === step ? "var(--text-primary)" : "var(--text-muted)", marginLeft: "8px", whiteSpace: "nowrap" }}>{s.label}</span>
            {i < STEPS.length - 1 && <div style={{ flex: 1, height: "1.5px", background: i < step ? "#1D9E75" : "rgba(255,255,255,0.08)", margin: "0 12px", minWidth: "30px" }} />}
          </div>
        ))}
      </div>
      {step === 0 && <WizardGoal config={config} setConfig={setConfig} onNext={() => setStep(1)} />}
      {step === 1 && <WizardDuration config={config} setConfig={setConfig} onNext={() => setStep(2)} onBack={() => setStep(0)} />}
      {step === 2 && <WizardConfirm config={config} setConfig={setConfig} onGenerate={handleGenerate} onBack={() => setStep(1)} generating={generating} error={error} />}
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
    <div style={{ background: "rgba(91,91,214,0.1)", border: "1px solid rgba(91,91,214,0.3)", borderRadius: "12px", padding: "16px", marginBottom: "20px", textAlign: "center" }}>
      <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "6px" }}>Sprint in progress</div>
      <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "36px", fontWeight: 700, color: "#A8A8F8" }}>{mm}:{ss}</div>
      <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px" }}>Stay focused. You're doing great.</div>
      <button onClick={() => setRunning(r => !r)} style={{ marginTop: "10px", padding: "5px 14px", borderRadius: "8px", fontSize: "12px", background: "transparent", border: "1px solid rgba(255,255,255,0.12)", color: "var(--text-muted)", cursor: "pointer" }}>
        {running ? "⏸ Pause" : "▶ Resume"}
      </button>
    </div>
  );
}

// ── Node Panel ────────────────────────────────────────────────────────────────
function NodePanel({ node, onClose, onMarkComplete, onStartSprint, sprintActive, updating }) {
  if (!node) return null;
  const tc = TYPE_COLORS[node.node_type] || TYPE_COLORS.concept;
  const sc = STATUS_CFG[node.status] || STATUS_CFG.pending;
  const resources = Array.isArray(node.resources) ? node.resources : [];

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 100 }} />
      <div style={{ position: "fixed", right: 0, top: 0, bottom: 0, width: "min(520px,90vw)", background: "#0D0D1A", borderLeft: "1px solid rgba(255,255,255,0.08)", zIndex: 101, overflowY: "auto", animation: "slideIn 0.2s ease" }}>
        <div style={{ padding: "28px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
            <div style={{ flex: 1, paddingRight: "12px" }}>
              <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "6px" }}>Node {String(node.order_index + 1).padStart(2, "0")}</div>
              <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "20px", fontWeight: 700, lineHeight: 1.3, marginBottom: "10px" }}>{node.title}</div>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                <span style={{ fontSize: "11px", padding: "3px 10px", borderRadius: "20px", background: tc.bg, color: tc.text, border: `1px solid ${tc.border}` }}>{node.node_type}</span>
                <span style={{ fontSize: "11px", padding: "3px 10px", borderRadius: "20px", background: sc.bg, color: sc.color }}>{sc.label}</span>
                <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>◷ {node.hours}h</span>
              </div>
            </div>
            <button onClick={onClose} style={{ background: "rgba(255,255,255,0.06)", border: "none", width: "32px", height: "32px", borderRadius: "8px", color: "var(--text-muted)", cursor: "pointer", fontSize: "16px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>✕</button>
          </div>

          <div style={{ fontSize: "14px", color: "var(--text-secondary)", lineHeight: 1.7, marginBottom: "24px", background: "rgba(255,255,255,0.03)", borderRadius: "10px", padding: "14px", border: "1px solid rgba(255,255,255,0.06)" }}>
            {node.description}
          </div>

          {sprintActive && <SprintTimer onComplete={() => {}} />}

          {resources.length > 0 && (
            <div style={{ marginBottom: "24px" }}>
              <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "10px" }}>Resources</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {resources.map((r, i) => (
                  <a key={i} href={r.url || "#"} target="_blank" rel="noopener noreferrer"
                    style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 14px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "10px", textDecoration: "none", color: "var(--text-primary)", fontSize: "13px", transition: "border-color 0.12s" }}>
                    <span style={{ width: "24px", height: "24px", borderRadius: "6px", background: "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", flexShrink: 0 }}>◈</span>
                    <span style={{ flex: 1 }}>{r.label || r}</span>
                    <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.25)" }}>↗</span>
                  </a>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: "flex", gap: "10px", paddingTop: "16px", borderTop: "1px solid rgba(255,255,255,0.06)", flexWrap: "wrap" }}>
            {node.status !== "complete" && (
              <>
                {!sprintActive && (
                  <button onClick={() => onStartSprint(node.id)} style={{ padding: "8px 16px", borderRadius: "8px", fontSize: "12px", background: "transparent", border: "1px solid rgba(255,255,255,0.12)", color: "var(--text-secondary)", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}>
                    ⚡ Start 25-min sprint
                  </button>
                )}
                <button onClick={() => onMarkComplete(node.id)} disabled={updating} style={{ padding: "8px 16px", borderRadius: "8px", fontSize: "12px", background: "#1D9E75", color: "#fff", border: "none", cursor: updating ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: "6px" }}>
                  {updating ? "Saving..." : "✓ Mark complete"}
                </button>
              </>
            )}
            {node.status === "complete" && <span style={{ fontSize: "13px", color: "#1D9E75", display: "flex", alignItems: "center", gap: "6px" }}>✓ Completed</span>}
          </div>
        </div>
      </div>
    </>
  );
}

// ── Roadmap View ──────────────────────────────────────────────────────────────
function RoadmapView({ roadmap, onRegenerate, onNodeUpdate }) {
  const [selectedNode, setSelectedNode] = useState(null);
  const [sprintNodeId, setSprintNodeId] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [toast, setToast] = useState(null);

  const nodes = roadmap.nodes || [];
  const completed = nodes.filter(n => n.status === "complete").length;
  const pct = nodes.length > 0 ? Math.round((completed / nodes.length) * 100) : 0;
  const currentNode = nodes.find(n => n.status === "in_progress");

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
      showToast("Node completed! Great work.", "success");
    } catch { showToast("Failed to update. Try again."); }
    setUpdating(false);
  };

  return (
    <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "2rem 1rem" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "1.5rem", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "22px", fontWeight: 700, marginBottom: "6px" }}>My Learning Roadmap</div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "12px", padding: "3px 10px", borderRadius: "20px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "var(--text-muted)" }}>Goal: {roadmap.goal}</span>
            <span style={{ fontSize: "12px", padding: "3px 10px", borderRadius: "20px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "var(--text-muted)" }}>Sem {roadmap.semester} · {roadmap.branch}</span>
            {currentNode && <span style={{ fontSize: "12px", padding: "3px 10px", borderRadius: "20px", background: "rgba(91,91,214,0.1)", border: "1px solid rgba(91,91,214,0.3)", color: "#A8A8F8" }}>▶ Now: {currentNode.title}</span>}
          </div>
        </div>
        <button onClick={onRegenerate} style={{ padding: "7px 14px", borderRadius: "8px", fontSize: "12px", background: "transparent", border: "1px solid rgba(255,255,255,0.12)", color: "var(--text-muted)", cursor: "pointer" }}>↻ Regenerate</button>
      </div>

      {/* Progress */}
      <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px", padding: "16px 20px", marginBottom: "2rem", display: "flex", alignItems: "center", gap: "16px" }}>
        <div style={{ fontSize: "12px", color: "var(--text-muted)", whiteSpace: "nowrap" }}>{completed} / {nodes.length} nodes</div>
        <div style={{ flex: 1, height: "6px", background: "rgba(255,255,255,0.06)", borderRadius: "3px", overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${pct}%`, background: "linear-gradient(90deg,#5B5BD6,#1D9E75)", borderRadius: "3px", transition: "width 0.6s ease" }} />
        </div>
        <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "18px", fontWeight: 700, color: "#5B5BD6", minWidth: "44px", textAlign: "right" }}>{pct}%</div>
      </div>

      {/* Node grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: "12px" }}>
        {nodes.map(node => {
          const tc = TYPE_COLORS[node.node_type] || TYPE_COLORS.concept;
          const sc = STATUS_CFG[node.status] || STATUS_CFG.pending;
          return (
            <div key={node.id} onClick={() => setSelectedNode(node)}
              style={{ background: "rgba(255,255,255,0.03)", borderRadius: "14px", padding: "18px", cursor: "pointer", transition: "all 0.15s", position: "relative", overflow: "hidden", border: `1.5px solid ${sc.border}`, boxShadow: node.status === "in_progress" ? "0 0 0 1px rgba(91,91,214,0.2)" : "none" }}>
              {/* Status bar */}
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "3px", background: sc.color, animation: node.status === "in_progress" ? "pulseBar 2s ease-in-out infinite" : "none" }} />
              <div style={{ width: "28px", height: "28px", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Space Grotesk, sans-serif", fontSize: "12px", fontWeight: 700, marginBottom: "12px", background: node.status === "complete" ? "rgba(29,158,117,0.15)" : node.status === "in_progress" ? "rgba(91,91,214,0.15)" : "rgba(255,255,255,0.06)", color: sc.color }}>
                {node.status === "complete" ? "✓" : String(node.order_index + 1).padStart(2, "0")}
              </div>
              <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "14px", fontWeight: 600, marginBottom: "6px", lineHeight: 1.3 }}>{node.title}</div>
              <div style={{ fontSize: "12px", color: "var(--text-muted)", lineHeight: 1.6, marginBottom: "12px", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{node.description}</div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "10px", padding: "3px 8px", borderRadius: "20px", background: tc.bg, color: tc.text, border: `1px solid ${tc.border}` }}>{node.node_type}</span>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>◷ {node.hours}h</span>
                  <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: sc.color }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {selectedNode && (
        <NodePanel node={selectedNode} onClose={() => setSelectedNode(null)}
          onMarkComplete={handleMarkComplete} onStartSprint={id => setSprintNodeId(id)}
          sprintActive={sprintNodeId === selectedNode.id} updating={updating} />
      )}
      {toast && (
        <div style={{ position: "fixed", bottom: "24px", right: "24px", background: "rgba(30,30,46,0.95)", border: `1px solid ${toast.type === "success" ? "#1D9E75" : "rgba(255,255,255,0.12)"}`, borderRadius: "10px", padding: "12px 18px", fontSize: "13px", zIndex: 999, color: toast.type === "success" ? "#7DC9A8" : "var(--text-primary)" }}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}

// ── Root Component ────────────────────────────────────────────────────────────
export default function Roadmap() {
  const [phase, setPhase] = useState("loading");
  const [roadmap, setRoadmap] = useState(null);
  const [error, setError] = useState("");

  const fetchRoadmap = useCallback(async () => {
    try {
      const res = await authFetch("/roadmap/me");
      const data = await res.json();
      if (res.status === 401) { setError("Session expired. Please log in again."); return; }
      // Support both {roadmap, nodes} and {nodes} response shapes
      const rm = data.roadmap || (data.nodes ? data : null);
      if (rm && (rm.nodes?.length > 0)) {
        setRoadmap(rm);
        setPhase("view");
      } else {
        setPhase("wizard");
      }
    } catch { setPhase("wizard"); }
  }, []);

  useEffect(() => { fetchRoadmap(); }, [fetchRoadmap]);

  const handleGenerated = (newRoadmap) => { setRoadmap(newRoadmap); setPhase("view"); };

  const handleRegenerate = async () => {
    setPhase("generating");
    try {
      const res = await authFetch("/roadmap/regenerate", { method: "POST" });
      const data = await res.json();
      const rm = data.roadmap || data;
      setRoadmap(rm);
      setPhase("view");
    } catch { setPhase("view"); }
  };

  if (error) return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh", color: "#F09595" }}>{error}</div>;

  return (
    <div className="fade-in-up">
      {phase === "loading" && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", gap: "16px" }}>
          <div style={{ width: "48px", height: "48px", border: "3px solid rgba(91,91,214,0.2)", borderTopColor: "#5B5BD6", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
          <div style={{ fontSize: "14px", color: "var(--text-muted)" }}>Loading your roadmap...</div>
        </div>
      )}
      {phase === "wizard" && <Wizard onGenerated={handleGenerated} />}
      {phase === "generating" && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", gap: "16px" }}>
          <div style={{ width: "56px", height: "56px", border: "3px solid rgba(29,158,117,0.2)", borderTopColor: "#1D9E75", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
          <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "20px", fontWeight: 600 }}>Building your roadmap</div>
          <div style={{ fontSize: "14px", color: "var(--text-muted)", maxWidth: "360px", textAlign: "center" }}>AI is analyzing your marks and crafting a personalized path. This takes ~10 seconds.</div>
        </div>
      )}
      {phase === "view" && roadmap && (
        <RoadmapView roadmap={roadmap} onRegenerate={handleRegenerate} onNodeUpdate={fetchRoadmap} />
      )}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes slideIn { from { transform: translateX(40px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes pulseBar { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
      `}</style>
    </div>
  );
}
