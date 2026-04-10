import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import useAppStore from '../store';
import {
  LayoutDashboard, Map, MessageSquare, FileText,
  AlertCircle, BookOpen, Users, BarChart3, LogOut,
  Bell, Brain, ChevronDown, UserCircle2
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
  { path: '/teacher/classes',   icon: Users,     label: 'My Classes'  },
  { path: '/teacher/students',  icon: UserCircle2, label: 'Students'  },
  { path: '/teacher/assignments', icon: BookOpen, label: 'Assignments' },
  { path: '/teacher/attendance', icon: BarChart3, label: 'Attendance'  },
  { path: '/teacher/alerts',    icon: Bell,      label: 'Risk Alerts' },
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
    <Link 
      to={path} 
      className={`nav-item-premium ${active ? 'active' : ''}`}
    >
      <Icon size={18} className={active ? 'text-violet-400' : 'text-slate-500'} />
      <span className="font-semibold">{label}</span>
      {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-violet-400 shadow-[0_0_8px_rgba(139,92,246,0.8)]" />}
    </Link>
  );
}

export default function Layout({ children }) {
  const { currentUser, role, logout } = useAppStore();
  const navigate = useNavigate();
  const [notifOpen,    setNotifOpen]    = useState(false);
  const [profileOpen,  setProfileOpen]  = useState(false);
  const profileRef = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const profilePath = role === 'teacher' ? '/teacher/profile' : role === 'admin' ? '/admin/profile' : '/profile';

  const navItems = role === 'student' ? STUDENT_NAV : role === 'teacher' ? TEACHER_NAV : ADMIN_NAV;
  
  // Custom roles rendering logic safely with optional chaining
  const roleLabel = role === 'student' ? 'Student' : role === 'teacher' ? 'Faculty' : 'Admin';
  const roleColorCls = role === 'student' ? 'text-sky-400 border-sky-400/30 bg-sky-400/10' : 
                       role === 'teacher' ? 'text-violet-400 border-violet-400/30 bg-violet-400/10' : 
                                            'text-teal-400 border-teal-400/30 bg-teal-400/10';

  return (
    <div className="flex h-screen overflow-hidden bg-[#030014] text-slate-100 font-inter font-sans">
      
      {/* Sidebar background glow effect */}
      <div className="absolute top-0 left-0 w-[400px] h-[400px] bg-violet-600/10 blur-[120px] rounded-full pointer-events-none -z-10" />

      {/* Sidebar - Glassmorphic */}
      <aside className="w-[260px] flex-shrink-0 flex flex-col border-r border-white/10 glass-panel z-10 relative">
        
        {/* Logo Section */}
        <div className="p-6 border-b border-white/10 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-sky-600 flex items-center justify-center shadow-[0_0_20px_rgba(139,92,246,0.5)]">
              <Brain size={22} className="text-white" />
            </div>
            <span className="text-xl font-bold font-space tracking-tight text-white">Veloris</span>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold border flex items-center gap-1.5 ${roleColorCls}`}>
              {role === 'student' ? "🎓" : role === 'teacher' ? "👨‍🏫" : "🛡️"} {roleLabel}
            </span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 flex flex-col gap-1.5 overflow-y-auto custom-scrollbar">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-widest px-4 mb-2">
            Main Menu
          </div>
          {navItems.map((item) => <NavItem key={item.path} {...item} />)}
        </nav>

        {/* User Card */}
        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors cursor-pointer" onClick={() => navigate(profilePath)}>
            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${roleColorCls}`}>
              {currentUser?.avatar}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-slate-200 truncate">{currentUser?.name}</div>
              <div className="text-xs text-slate-400 truncate">{currentUser?.email}</div>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); logout(); }}
              className="p-2 -mr-1 text-slate-400 hover:text-rose-400 hover:bg-rose-400/10 rounded-lg transition-colors group"
              title="Logout"
            >
              <LogOut size={16} className="group-hover:-translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden relative z-0">
        
        {/* Top Header - Glass Navbar */}
        <header className="h-[72px] shrink-0 border-b border-white/10 glass-elevated px-8 flex items-center justify-between sticky top-0 z-20">
          
          <div className="flex-1">
            {/* Search or Breadcrumbs can go here */}
            <div className="relative max-w-md hidden sm:block">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input type="text" className="input-premium pl-10 h-10 py-2 w-full max-w-sm rounded-[10px]" placeholder={`Search ${roleLabel} dashboard...`} />
            </div>
          </div>

          <div className="flex items-center gap-5">
            {/* Notifications */}
            {role !== 'admin' && (
              <button 
                onClick={() => setNotifOpen(!notifOpen)} 
                className="relative w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/10 transition-all hover:shadow-[0_0_15px_rgba(255,255,255,0.1)]"
              >
                <Bell size={18} />
                <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.8)] animate-pulse" />
              </button>
            )}
            
            <div className="h-6 w-px bg-white/10" />
            
            {/* User Profile Mini */}
            <div ref={profileRef} style={{ position: 'relative' }}>
              <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setProfileOpen(o => !o)}>
                <div className="text-right hidden md:block">
                  <div className="text-sm font-bold text-slate-200 group-hover:text-white transition-colors">{currentUser?.name?.split(' ')[0]}</div>
                  <div className="text-[10px] text-slate-400 tracking-wider uppercase">{currentUser?.rollNo || roleLabel}</div>
                </div>
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold border shadow-lg ${role === 'student' ? 'border-sky-500/30' : 'border-violet-500/30'} ${roleColorCls}`}>
                  {currentUser?.avatar}
                </div>
                <ChevronDown size={14} className="text-slate-500 group-hover:text-slate-300 transition-colors" />
              </div>
              {profileOpen && (
                <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 8px)', background: 'var(--bg-elevated)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', minWidth: '160px', zIndex: 50, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
                  <button onClick={() => { navigate(profilePath); setProfileOpen(false); }} style={{ display: 'block', width: '100%', padding: '10px 16px', textAlign: 'left', background: 'none', border: 'none', color: 'var(--text-primary)', fontSize: '13px', cursor: 'pointer' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                    👤 View Profile
                  </button>
                  <button onClick={() => { setProfileOpen(false); }} style={{ display: 'block', width: '100%', padding: '10px 16px', textAlign: 'left', background: 'none', border: 'none', color: 'var(--text-primary)', fontSize: '13px', cursor: 'pointer' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                    ⚙️ Settings
                  </button>
                  <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', margin: '4px 0' }} />
                  <button onClick={() => { logout(); setProfileOpen(false); }} style={{ display: 'block', width: '100%', padding: '10px 16px', textAlign: 'left', background: 'none', border: 'none', color: '#ef4444', fontSize: '13px', cursor: 'pointer' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.08)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                    🚪 Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 overflow-y-auto relative custom-scrollbar">
          {/* Main radiant background for content */}
          <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] bg-sky-500/10 blur-[150px] rounded-full pointer-events-none -z-10" />
          
          <div className="p-8 max-w-[1600px] mx-auto z-10 fade-in-up">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
