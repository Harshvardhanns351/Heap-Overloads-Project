import React, { useState } from 'react';
import { Loader2, Edit3, Check } from 'lucide-react';
import { api } from '../../api';
import useAppStore from '../../store';

export default function TeacherProfile() {
  const user          = useAppStore(s => s.currentUser);
  const [edit,   setEdit]   = useState(false);
  const [bio,    setBio]    = useState(user?.bio   || '');
  const [phone,  setPhone]  = useState(user?.phone || '');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try { await api.profile.updateMyProfile({ bio, phone }); setEdit(false); }
    catch { /* silent */ }
    setSaving(false);
  };

  return (
    <div className="fade-in-up" style={{ maxWidth: '700px' }}>
      <div className="card" style={{ padding: '24px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '22px', fontWeight: '700', fontFamily: 'Space Grotesk,sans-serif' }}>{user?.name}</h1>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>{user?.department || 'Faculty'} · {user?.email}</div>
          </div>
          {!edit
            ? <button className="btn btn-ghost" onClick={() => setEdit(true)} style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}><Edit3 size={12} /> Edit</button>
            : <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn btn-primary" onClick={save} disabled={saving} style={{ fontSize: '12px' }}>
                  {saving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Save
                </button>
                <button className="btn btn-ghost" onClick={() => setEdit(false)} style={{ fontSize: '12px' }}>Cancel</button>
              </div>
          }
        </div>
        <div style={{ display: 'grid', gap: '16px' }}>
          <div>
            <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Bio</label>
            {edit
              ? <textarea className="input" rows={3} value={bio} onChange={e => setBio(e.target.value)} style={{ width: '100%', resize: 'vertical', fontSize: '12px' }} />
              : <p style={{ fontSize: '13px', margin: 0, color: bio ? 'var(--text-primary)' : 'var(--text-muted)' }}>{bio || 'No bio added.'}</p>
            }
          </div>
          <div>
            <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Phone</label>
            {edit
              ? <input className="input" value={phone} onChange={e => setPhone(e.target.value)} style={{ fontSize: '12px' }} />
              : <p style={{ fontSize: '13px', margin: 0 }}>{phone || '—'}</p>
            }
          </div>
          {[['Role', 'Teacher'], ['Email', user?.email], ['Department', user?.department]].map(([label, val]) => (
            <div key={label}>
              <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>{label}</label>
              <p style={{ fontSize: '13px', margin: 0, color: 'var(--text-muted)' }}>{val || '—'}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
