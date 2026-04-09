import React, { useState, useEffect } from 'react';
import useAppStore from '../../store';
import { PageHeader, Modal } from '../../components/UI';
import { Plus, Shield, GraduationCap, Brain, Search, Loader2 } from 'lucide-react';
import { authHeaders, buildApiUrl } from '../../api';

const ROLE_CONFIG = {
  student: { icon: GraduationCap, color: '#4f8ef7', label: 'Student' },
  teacher: { icon: Brain, color: '#8b5cf6', label: 'Faculty' },
  admin: { icon: Shield, color: '#14b8a6', label: 'Admin' },
};

export default function AdminUsers() {
  const { students, fetchStudents } = useAppStore();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', role: 'student', password: 'password' });
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchStudents().finally(() => setLoading(false)); }, []);

  const filtered = students.filter((u) => {
    const matchSearch = u.name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase());
    const matchRole = filter === 'all' || u.role === filter;
    return matchSearch && matchRole;
  });

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      await fetch(buildApiUrl('/auth/users'), {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(form),
      });
      await fetchStudents();
      setCreateOpen(false);
      setForm({ name: '', email: '', role: 'student', password: 'password' });
    } catch (err) {
      alert('Failed to create user: ' + err.message);
    } finally {
      setCreating(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-violet-500" /></div>;

  return (
    <div className="fade-in-up">
      <PageHeader
        title="User Management"
        subtitle="Create and manage accounts across all roles"
        action={<button className="btn btn-primary" onClick={() => setCreateOpen(true)} style={{ fontSize: '12px' }}><Plus size={13} /> Create User</button>}
      />

      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
          <Search size={13} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input className="input" placeholder="Search by name or email..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ paddingLeft: '30px' }} />
        </div>
        <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-elevated)', padding: '3px', borderRadius: '8px' }}>
          {['all', 'student', 'teacher', 'admin'].map((r) => (
            <button key={r} onClick={() => setFilter(r)} style={{ padding: '5px 12px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: '500', fontFamily: 'inherit', background: filter === r ? 'var(--bg-card)' : 'transparent', color: filter === r ? 'var(--text-primary)' : 'var(--text-muted)', transition: 'all 0.15s' }}>
              {r.charAt(0).toUpperCase() + r.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        {filtered.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>No users found</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg-elevated)' }}>
                {['User', 'Email', 'Role', 'Class'].map((h) => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => {
                const rc = ROLE_CONFIG[u.role] || ROLE_CONFIG.student;
                const Icon = rc.icon;
                return (
                  <tr key={u.id} className="table-row">
                    <td style={{ padding: '11px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: `${rc.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Icon size={14} color={rc.color} />
                        </div>
                        <span style={{ fontSize: '13px', fontWeight: '500' }}>{u.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: '11px 14px', fontSize: '12px', color: 'var(--text-secondary)' }}>{u.email}</td>
                    <td style={{ padding: '11px 14px' }}>
                      <span style={{ fontSize: '11px', padding: '2px 9px', borderRadius: '99px', background: `${rc.color}15`, color: rc.color, fontWeight: '600', border: `1px solid ${rc.color}25` }}>{rc.label}</span>
                    </td>
                    <td style={{ padding: '11px 14px', fontSize: '12px', color: 'var(--text-muted)' }}>{u.class_id || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create New User">
        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {[
            { label: 'Full Name', key: 'name', type: 'text', placeholder: 'John Doe' },
            { label: 'Email', key: 'email', type: 'email', placeholder: 'john@college.edu' },
            { label: 'Password', key: 'password', type: 'text', placeholder: 'Initial password' },
          ].map(({ label, key, type, placeholder }) => (
            <div key={key}>
              <label style={{ fontSize: '11px', fontWeight: '500', color: 'var(--text-secondary)', display: 'block', marginBottom: '5px' }}>{label}</label>
              <input className="input" type={type} placeholder={placeholder} value={form[key]} onChange={(e) => setForm(f => ({ ...f, [key]: e.target.value }))} required />
            </div>
          ))}
          <div>
            <label style={{ fontSize: '11px', fontWeight: '500', color: 'var(--text-secondary)', display: 'block', marginBottom: '5px' }}>Role</label>
            <select className="input" value={form.role} onChange={(e) => setForm(f => ({ ...f, role: e.target.value }))}>
              <option value="student">Student</option>
              <option value="teacher">Faculty</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-ghost" onClick={() => setCreateOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={creating}>{creating ? 'Creating...' : <><Plus size={13} /> Create</>}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
