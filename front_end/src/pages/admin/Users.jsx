import React, { useState } from 'react';
import { MOCK_STUDENTS } from '../../store';
import { PageHeader, Modal } from '../../components/UI';
import { Plus, Shield, GraduationCap, Brain, Search, UserX, CheckCircle2 } from 'lucide-react';

const ALL_USERS = [
  ...MOCK_STUDENTS.map(s => ({ id: s.id, name: s.name, email: s.email, role: 'student', active: true })),
  { id: 10, name: 'Dr. Priya Menon', email: 'priya@college.edu', role: 'teacher', active: true },
  { id: 11, name: 'Prof. Ramesh Kumar', email: 'ramesh@college.edu', role: 'teacher', active: true },
  { id: 20, name: 'Admin', email: 'admin@college.edu', role: 'admin', active: true },
];

const ROLE_CONFIG = {
  student: { icon: GraduationCap, color: '#4f8ef7', label: 'Student' },
  teacher: { icon: Brain, color: '#8b5cf6', label: 'Faculty' },
  admin: { icon: Shield, color: '#14b8a6', label: 'Admin' },
};

export default function AdminUsers() {
  const [users, setUsers] = useState(ALL_USERS);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', role: 'student' });

  const filtered = users.filter((u) => {
    const matchSearch = u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = filter === 'all' || u.role === filter;
    return matchSearch && matchRole;
  });

  const toggle = (id) => setUsers(u => u.map(x => x.id === id ? { ...x, active: !x.active } : x));
  const handleCreate = (e) => {
    e.preventDefault();
    setUsers(u => [...u, { ...form, id: Date.now(), active: true }]);
    setCreateOpen(false);
    setForm({ name: '', email: '', role: 'student' });
  };

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
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--bg-elevated)' }}>
              {['User', 'Email', 'Role', 'Status', ''].map((h) => (
                <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => {
              const rc = ROLE_CONFIG[u.role];
              const Icon = rc.icon;
              return (
                <tr key={u.id} className="table-row" style={{ opacity: u.active ? 1 : 0.5 }}>
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
                  <td style={{ padding: '11px 14px' }}>
                    <span className={u.active ? 'badge-green' : 'badge-red'} style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '99px', fontWeight: '600' }}>
                      {u.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{ padding: '11px 14px' }}>
                    {u.role !== 'admin' && (
                      <button onClick={() => toggle(u.id)} className={u.active ? 'btn btn-danger' : 'btn btn-ghost'} style={{ fontSize: '11px', padding: '4px 10px', gap: '4px' }}>
                        {u.active ? <><UserX size={11} /> Deactivate</> : <><CheckCircle2 size={11} /> Activate</>}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create New User">
        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '11px', fontWeight: '500', color: 'var(--text-secondary)', display: 'block', marginBottom: '5px' }}>Full Name</label>
            <input className="input" placeholder="John Doe" value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} required />
          </div>
          <div>
            <label style={{ fontSize: '11px', fontWeight: '500', color: 'var(--text-secondary)', display: 'block', marginBottom: '5px' }}>Email</label>
            <input className="input" type="email" placeholder="john@college.edu" value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} required />
          </div>
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
            <button type="submit" className="btn btn-primary"><Plus size={13} /> Create</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
