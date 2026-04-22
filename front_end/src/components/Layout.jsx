import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import useAppStore from '../store';
import {
  LayoutDashboard, Map, MessageSquare, FileText,
  AlertCircle, BookOpen, Users, BarChart3, LogOut,
  Bell, ChevronDown, UserCircle2
} from 'lucide-react';
import logo from '../assets/veloris-logo.png';

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
      <Icon size={16} style={{ color: active ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.25)' }} />
      <span>{label}</span>
      {active && (
        <div className="ml-auto w-1 h-1 rounded-full bg-white/40" />
      )}
    </Link>
  );
}

export default function Layout({ children }) {
  const { currentUser, role, logout } = useAppStore();
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const profilePath =
    role === 'teacher' ? '/teacher/profile' :
    role === 'admin'   ? '/admin/profile'   : '/profile';

  const navItems =
    role === 'student' ? STUDENT_NAV :
    role === 'teacher' ? TEACHER_NAV : ADMIN_NAV;

  const roleLabel =
    role === 'student' ? 'Student' :
    role === 'teacher' ? 'Faculty' : 'Admin';

  return (
    <div className="flex h-screen overflow-hidden font-inter" style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>

      {/* ── Sidebar ── */}
      <aside
        className="w-[240px] flex-shrink-0 flex flex-col z-10 relative"
        style={{ borderRight: '1px solid var(--border)', background: 'rgba(10,10,10,0.6)', backdropFilter: 'blur(20px)' }}
      >
        {/* Logo */}
        <div className="p-5" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2.5">
            <img src={logo} alt="Veloris Logo" className="w-[30px] h-[30px] object-contain logo-float transition-all" />
            <span className="text-[15px] font-bold font-space tracking-tight text-white drop-shadow-[0_0_12px_rgba(91,91,214,0.6)]">Veloris</span>
          </div>
          <div className="mt-3">
            <span
              className="text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-widest"
              style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.35)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              {roleLabel}
            </span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-5 flex flex-col gap-0.5 overflow-y-auto custom-scrollbar">
          <div
            className="text-[10px] font-bold uppercase tracking-widest px-3 mb-2"
            style={{ color: 'var(--text-muted)' }}
          >
            Navigation
          </div>
          {navItems.map((item) => <NavItem key={item.path} {...item} />)}
        </nav>

        {/* User card */}
        <div className="p-3" style={{ borderTop: '1px solid var(--border)' }}>
          <div
            className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)' }}
            onClick={() => navigate(profilePath)}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0"
              style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)' }}
            >
              {currentUser?.avatar || currentUser?.name?.[0] || '?'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[12px] font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                {currentUser?.name}
              </div>
              <div className="text-[10px] truncate" style={{ color: 'var(--text-muted)' }}>
                {currentUser?.email}
              </div>
            </div>
            <button
              onClick={async (e) => { e.stopPropagation(); await logout(); }}
              className="p-1.5 rounded-lg transition-colors"
              style={{ color: 'var(--text-muted)' }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--status-err)'; e.currentTarget.style.background = 'rgba(248,113,113,0.08)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent'; }}
              title="Logout"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Header */}
        <header
          className="h-[60px] shrink-0 px-6 flex items-center justify-between sticky top-0 z-20"
          style={{ borderBottom: '1px solid var(--border)', background: 'rgba(10,10,10,0.85)', backdropFilter: 'blur(20px)' }}
        >
          <div className="flex-1">
            <div className="relative max-w-xs hidden sm:block">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color: 'var(--text-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                className="input-premium pl-9 h-9 text-[12px]"
                placeholder={`Search ${roleLabel} dashboard...`}
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            {role !== 'admin' && (
              <button
                className="relative w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.07)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
              >
                <Bell size={15} />
                <span
                  className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full animate-pulse"
                  style={{ background: 'var(--status-warn)' }}
                />
              </button>
            )}

            <div className="w-px h-5" style={{ background: 'var(--border)' }} />

            <div ref={profileRef} style={{ position: 'relative' }}>
              <div
                className="flex items-center gap-2.5 cursor-pointer"
                onClick={() => setProfileOpen(o => !o)}
              >
                <div className="text-right hidden md:block">
                  <div className="text-[12px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {currentUser?.name?.split(' ')[0]}
                  </div>
                  <div className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                    {currentUser?.roll_no || roleLabel}
                  </div>
                </div>
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold"
                  style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.1)' }}
                >
                  {currentUser?.avatar || currentUser?.name?.[0] || '?'}
                </div>
                <ChevronDown size={12} style={{ color: 'var(--text-muted)' }} />
              </div>

              {profileOpen && (
                <div style={{
                  position: 'absolute', right: 0, top: 'calc(100% + 8px)',
                  background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                  borderRadius: '10px', minWidth: '160px', zIndex: 50,
                  overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
                }}>
                  {[
                    { label: '👤 View Profile', action: () => { navigate(profilePath); setProfileOpen(false); } },
                    { label: '⚙️ Settings', action: () => setProfileOpen(false) },
                  ].map(({ label, action }) => (
                    <button key={label} onClick={action}
                      style={{ display: 'block', width: '100%', padding: '9px 14px', textAlign: 'left', background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '12px', cursor: 'pointer' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'none'}
                    >{label}</button>
                  ))}
                  <div style={{ height: '1px', background: 'var(--border)', margin: '3px 0' }} />
                  <button onClick={async () => { await logout(); setProfileOpen(false); }}
                    style={{ display: 'block', width: '100%', padding: '9px 14px', textAlign: 'left', background: 'none', border: 'none', color: 'var(--status-err)', fontSize: '12px', cursor: 'pointer' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(248,113,113,0.06)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}
                  >🚪 Logout</button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="p-7 max-w-[1600px] mx-auto fade-in-up">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
