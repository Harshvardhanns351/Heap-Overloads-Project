import { useEffect, useState } from "react";
import useAppStore from "../../store";
import { api } from "../../api";

export default function Profile() {
  const { profile, fetchProfile, updateProfileLocal } = useAppStore();

  // name edit state
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState("");
  const [nameSaving, setNameSaving] = useState(false);
  const [nameError, setNameError] = useState("");

  useEffect(() => {
    fetchProfile();
  }, []);

  // sync input when profile loads
  useEffect(() => {
    if (profile?.user?.name) setNameValue(profile.user.name);
    // profile root may also carry name directly
    else if (profile?.name) setNameValue(profile.name);
  }, [profile]);

  const currentName = profile?.user?.name ?? profile?.name ?? "";

  function startEdit() {
    setNameValue(currentName);
    setNameError("");
    setEditingName(true);
  }

  function cancelEdit() {
    setEditingName(false);
    setNameError("");
  }

  async function saveName() {
    const trimmed = nameValue.trim();
    if (!trimmed) { setNameError("Name can't be empty"); return; }
    if (trimmed === currentName) { setEditingName(false); return; }

    setNameSaving(true);
    setNameError("");
    try {
      await api.profile.updateMyProfile({ name: trimmed });
      // update store + localStorage so navbar reflects the change immediately
      updateProfileLocal({ name: trimmed });
      const stored = JSON.parse(localStorage.getItem("user") || "{}");
      localStorage.setItem("user", JSON.stringify({ ...stored, name: trimmed }));
      setEditingName(false);
    } catch (err) {
      setNameError(err.message || "Failed to save");
    } finally {
      setNameSaving(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter") saveName();
    if (e.key === "Escape") cancelEdit();
  }

  if (!profile) {
    return <div style={{ padding: 32, color: "#aaa" }}>Loading profile…</div>;
  }

  const user = profile.user ?? profile;

  return (
    <div style={{ maxWidth: 600, margin: "32px auto", padding: "0 16px" }}>
      <h2 style={{ marginBottom: 24 }}>My Profile</h2>

      {/* ── Name row ── */}
      <div style={rowStyle}>
        <span style={labelStyle}>Name</span>

        {editingName ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
            <input
              autoFocus
              value={nameValue}
              onChange={e => setNameValue(e.target.value)}
              onKeyDown={handleKeyDown}
              style={inputStyle}
              maxLength={80}
            />
            <button onClick={saveName} disabled={nameSaving} style={btnPrimary}>
              {nameSaving ? "Saving…" : "Save"}
            </button>
            <button onClick={cancelEdit} disabled={nameSaving} style={btnGhost}>
              Cancel
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1 }}>
            <span style={valueStyle}>{currentName}</span>
            <button onClick={startEdit} style={btnGhost} title="Edit name">
              ✏️
            </button>
          </div>
        )}
      </div>
      {nameError && <p style={{ color: "#e55", marginTop: -8, marginBottom: 12, fontSize: 13 }}>{nameError}</p>}

      {/* ── Other read-only fields ── */}
      <Field label="Email"      value={user.email} />
      <Field label="Role"       value={user.role} />
      <Field label="Branch"     value={user.branch} />
      <Field label="Semester"   value={user.semester} />
      <Field label="Roll No."   value={user.roll_number} />
      <Field label="Batch"      value={user.batch} />
      <Field label="Phone"      value={user.phone} />
      <Field label="LinkedIn"   value={user.linkedin_url} link />
      <Field label="GitHub"     value={user.github_url} link />
      <Field label="Bio"        value={user.bio} />
    </div>
  );
}

function Field({ label, value, link }) {
  if (!value) return null;
  return (
    <div style={rowStyle}>
      <span style={labelStyle}>{label}</span>
      {link
        ? <a href={value} target="_blank" rel="noreferrer" style={{ ...valueStyle, color: "#4f8ef7" }}>{value}</a>
        : <span style={valueStyle}>{value}</span>
      }
    </div>
  );
}

const rowStyle = {
  display: "flex",
  alignItems: "center",
  padding: "10px 0",
  borderBottom: "1px solid #2a2a2a",
  gap: 12,
};

const labelStyle = {
  width: 100,
  flexShrink: 0,
  color: "#888",
  fontSize: 14,
};

const valueStyle = {
  fontSize: 15,
  color: "#eee",
};

const inputStyle = {
  flex: 1,
  padding: "6px 10px",
  borderRadius: 6,
  border: "1px solid #444",
  background: "#1a1a1a",
  color: "#eee",
  fontSize: 15,
  outline: "none",
};

const btnPrimary = {
  padding: "5px 14px",
  borderRadius: 6,
  border: "none",
  background: "#4f8ef7",
  color: "#fff",
  cursor: "pointer",
  fontSize: 13,
};

const btnGhost = {
  padding: "5px 10px",
  borderRadius: 6,
  border: "1px solid #444",
  background: "transparent",
  color: "#aaa",
  cursor: "pointer",
  fontSize: 13,
};
