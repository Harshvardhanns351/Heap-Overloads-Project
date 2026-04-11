import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import useAppStore from '../store';
import logoImg from '../assets/logo.png';
import {
  LayoutDashboard, Map, MessageSquare, FileText,
  AlertCircle, BookOpen, Users, BarChart3, LogOut,
  Bell, ChevronDown, UserCircle2
} from 'lucide-react';

const STUDENT_NAV = [
  { path: '/dashboard',   icon: LayoutDashboard, label: 'Dashboard'   },
  { path: '/profile',     icon: UserCircle2,     label: 'My Profile'  },
  { path: '/roadmap',     icon: Map,             label: 'My Roadmap'  },
  { path: '/assignments', icon: BookOpen,        label: 'Assignments' },
  { path: '/mentor',      icon: MessageSquare,   label: 'AI Mentor'   },
  { path: '/documents',   icon: FileText,        label: 'Documents'   },
  { path: '/disputes',    icon: AlertCircle,     label: 'Disputes'    },
];

const TEACHER_NAV = [
  { path: '/teacher/dashboard',   icon: LayoutDashboard, label: 'Dashboard'   },
  { path: '/teacher/classes',     icon: Users,       label: 'My Classes'  },
  { path: '/teacher/students',    icon: UserCircle2, label: 'Students'    },
  { path: '/teacher/assignments', icon: BookOpen,    label: 'Assignments' },
  { path: '/teacher/attendance',  icon: BarChart3,   label: 'Attendance'  },
  { path: '/teacher/alerts',      icon: Bell,        label: 'Risk Alerts' },
];

const ADMIN_NAV = [
  { path: '/admin/analytics', icon: BarChart3,   label: 'Analytics'       },
  { path: '/admin/students',  icon: UserCircle2, label: 'Students'        },
  { path: '/admin/disputes',  icon: AlertCircle, label: 'Disputes'        },
  { path: '/admin/users',     icon: Users,       label: 'User Management' },
];

function NavItem({ path, icon: Icon, label }) {
  const location = useLocation();
  const active = location.pathname === path || location.pathname.startsWith(path + '/');
  return (
    <Link to={path} className={`nav-item-premium ${active ? 'active' : ''}`}>
      <Icon size={16} style={{ color: active ? '#f0f0f0' : '#505050' }} />
      <span>{label}</span>
      {active && <div style={{ marginLeft: 'auto', width: '5px', height: '5px', borderRadius: '50%', background: '#f0f0f0' }} />}
    </Link>
  );
}

export default function Layout({ children }) {
  const { currentUser, role, logout } = useAppStore();
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const profilePath = role === 'teacher' ? '/teacher/profile' : role === 'admin' ? '/admin/profile' : '/profile';
  const navItems = role === 'student' ? STUDENT_NAV : role === 'teacher' ? TEACHER_NAV : ADMIN_NAV;
  const roleLabel = role === 'student' ? 'Student' : role === 'teacher' ? 'Faculty' : 'Admin';

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#0a0a0a', color: '#f0f0f0', fontFamily: 'Inter, sans-serif' }}>

      {/* ── Sidebar ── */}
      <aside className="glass-panel" style={{ width: '240px', flexShrink: 0, display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 10 }}>

        {/* Logo */}
        <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <img
              src={logoImg}
              alt="Veloris"
              style={{
                width: '34px',
                height: '34px',
                objectFit: 'contain',
                filter: 'grayscale(1) brightness(1.8)',
                borderRadius: '6px',
                WebkitMaskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, black 40%, transparent 100%)',
                maskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, black 40%, transparent 100%)',
              }}
            />
            <span style={{ fontSize: '16px', fontWeight: '700', fontFamily: 'Space Grotesk, sans-serif', color: '#f0f0f0' }}>Veloris</span>
          </div>
          <div style={{ marginTop: '12px' }}>
            <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', background: 'rgba(255,255,255,0.06)', color: '#808080', border: '1px solid rgba(255,255,255,0.08)', fontWeight: '600' }}>
              {roleLabel}
            </span>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: '2px', overflowY: 'auto' }}>
          <div style={{ fontSize: '10px', fontWeight: '700', color: '#404040', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '4px 10px 8px' }}>Main Menu</div>
          {navItems.map(item => <NavItem key={item.path} {...item} />)}
        </nav>

        {/* User card */}
        <div style={{ padding: '12px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div
            style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer', transition: 'background 0.15s' }}
            onClick={() => navigate(profilePath)}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
          >
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#1e1e1e', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '700', color: '#c0c0c0', flexShrink: 0 }}>
              {currentUser?.avatar || currentUser?.name?.[0] || '?'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '12px', fontWeight: '600', color: '#e0e0e0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{currentUser?.name}</div>
              <div style={{ fontSize: '10px', color: '#505050', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{currentUser?.email}</div>
            </div>
            <button
              onClick={e => { e.stopPropagation(); logout(); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#404040', padding: '4px', borderRadius: '6px', display: 'flex', transition: 'color 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
              onMouseLeave={e => e.currentTarget.style.color = '#404040'}
              title="Logout"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Header */}
        <header className="glass-elevated" style={{ height: '60px', flexShrink: 0, padding: '0 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 20 }}>
          <div style={{ flex: 1 }}>
            <div style={{ position: 'relative', maxWidth: '320px' }}>
              <svg style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#404040' }} width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input className="input" style={{ paddingLeft: '32px', height: '36px', fontSize: '12px' }} placeholder={`Search ${roleLabel} dashboard...`} />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {role !== 'admin' && (
              <button style={{ position: 'relative', width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#808080', transition: 'all 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#e0e0e0'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = '#808080'; }}>
                <Bell size={15} />
                <span style={{ position: 'absolute', top: '8px', right: '8px', width: '6px', height: '6px', borderRadius: '50%', background: '#ef4444' }} />
              </button>
            )}

            <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.08)' }} />

            <div ref={profileRef} style={{ position: 'relative' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }} onClick={() => setProfileOpen(o => !o)}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '12px', fontWeight: '600', color: '#e0e0e0' }}>{currentUser?.name?.split(' ')[0]}</div>
                  <div style={{ fontSize: '10px', color: '#505050', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{roleLabel}</div>
                </div>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#1e1e1e', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '700', color: '#c0c0c0' }}>
                  {currentUser?.avatar || currentUser?.name?.[0] || '?'}
                </div>
                <ChevronDown size={12} style={{ color: '#404040' }} />
              </div>

              {profileOpen && (
                <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 8px)', background: '#141414', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', minWidth: '160px', zIndex: 50, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.6)' }}>
                  {[
                    { label: '👤 View Profile', action: () => { navigate(profilePath); setProfileOpen(false); } },
                    { label: '⚙️ Settings',     action: () => setProfileOpen(false) },
                  ].map(({ label, action }) => (
                    <button key={label} onClick={action} style={{ display: 'block', width: '100%', padding: '10px 16px', textAlign: 'left', background: 'none', border: 'none', color: '#c0c0c0', fontSize: '13px', cursor: 'pointer', transition: 'background 0.1s' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                      {label}
                    </button>
                  ))}
                  <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', margin: '2px 0' }} />
                  <button onClick={() => { logout(); setProfileOpen(false); }} style={{ display: 'block', width: '100%', padding: '10px 16px', textAlign: 'left', background: 'none', border: 'none', color: '#ef4444', fontSize: '13px', cursor: 'pointer', transition: 'background 0.1s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.08)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                    🚪 Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content */}
        <main style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>
          <div style={{ maxWidth: '1400px', margin: '0 auto' }} className="fade-in-up">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
