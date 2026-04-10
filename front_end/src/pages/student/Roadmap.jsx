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
  { id: "crack placements", label: "Crack Placements", icon: "◈", color: "#5B5BD6" },
  { id: "system design", label: "System Design", icon: "◉", color: "#1D9E75" },
  { id: "competitive programming", label: "Competitive Programming", icon: "◆", color: "#D85A30" },
  { id: "web development", label: "Full Stack Dev", icon: "◇", color: "#BA7517" },
  { id: "machine learning", label: "Machine Learning", icon: "◎", color: "#D4537E" },
  { id: "startup intern", label: "Startup Internship", icon: "◌", color: "#378ADD" },
];
const DIFFICULTIES = [
  { id: "beginner", label: "Basics", desc: "Fundamentals first", color: "#1D9E75" },
  { id: "intermediate", label: "Intermediate", desc: "Balanced depth", color: "#5B5BD6" },
  { id: "advanced", label: "Advanced", desc: "Deep mastery", color: "#D85A30" },
];
const TIMEFRAMES = [
  { days: 1, label: "1 Day", sub: "Quick overview" },
  { days: 5, label: "5 Days", sub: "Crash course" },
  { days: 10, label: "10 Days", sub: "Focused sprint" },
  { days: 15, label: "15 Days", sub: "Solid foundation" },
  { days: 30, label: "1 Month", sub: "Comprehensive" },
];
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
const DIFF_COLORS = { beginner: "#1D9E75", intermediate: "#5B5BD6", advanced: "#D85A30" };

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
            <div style={{ width: "30px", height: "30px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 600, flexShrink: 0, background: i < step ? "#1D9E75" : i === step ? "#5B5BD6" : "rgba(255,255,255,0.06)", color: i <= step ? "#fff" : "var(--text-muted)", boxShadow: i === step ? "0 0 0 3px rgba(91,91,214,0.2)" : "none" }}>
              {i < step ? "✓" : i + 1}
            </div>
            <span style={{ fontSize: "12px", color: i === step ? "var(--text-primary)" : "var(--text-muted)", marginLeft: "8px", whiteSpace: "nowrap" }}>{s}</span>
            {i < STEPS.length - 1 && <div style={{ flex: 1, height: "1px", background: i < step ? "#1D9E75" : "rgba(255,255,255,0.08)", margin: "0 10px", minWidth: "20px" }} />}
          </div>
        ))}
      </div>

      {/* Slot indicator */}
      <div style={{ display: "flex", gap: "6px", marginBottom: "20px" }}>
        {Array.from({ length: maxSlots }).map((_, i) => (
          <div key={i} style={{ flex: 1, height: "4px", borderRadius: "2px", background: i < slotsUsed ? "#5B5BD6" : "rgba(255,255,255,0.08)" }} />
        ))}
      </div>
      <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "20px" }}>Roadmap {slotsUsed + 1} of {maxSlots}</div>

      {/* Step 0: Goal */}
      {step === 0 && (
        <div>
          <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "22px", fontWeight: 700, marginBottom: "6px" }}>What do you want to learn?</div>
          <div style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "20px" }}>Pick a goal — your roadmap depth and topics are built around this.</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "10px", marginBottom: "16px" }}>
            {GOALS.map(g => (
              <div key={g.id} onClick={() => setCfg(c => ({ ...c, goal: g.id, customGoal: "" }))}
                style={{ background: cfg.goal === g.id ? `${g.color}15` : "rgba(255,255,255,0.03)", border: `1.5px solid ${cfg.goal === g.id ? g.color : "rgba(255,255,255,0.08)"}`, borderRadius: "12px", padding: "14px", cursor: "pointer", transition: "all 0.15s" }}>
                <div style={{ fontSize: "18px", color: g.color, marginBottom: "6px" }}>{g.icon}</div>
                <div style={{ fontSize: "13px", fontWeight: 600 }}>{g.label}</div>
              </div>
            ))}
          </div>
          <input className="input" placeholder="Or type a custom goal..." value={cfg.customGoal || ""}
            onChange={e => setCfg(c => ({ ...c, customGoal: e.target.value, goal: e.target.value ? "__custom__" : c.goal }))}
            style={{ marginBottom: "20px" }} />
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <button className="btn btn-ghost" onClick={onCancel} style={{ fontSize: "13px" }}>Cancel</button>
            <button className="btn btn-primary" disabled={!cfg.goal && !cfg.customGoal} onClick={() => setStep(1)} style={{ fontSize: "13px" }}>Next →</button>
          </div>
        </div>
      )}

      {/* Step 1: Difficulty + Timeframe */}
      {step === 1 && (
        <div>
          <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "22px", fontWeight: 700, marginBottom: "6px" }}>Difficulty & Timeframe</div>
          <div style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "20px" }}>These control the depth of concepts and number of nodes.</div>

          <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "10px" }}>Difficulty Level</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "10px", marginBottom: "24px" }}>
            {DIFFICULTIES.map(d => (
              <div key={d.id} onClick={() => setCfg(c => ({ ...c, difficulty: d.id }))}
                style={{ background: cfg.difficulty === d.id ? `${d.color}15` : "rgba(255,255,255,0.03)", border: `1.5px solid ${cfg.difficulty === d.id ? d.color : "rgba(255,255,255,0.08)"}`, borderRadius: "12px", padding: "16px", cursor: "pointer", textAlign: "center" }}>
                <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "15px", fontWeight: 700, color: cfg.difficulty === d.id ? d.color : "var(--text-primary)", marginBottom: "4px" }}>{d.label}</div>
                <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>{d.desc}</div>
              </div>
            ))}
          </div>

          <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "10px" }}>Timeframe</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: "8px", marginBottom: "24px" }}>
            {TIMEFRAMES.map(t => (
              <div key={t.days} onClick={() => setCfg(c => ({ ...c, timeframe_days: t.days }))}
                style={{ background: cfg.timeframe_days === t.days ? "rgba(91,91,214,0.12)" : "rgba(255,255,255,0.03)", border: `1.5px solid ${cfg.timeframe_days === t.days ? "#5B5BD6" : "rgba(255,255,255,0.08)"}`, borderRadius: "10px", padding: "12px 8px", cursor: "pointer", textAlign: "center" }}>
                <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "14px", fontWeight: 700, color: cfg.timeframe_days === t.days ? "#A8A8F8" : "var(--text-primary)" }}>{t.label}</div>
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
            <button className="btn btn-ghost" onClick={() => setStep(0)} style={{ fontSize: "13px" }}>← Back</button>
            <button className="btn btn-primary" onClick={() => setStep(2)} style={{ fontSize: "13px" }}>Review →</button>
          </div>
        </div>
      )}

      {/* Step 2: Confirm */}
      {step === 2 && (
        <div>
          <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "22px", fontWeight: 700, marginBottom: "6px" }}>Ready to generate</div>
          <div style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "20px" }}>AI will personalize this using your uploaded marks.</div>
          <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px", overflow: "hidden", marginBottom: "20px" }}>
            {[
              { k: "Goal", v: cfg.customGoal || GOALS.find(g => g.id === cfg.goal)?.label || cfg.goal },
              { k: "Difficulty", v: DIFFICULTIES.find(d => d.id === cfg.difficulty)?.label },
              { k: "Timeframe", v: TIMEFRAMES.find(t => t.days === cfg.timeframe_days)?.label },
              { k: "Branch & Semester", v: `${cfg.branch} · Semester ${cfg.semester}` },
            ].map(({ k, v }) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>{k}</span>
                <span style={{ fontSize: "13px", fontWeight: 500 }}>{v}</span>
              </div>
            ))}
          </div>
          {error && <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "10px", padding: "10px 14px", fontSize: "13px", color: "#F09595", marginBottom: "16px" }}>{error}</div>}
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <button className="btn btn-ghost" onClick={() => setStep(1)} disabled={generating} style={{ fontSize: "13px" }}>← Back</button>
            <button onClick={handleGenerate} disabled={generating}
              style={{ padding: "10px 22px", borderRadius: "10px", fontSize: "13px", fontWeight: 500, cursor: generating ? "not-allowed" : "pointer", background: generating ? "rgba(29,158,117,0.3)" : "#1D9E75", color: "#fff", border: "none", display: "flex", alignItems: "center", gap: "8px" }}>
              {generating ? <><span style={{ width: "13px", height: "13px", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.6s linear infinite", display: "inline-block" }} /> Generating...</> : "Generate Roadmap →"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Roadmap Card (dashboard) ──────────────────────────────────────────────────
function RoadmapCard({ rm, onActivate, onView, onDelete, activating }) {
  const diffColor = DIFF_COLORS[rm.difficulty] || "#5B5BD6";
  const goalObj = GOALS.find(g => g.id === rm.goal);
  return (
    <div style={{ background: rm.is_active ? "rgba(91,91,214,0.06)" : "rgba(255,255,255,0.03)", border: `1.5px solid ${rm.is_active ? "rgba(91,91,214,0.4)" : rm.is_completed ? "rgba(29,158,117,0.3)" : "rgba(255,255,255,0.08)"}`, borderRadius: "14px", padding: "20px", position: "relative", transition: "all 0.15s" }}>
      {rm.is_active && <div style={{ position: "absolute", top: "12px", right: "12px", fontSize: "10px", padding: "3px 8px", borderRadius: "20px", background: "rgba(91,91,214,0.2)", color: "#A8A8F8", fontWeight: 600 }}>ACTIVE</div>}
      {rm.is_completed && !rm.is_active && <div style={{ position: "absolute", top: "12px", right: "12px", fontSize: "10px", padding: "3px 8px", borderRadius: "20px", background: "rgba(29,158,117,0.15)", color: "#1D9E75", fontWeight: 600 }}>COMPLETED</div>}

      <div style={{ fontSize: "20px", marginBottom: "8px" }}>{goalObj?.icon || "◈"}</div>
      <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "15px", fontWeight: 700, marginBottom: "4px" }}>{goalObj?.label || rm.goal}</div>
      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "14px" }}>
        <span style={{ fontSize: "10px", padding: "2px 8px", borderRadius: "20px", background: `${diffColor}15`, color: diffColor, border: `1px solid ${diffColor}30` }}>{rm.difficulty}</span>
        <span style={{ fontSize: "10px", padding: "2px 8px", borderRadius: "20px", background: "rgba(255,255,255,0.04)", color: "var(--text-muted)", border: "1px solid rgba(255,255,255,0.08)" }}>
          {TIMEFRAMES.find(t => t.days === rm.timeframe_days)?.label || `${rm.timeframe_days}d`}
        </span>
        <span style={{ fontSize: "10px", padding: "2px 8px", borderRadius: "20px", background: "rgba(255,255,255,0.04)", color: "var(--text-muted)", border: "1px solid rgba(255,255,255,0.08)" }}>{rm.branch}</span>
      </div>

      {/* Progress bar */}
      <div style={{ marginBottom: "14px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
          <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>{rm.completed_nodes}/{rm.total_nodes} nodes</span>
          <span style={{ fontSize: "11px", fontWeight: 600, color: rm.is_completed ? "#1D9E75" : "#5B5BD6" }}>{rm.completion_pct}%</span>
        </div>
        <div style={{ height: "4px", background: "rgba(255,255,255,0.06)", borderRadius: "2px", overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${rm.completion_pct}%`, background: rm.is_completed ? "#1D9E75" : "linear-gradient(90deg,#5B5BD6,#1D9E75)", borderRadius: "2px", transition: "width 0.5s" }} />
        </div>
      </div>

      <div style={{ display: "flex", gap: "8px" }}>
        <button onClick={() => onView(rm)} style={{ flex: 1, padding: "8px", borderRadius: "8px", fontSize: "12px", background: rm.is_active ? "#5B5BD6" : "rgba(255,255,255,0.06)", color: rm.is_active ? "#fff" : "var(--text-secondary)", border: "none", cursor: "pointer", fontWeight: 500 }}>
          {rm.is_active ? "Continue →" : "View"}
        </button>
        {!rm.is_active && (
          <button onClick={() => onActivate(rm.id)} disabled={activating} style={{ flex: 1, padding: "8px", borderRadius: "8px", fontSize: "12px", background: "rgba(91,91,214,0.1)", color: "#A8A8F8", border: "1px solid rgba(91,91,214,0.3)", cursor: activating ? "not-allowed" : "pointer" }}>
            {activating ? "..." : "Switch to this"}
          </button>
        )}
        <button onClick={() => onDelete(rm.id)} style={{ padding: "8px 10px", borderRadius: "8px", fontSize: "12px", background: "transparent", color: "rgba(239,68,68,0.5)", border: "1px solid rgba(239,68,68,0.15)", cursor: "pointer" }}>✕</button>
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
    <div style={{ background: "rgba(91,91,214,0.1)", border: "1px solid rgba(91,91,214,0.3)", borderRadius: "12px", padding: "16px", marginBottom: "20px", textAlign: "center" }}>
      <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "6px" }}>Sprint in progress</div>
      <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "36px", fontWeight: 700, color: "#A8A8F8" }}>{mm}:{ss}</div>
      <button onClick={() => setRunning(r => !r)} style={{ marginTop: "8px", padding: "5px 14px", borderRadius: "8px", fontSize: "12px", background: "transparent", border: "1px solid rgba(255,255,255,0.12)", color: "var(--text-muted)", cursor: "pointer" }}>
        {running ? "⏸ Pause" : "▶ Resume"}
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
    } catch {
      // silently fail — user can retry
    }
    setRegenLoading(false);
  };

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 100 }} />
      <div style={{ position: "fixed", right: 0, top: 0, bottom: 0, width: "min(500px,90vw)", background: "#0D0D1A", borderLeft: "1px solid rgba(255,255,255,0.08)", zIndex: 101, overflowY: "auto", animation: "slideIn 0.2s ease" }}>
        <div style={{ padding: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
            <div style={{ flex: 1, paddingRight: "12px" }}>
              <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "4px" }}>Node {String(node.order_index + 1).padStart(2, "0")}</div>
              <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "18px", fontWeight: 700, lineHeight: 1.3, marginBottom: "10px" }}>{node.title}</div>
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                <span style={{ fontSize: "10px", padding: "3px 8px", borderRadius: "20px", background: tc.bg, color: tc.text, border: `1px solid ${tc.border}` }}>{node.node_type}</span>
                <span style={{ fontSize: "10px", padding: "3px 8px", borderRadius: "20px", background: sc.bg, color: sc.color }}>{sc.label}</span>
                <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>◷ {node.hours}h</span>
              </div>
            </div>
            <button onClick={onClose} style={{ background: "rgba(255,255,255,0.06)", border: "none", width: "30px", height: "30px", borderRadius: "8px", color: "var(--text-muted)", cursor: "pointer", fontSize: "14px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>✕</button>
          </div>
          <div style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.7, marginBottom: "20px", background: "rgba(255,255,255,0.03)", borderRadius: "10px", padding: "12px", border: "1px solid rgba(255,255,255,0.06)" }}>{node.description}</div>
          {sprintActive && <SprintTimer onComplete={() => {}} />}

          {/* Resources */}
          <div style={{ marginBottom: "20px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
              <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Resources</div>
              <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                {history.length > 0 && (
                  <button onClick={() => setShowHistory(h => !h)} style={{ fontSize: "10px", background: "transparent", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "6px", color: "rgba(255,255,255,0.4)", cursor: "pointer", padding: "2px 8px" }}>
                    {showHistory ? "Hide history" : `History (${history.length})`}
                  </button>
                )}
                <button onClick={handleRegenResources} disabled={regenLoading} style={{ fontSize: "10px", background: regenLoading ? "rgba(91,91,214,0.1)" : "rgba(91,91,214,0.15)", border: "1px solid rgba(91,91,214,0.3)", borderRadius: "6px", color: regenLoading ? "rgba(255,255,255,0.3)" : "#8B8BF5", cursor: regenLoading ? "not-allowed" : "pointer", padding: "2px 8px" }}>
                  {regenLoading ? "⟳ Generating..." : "⟳ Regenerate"}
                </button>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {resources.map((r, i) => (
                <a key={i} href={r.url || "#"} target="_blank" rel="noopener noreferrer"
                  style={{ display: "flex", alignItems: "center", gap: "10px", padding: "9px 12px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", textDecoration: "none", color: "var(--text-primary)", fontSize: "13px" }}>
                  <span style={{ width: "22px", height: "22px", borderRadius: "5px", background: "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", flexShrink: 0 }}>◈</span>
                  <span style={{ flex: 1 }}>{r.label || r}</span>
                  {r.tag && <span style={{ fontSize: "9px", padding: "1px 6px", borderRadius: "4px", background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.35)", whiteSpace: "nowrap" }}>{r.tag}</span>}
                  <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.25)" }}>↗</span>
                </a>
              ))}
              {resources.length === 0 && !regenLoading && (
                <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.25)", padding: "8px 0" }}>No resources yet — click Regenerate to fetch some.</div>
              )}
            </div>

            {/* History */}
            {showHistory && history.length > 0 && (
              <div style={{ marginTop: "14px" }}>
                {history.map((batch, bi) => (
                  <div key={bi} style={{ marginBottom: "10px" }}>
                    <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.2)", marginBottom: "5px" }}>Previous set {bi + 1}</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                      {batch.map((r, i) => (
                        <a key={i} href={r.url || "#"} target="_blank" rel="noopener noreferrer"
                          style={{ display: "flex", alignItems: "center", gap: "10px", padding: "7px 12px", background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "8px", textDecoration: "none", color: "rgba(255,255,255,0.45)", fontSize: "12px" }}>
                          <span style={{ width: "18px", height: "18px", borderRadius: "4px", background: "rgba(255,255,255,0.04)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "9px", flexShrink: 0 }}>◈</span>
                          <span style={{ flex: 1 }}>{r.label || r}</span>
                          <span style={{ fontSize: "9px", color: "rgba(255,255,255,0.15)" }}>↗</span>
                        </a>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: "flex", gap: "8px", paddingTop: "14px", borderTop: "1px solid rgba(255,255,255,0.06)", flexWrap: "wrap" }}>
            {node.status !== "complete" ? (
              <>
                {!sprintActive && (
                  <button onClick={() => onStartSprint(node.id)} style={{ padding: "8px 14px", borderRadius: "8px", fontSize: "12px", background: "transparent", border: "1px solid rgba(255,255,255,0.12)", color: "var(--text-secondary)", cursor: "pointer" }}>⚡ Start 25-min sprint</button>
                )}
                <button onClick={() => onMarkComplete(node.id)} disabled={updating} style={{ padding: "8px 14px", borderRadius: "8px", fontSize: "12px", background: "#1D9E75", color: "#fff", border: "none", cursor: updating ? "not-allowed" : "pointer" }}>
                  {updating ? "Saving..." : "✓ Mark complete"}
                </button>
              </>
            ) : <span style={{ fontSize: "13px", color: "#1D9E75" }}>✓ Completed</span>}
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
  const diffColor = DIFF_COLORS[roadmap.difficulty] || "#5B5BD6";

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

  // Update selected node in-place after resource regeneration (no full reload needed)
  const handleResourcesRegenerated = (nodeId, newResources, newHistory) => {
    setSelectedNode(prev => prev && prev.id === nodeId
      ? { ...prev, resources: newResources, resources_history: newHistory }
      : prev
    );
  };

  return (
    <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "1.5rem 1rem" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "1.5rem", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <button onClick={onBack} style={{ fontSize: "12px", background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: "0 0 8px 0", display: "flex", alignItems: "center", gap: "4px" }}>← All Roadmaps</button>
          <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "20px", fontWeight: 700, marginBottom: "6px" }}>
            {GOALS.find(g => g.id === roadmap.goal)?.label || roadmap.goal}
          </div>
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "20px", background: `${diffColor}15`, color: diffColor, border: `1px solid ${diffColor}30` }}>{roadmap.difficulty}</span>
            <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "20px", background: "rgba(255,255,255,0.04)", color: "var(--text-muted)", border: "1px solid rgba(255,255,255,0.08)" }}>
              {TIMEFRAMES.find(t => t.days === roadmap.timeframe_days)?.label || `${roadmap.timeframe_days}d`}
            </span>
            {currentNode && <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "20px", background: "rgba(91,91,214,0.1)", color: "#A8A8F8", border: "1px solid rgba(91,91,214,0.3)" }}>▶ {currentNode.title}</span>}
          </div>
        </div>
      </div>

      {/* Progress */}
      <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px", padding: "14px 18px", marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "14px" }}>
        <span style={{ fontSize: "12px", color: "var(--text-muted)", whiteSpace: "nowrap" }}>{completed}/{nodes.length} nodes</span>
        <div style={{ flex: 1, height: "6px", background: "rgba(255,255,255,0.06)", borderRadius: "3px", overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${pct}%`, background: roadmap.is_completed ? "#1D9E75" : "linear-gradient(90deg,#5B5BD6,#1D9E75)", borderRadius: "3px", transition: "width 0.6s" }} />
        </div>
        <span style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "16px", fontWeight: 700, color: roadmap.is_completed ? "#1D9E75" : "#5B5BD6", minWidth: "40px", textAlign: "right" }}>{pct}%</span>
      </div>

      {roadmap.is_completed && (
        <div style={{ background: "rgba(29,158,117,0.08)", border: "1px solid rgba(29,158,117,0.25)", borderRadius: "12px", padding: "14px 18px", marginBottom: "1.5rem", fontSize: "14px", color: "#7DC9A8", textAlign: "center" }}>
          🎉 Roadmap completed! Go back to generate a new one.
        </div>
      )}

      {/* Node grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: "12px" }}>
        {nodes.map(node => {
          const tc = TYPE_COLORS[node.node_type] || TYPE_COLORS.concept;
          const sc = STATUS_CFG[node.status] || STATUS_CFG.pending;
          return (
            <div key={node.id} onClick={() => setSelectedNode(node)}
              style={{ background: "rgba(255,255,255,0.03)", borderRadius: "14px", padding: "16px", cursor: "pointer", transition: "all 0.15s", position: "relative", overflow: "hidden", border: `1.5px solid ${sc.border}` }}>
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "3px", background: sc.color, animation: node.status === "in_progress" ? "pulseBar 2s ease-in-out infinite" : "none" }} />
              <div style={{ width: "26px", height: "26px", borderRadius: "7px", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Space Grotesk, sans-serif", fontSize: "11px", fontWeight: 700, marginBottom: "10px", background: node.status === "complete" ? "rgba(29,158,117,0.15)" : node.status === "in_progress" ? "rgba(91,91,214,0.15)" : "rgba(255,255,255,0.06)", color: sc.color }}>
                {node.status === "complete" ? "✓" : String(node.order_index + 1).padStart(2, "0")}
              </div>
              <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "13px", fontWeight: 600, marginBottom: "5px", lineHeight: 1.3 }}>{node.title}</div>
              <div style={{ fontSize: "11px", color: "var(--text-muted)", lineHeight: 1.6, marginBottom: "10px", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{node.description}</div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "10px", padding: "2px 7px", borderRadius: "20px", background: tc.bg, color: tc.text, border: `1px solid ${tc.border}` }}>{node.node_type}</span>
                <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>◷ {node.hours}h</span>
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
        <div style={{ position: "fixed", bottom: "24px", right: "24px", background: "rgba(20,20,36,0.95)", border: `1px solid ${toast.type === "success" ? "#1D9E75" : "rgba(255,255,255,0.12)"}`, borderRadius: "10px", padding: "10px 16px", fontSize: "13px", zIndex: 999, color: toast.type === "success" ? "#7DC9A8" : "var(--text-primary)" }}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────
export default function Roadmap() {
  const [phase, setPhase] = useState("loading"); // loading | dashboard | wizard | generating | view
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
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", gap: "14px" }}>
      <div style={{ width: "44px", height: "44px", border: "3px solid rgba(91,91,214,0.2)", borderTopColor: "#5B5BD6", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <div style={{ fontSize: "13px", color: "var(--text-muted)" }}>Loading roadmaps...</div>
    </div>
  );

  if (phase === "generating") return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", gap: "14px" }}>
      <div style={{ width: "52px", height: "52px", border: "3px solid rgba(29,158,117,0.2)", borderTopColor: "#1D9E75", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "18px", fontWeight: 600 }}>Building your roadmap</div>
      <div style={{ fontSize: "13px", color: "var(--text-muted)", maxWidth: "320px", textAlign: "center" }}>AI is crafting a personalized path. ~10 seconds.</div>
    </div>
  );

  if (phase === "wizard") return (
    <Wizard onGenerated={handleGenerated} onCancel={() => setPhase("dashboard")} slotsUsed={slotsUsed} maxSlots={3} />
  );

  if (phase === "view" && activeRoadmap) return (
    <RoadmapView roadmap={activeRoadmap} onBack={() => setPhase("dashboard")} onNodeUpdate={handleNodeUpdate} />
  );

  // Dashboard
  return (
    <div className="fade-in-up" style={{ maxWidth: "900px", margin: "0 auto", padding: "1.5rem 1rem" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "1.5rem", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "22px", fontWeight: 700, marginBottom: "4px" }}>My Roadmaps</div>
          <div style={{ fontSize: "13px", color: "var(--text-muted)" }}>
            {slotsUsed}/{3} slots used
            {!canGenerate && " · Complete all roadmaps to generate new ones"}
          </div>
        </div>
        <button
          onClick={() => canGenerate ? setPhase("wizard") : null}
          disabled={!canGenerate}
          style={{ padding: "10px 20px", borderRadius: "10px", fontSize: "13px", fontWeight: 500, background: canGenerate ? "#5B5BD6" : "rgba(255,255,255,0.06)", color: canGenerate ? "#fff" : "var(--text-muted)", border: "none", cursor: canGenerate ? "pointer" : "not-allowed", display: "flex", alignItems: "center", gap: "8px" }}>
          + New Roadmap {!canGenerate && `(${3 - slotsUsed} slots full)`}
        </button>
      </div>

      {/* Slot indicators */}
      <div style={{ display: "flex", gap: "6px", marginBottom: "24px" }}>
        {Array.from({ length: 3 }).map((_, i) => {
          const rm = roadmaps[i];
          return (
            <div key={i} style={{ flex: 1, height: "6px", borderRadius: "3px", background: rm ? (rm.is_completed ? "#1D9E75" : rm.is_active ? "#5B5BD6" : "rgba(91,91,214,0.4)") : "rgba(255,255,255,0.06)" }} />
          );
        })}
      </div>

      {roadmaps.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px" }}>
          <div style={{ fontSize: "40px", marginBottom: "16px", opacity: 0.3 }}>◈</div>
          <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "18px", fontWeight: 600, marginBottom: "8px" }}>No roadmaps yet</div>
          <div style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "20px" }}>Generate your first personalized learning roadmap</div>
          <button onClick={() => setPhase("wizard")} style={{ padding: "10px 24px", borderRadius: "10px", fontSize: "13px", background: "#5B5BD6", color: "#fff", border: "none", cursor: "pointer" }}>Generate First Roadmap →</button>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: "14px" }}>
          {roadmaps.map(rm => (
            <RoadmapCard key={rm.id} rm={rm} onActivate={handleActivate} onView={handleView} onDelete={handleDelete} activating={activating === rm.id} />
          ))}
        </div>
      )}

      {!canGenerate && roadmaps.length >= 3 && (
        <div style={{ marginTop: "20px", padding: "14px 18px", background: "rgba(239,159,39,0.08)", border: "1px solid rgba(239,159,39,0.2)", borderRadius: "12px", fontSize: "13px", color: "#EF9F27" }}>
          ⚠ You've used all 3 roadmap slots. Complete all roadmaps to unlock new generation.
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes slideIn { from { transform: translateX(40px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes pulseBar { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
      `}</style>
    </div>
  );
}
