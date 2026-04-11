import { useState, useEffect, useRef } from "react";
import {
  BookOpen, Clock, CheckCircle2, AlertTriangle, Upload, FileText,
  Send, ChevronDown, ChevronUp, Loader2, MessageSquare, Star, Paperclip,
} from "lucide-react";

const API = "http://localhost:8000/api";
const tok = () => localStorage.getItem("token");
const authFetch = (url, opts = {}) =>
  fetch(`${API}${url}`, {
    ...opts,
    headers: { Authorization: `Bearer ${tok()}`, ...(opts.headers || {}) },
  });

function getDueInfo(deadline) {
  const diff = Math.ceil((new Date(deadline) - new Date()) / 864e5);
  if (diff < 0) return { text: "Overdue", color: "#ef4444", urgent: true };
  if (diff === 0) return { text: "Due today", color: "#f59e0b", urgent: true };
  if (diff === 1) return { text: "Due tomorrow", color: "#f59e0b", urgent: true };
  return { text: `${diff} days left`, color: "var(--text-muted)", urgent: false };
}

const STATUS_CFG = {
  submitted:     { label: "Submitted",     color: "#22c55e", bg: "rgba(34,197,94,0.1)" },
  late:          { label: "Late",          color: "#f59e0b", bg: "rgba(245,158,11,0.1)" },
  not_submitted: { label: "Not submitted", color: "#5a5a7a", bg: "rgba(255,255,255,0.04)" },
};

function SubmitModal({ assignment, onClose, onSubmitted }) {
  const [mode, setMode] = useState("text");
  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef();

  const handleSubmit = async () => {
    if (mode === "text" && !text.trim()) { setError("Write something first."); return; }
    if (mode === "file" && !file) { setError("Select a file first."); return; }
    setSubmitting(true);
    setError("");
    try {
      const fd = new FormData();
      if (mode === "text") fd.append("text_response", text.trim());
      if (mode === "file") fd.append("file", file);
      const res = await authFetch(`/assignments/${assignment.id}/submit`, { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Submission failed");
      onSubmitted(data);
    } catch (e) {
      setError(e.message);
    }
    setSubmitting(false);
  };

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 200 }} />
      <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: "min(520px,92vw)", background: "#0D0D1A", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "16px", zIndex: 201, padding: "24px" }}>
        <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "16px", fontWeight: 700, marginBottom: "4px" }}>{assignment.title}</div>
        <div style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "20px" }}>{assignment.subject} · {assignment.class_id}</div>
        <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
          {[["text", "Text response", FileText], ["file", "Upload file", Upload]].map(([m, label, Icon]) => (
            <button key={m} onClick={() => setMode(m)}
              style={{ flex: 1, padding: "8px", borderRadius: "8px", fontSize: "12px", fontWeight: 500, cursor: "pointer", border: `1.5px solid ${mode === m ? "#5B5BD6" : "rgba(255,255,255,0.08)"}`, background: mode === m ? "rgba(91,91,214,0.12)" : "transparent", color: mode === m ? "#A8A8F8" : "var(--text-muted)", display: "flex", alignItems: "center", justifyContent: "center", gap: "5px" }}>
              <Icon size={12} />{label}
            </button>
          ))}
        </div>
        {mode === "text" && (
          <textarea value={text} onChange={e => setText(e.target.value)} placeholder="Write your answer here..." rows={6}
            style={{ width: "100%", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "10px", padding: "12px", fontSize: "13px", color: "var(--text-primary)", resize: "vertical", outline: "none", boxSizing: "border-box" }} />
        )}
        {mode === "file" && (
          <div onClick={() => fileRef.current?.click()}
            style={{ border: "2px dashed rgba(255,255,255,0.1)", borderRadius: "10px", padding: "32px", textAlign: "center", cursor: "pointer", background: file ? "rgba(34,197,94,0.05)" : "transparent" }}>
            <input ref={fileRef} type="file" style={{ display: "none" }} onChange={e => setFile(e.target.files[0])} />
            {file
              ? <><CheckCircle2 size={24} color="#22c55e" style={{ margin: "0 auto 8px" }} /><div style={{ fontSize: "13px" }}>{file.name}</div></>
              : <><Upload size={24} color="var(--text-muted)" style={{ margin: "0 auto 8px" }} /><div style={{ fontSize: "13px", color: "var(--text-muted)" }}>Click to select file</div></>
            }
          </div>
        )}
        {error && (
          <div style={{ marginTop: "10px", fontSize: "12px", color: "#f09595", background: "rgba(239,68,68,0.08)", borderRadius: "8px", padding: "8px 12px" }}>{error}</div>
        )}
        <div style={{ display: "flex", gap: "8px", marginTop: "16px", justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "8px 16px", borderRadius: "8px", fontSize: "12px", background: "transparent", border: "1px solid rgba(255,255,255,0.1)", color: "var(--text-muted)", cursor: "pointer" }}>Cancel</button>
          <button onClick={handleSubmit} disabled={submitting}
            style={{ padding: "8px 18px", borderRadius: "8px", fontSize: "12px", fontWeight: 500, background: submitting ? "rgba(34,197,94,0.3)" : "#22c55e", color: "#fff", border: "none", cursor: submitting ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: "6px" }}>
            {submitting
              ? <><Loader2 size={12} style={{ animation: "spin 0.6s linear infinite" }} /> Submitting...</>
              : <><Send size={12} /> Submit</>
            }
          </button>
        </div>
      </div>
    </>
  );
}

function AssignmentCard({ a, onSubmit }) {
  const [expanded, setExpanded] = useState(false);
  const [submission, setSubmission] = useState(null);
  const [loadingSub, setLoadingSub] = useState(false);

  const due = getDueInfo(a.deadline);
  const sc = STATUS_CFG[a.submission_status] || STATUS_CFG.not_submitted;
  const canSubmit = a.submission_status === "not_submitted";
  const isSubmitted = a.submission_status === "submitted" || a.submission_status === "late";
  const hasDetails = a.description || isSubmitted;

  const toggleExpand = async () => {
    const next = !expanded;
    setExpanded(next);
    if (next && isSubmitted && !submission) {
      setLoadingSub(true);
      try {
        const res = await authFetch(`/assignments/${a.id}/my-submission`);
        if (res.ok) setSubmission(await res.json());
      } catch { /* silent */ }
      setLoadingSub(false);
    }
  };

  return (
    <div style={{ background: "rgba(255,255,255,0.03)", border: `1.5px solid ${due.urgent && canSubmit ? "rgba(239,68,68,0.25)" : "rgba(255,255,255,0.08)"}`, borderRadius: "14px", overflow: "hidden" }}>
      {due.urgent && canSubmit && (
        <div style={{ height: "3px", background: due.color, animation: "pulseBar 2s ease-in-out infinite" }} />
      )}
      <div style={{ padding: "16px 18px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
          <div style={{ width: "36px", height: "36px", borderRadius: "9px", background: "rgba(79,142,247,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <BookOpen size={16} color="#4f8ef7" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "5px" }}>
              <span style={{ fontSize: "13px", fontWeight: 600 }}>{a.title}</span>
              <span style={{ fontSize: "10px", padding: "2px 8px", borderRadius: "20px", background: "rgba(79,142,247,0.12)", color: "#4f8ef7", border: "1px solid rgba(79,142,247,0.2)" }}>{a.subject}</span>
              <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>{a.class_id}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
              <span style={{ fontSize: "11px", color: due.color, display: "flex", alignItems: "center", gap: "4px" }}>
                <Clock size={10} /> {due.text}
              </span>
              <span style={{ fontSize: "10px", padding: "2px 8px", borderRadius: "20px", background: sc.bg, color: sc.color }}>{sc.label}</span>
              <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>
                {new Date(a.deadline).toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          </div>
          <div style={{ display: "flex", gap: "6px", alignItems: "center", flexShrink: 0 }}>
            {canSubmit && (
              <button onClick={() => onSubmit(a)}
                style={{ padding: "6px 12px", borderRadius: "8px", fontSize: "11px", fontWeight: 500, background: "#5B5BD6", color: "#fff", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "5px" }}>
                <Send size={10} /> Submit
              </button>
            )}
            {hasDetails && (
              <button onClick={toggleExpand}
                style={{ padding: "6px 8px", borderRadius: "8px", background: "transparent", border: "1px solid rgba(255,255,255,0.08)", color: "var(--text-muted)", cursor: "pointer" }}>
                {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>
            )}
          </div>
        </div>

        {expanded && (
          <div style={{ marginTop: "12px", paddingTop: "12px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            {a.description && (
              <div style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.7, whiteSpace: "pre-wrap", marginBottom: isSubmitted ? "14px" : 0 }}>
                {a.description}
              </div>
            )}

            {isSubmitted && (
              loadingSub ? (
                <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "var(--text-muted)" }}>
                  <Loader2 size={12} style={{ animation: "spin 0.6s linear infinite" }} /> Loading submission...
                </div>
              ) : submission ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  <div style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                    Your Submission &middot; {new Date(submission.submitted_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </div>

                  {submission.text && (
                    <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "10px", padding: "12px", fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
                      {submission.text}
                    </div>
                  )}

                  {submission.file_path && (
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "#4f8ef7" }}>
                      <Paperclip size={12} />
                      <span>{submission.file_path.split("/").pop()}</span>
                    </div>
                  )}

                  {submission.grade && (
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 14px", background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.15)", borderRadius: "10px" }}>
                      <Star size={14} color="#22c55e" />
                      <span style={{ fontSize: "13px", fontWeight: 600, color: "#22c55e" }}>Grade: {submission.grade}</span>
                    </div>
                  )}

                  {submission.feedback && (
                    <div style={{ padding: "12px 14px", background: "rgba(91,91,214,0.06)", border: "1px solid rgba(91,91,214,0.15)", borderRadius: "10px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
                        <MessageSquare size={12} color="#A8A8F8" />
                        <span style={{ fontSize: "11px", fontWeight: 600, color: "#A8A8F8", textTransform: "uppercase", letterSpacing: "0.08em" }}>Teacher Feedback</span>
                      </div>
                      <div style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{submission.feedback}</div>
                    </div>
                  )}

                  {!submission.grade && !submission.feedback && (
                    <div style={{ fontSize: "12px", color: "var(--text-muted)", fontStyle: "italic" }}>No grade or feedback yet.</div>
                  )}
                </div>
              ) : null
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function StudentAssignments() {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [submitting, setSubmitting] = useState(null);
  const [toast, setToast] = useState(null);

  const load = async () => {
    try {
      const res = await authFetch("/assignments/");
      const data = await res.json();
      setAssignments(Array.isArray(data) ? data : []);
    } catch { /* silent */ }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSubmitted = (sub) => {
    setAssignments(prev => prev.map(a =>
      a.id === sub.assignment_id ? { ...a, submission_status: sub.status } : a
    ));
    setSubmitting(null);
    showToast(sub.status === "late" ? "Submitted (late)" : "Submitted successfully", sub.status === "late" ? "warn" : "success");
  };

  const now = new Date();
  const filtered = assignments.filter(a => {
    if (filter === "pending")   return a.submission_status === "not_submitted" && new Date(a.deadline) >= now;
    if (filter === "submitted") return a.submission_status === "submitted" || a.submission_status === "late";
    if (filter === "overdue")   return a.submission_status === "not_submitted" && new Date(a.deadline) < now;
    return true;
  });

  const overdue  = assignments.filter(a => a.submission_status === "not_submitted" && new Date(a.deadline) < now).length;
  const dueToday = assignments.filter(a => {
    if (a.submission_status !== "not_submitted") return false;
    const diff = Math.ceil((new Date(a.deadline) - now) / 864e5);
    return diff >= 0 && diff <= 1;
  }).length;
  const pending = assignments.filter(a => a.submission_status === "not_submitted").length;
  const done    = assignments.filter(a => a.submission_status === "submitted" || a.submission_status === "late").length;

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
      <Loader2 size={32} style={{ animation: "spin 0.8s linear infinite", color: "#5B5BD6" }} />
    </div>
  );

  return (
    <div className="fade-in-up" style={{ maxWidth: "860px", margin: "0 auto", padding: "1.5rem 1rem" }}>
      <div style={{ marginBottom: "1.5rem" }}>
        <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "22px", fontWeight: 700, marginBottom: "4px" }}>Assignments</div>
        <div style={{ fontSize: "13px", color: "var(--text-muted)" }}>{assignments.length} total &middot; {pending} pending &middot; {done} submitted</div>
      </div>

      {(overdue > 0 || dueToday > 0) && (
        <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "12px", padding: "12px 16px", marginBottom: "20px", display: "flex", alignItems: "center", gap: "10px", fontSize: "13px", color: "#f09595" }}>
          <AlertTriangle size={16} color="#ef4444" />
          <span>
            {overdue > 0 && <><strong>{overdue}</strong> overdue{dueToday > 0 ? " · " : ""}</>}
            {dueToday > 0 && <><strong>{dueToday}</strong> due within 24h</>}
            {" — submit now to avoid penalties."}
          </span>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "10px", marginBottom: "20px" }}>
        {[
          { label: "Total",     value: assignments.length, color: "#5B5BD6" },
          { label: "Pending",   value: pending,            color: "#f59e0b" },
          { label: "Submitted", value: done,               color: "#22c55e" },
          { label: "Overdue",   value: overdue,            color: "#ef4444" },
        ].map(s => (
          <div key={s.label} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "12px", padding: "12px 14px", textAlign: "center" }}>
            <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "22px", fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: "6px", marginBottom: "16px" }}>
        {[["all", "All"], ["pending", "Pending"], ["submitted", "Submitted"], ["overdue", "Overdue"]].map(([k, l]) => (
          <button key={k} onClick={() => setFilter(k)}
            style={{ padding: "6px 14px", borderRadius: "8px", fontSize: "12px", fontWeight: 500, cursor: "pointer", border: `1.5px solid ${filter === k ? "#5B5BD6" : "rgba(255,255,255,0.08)"}`, background: filter === k ? "rgba(91,91,214,0.12)" : "transparent", color: filter === k ? "#A8A8F8" : "var(--text-muted)" }}>
            {l}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 20px", color: "var(--text-muted)", fontSize: "13px" }}>
            <BookOpen size={32} style={{ margin: "0 auto 12px", opacity: 0.3 }} />
            {filter === "all" ? "No assignments yet" : `No ${filter} assignments`}
          </div>
        ) : filtered.map(a => <AssignmentCard key={a.id} a={a} onSubmit={setSubmitting} />)}
      </div>

      {submitting && (
        <SubmitModal assignment={submitting} onClose={() => setSubmitting(null)} onSubmitted={handleSubmitted} />
      )}

      {toast && (
        <div style={{ position: "fixed", bottom: "24px", right: "24px", background: "rgba(20,20,36,0.95)", border: `1px solid ${toast.type === "success" ? "#22c55e" : toast.type === "warn" ? "#f59e0b" : "rgba(255,255,255,0.12)"}`, borderRadius: "10px", padding: "10px 16px", fontSize: "13px", zIndex: 999, color: toast.type === "success" ? "#7DC9A8" : toast.type === "warn" ? "#fbbf24" : "var(--text-primary)" }}>
          {toast.msg}
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } } @keyframes pulseBar { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
    </div>
  );
}
