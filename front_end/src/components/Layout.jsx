import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import useAppStore from '../store';
import {
  LayoutDashboard, Map, MessageSquare, FileText, Code2,
  AlertCircle, BookOpen, Users, BarChart3, LogOut,
  Bell, Brain, ChevronDown
} from 'lucide-react';

const STUDENT_NAV = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/roadmap', icon: Map, label: 'My Roadmap' },
  { path: '/mentor', icon: MessageSquare, label: 'AI Mentor' },
  { path: '/documents', icon: FileText, label: 'Documents' },
  { path: '/coding', icon: Code2, label: 'Coding Profile' },
  { path: '/disputes', icon: AlertCircle, label: 'Disputes' },
];

const TEACHER_NAV = [
  { path: '/teacher/classes', icon: Users, label: 'My Classes' },
  { path: '/teacher/assignments', icon: BookOpen, label: 'Assignments' },
  { path: '/teacher/attendance', icon: BarChart3, label: 'Attendance' },
  { path: '/teacher/alerts', icon: Bell, label: 'Risk Alerts' },
];

const ADMIN_NAV = [
  { path: '/admin/analytics', icon: BarChart3, label: 'Analytics' },
  { path: '/admin/disputes', icon: AlertCircle, label: 'Disputes' },
  { path: '/admin/users', icon: Users, label: 'User Management' },
];

function NavItem({ path, icon: Icon, label }) {
  const location = useLocation();
  const active = location.pathname === path || location.pathname.startsWith(path + '/');
  
  return (
    <Link 
      to={path} 
      className="nav-item-premium"
      style={{
        height: '40px',
        borderRadius: '8px',
        background: active ? 'rgba(83, 74, 183, 0.1)' : 'transparent',
        borderLeft: active ? '3px solid #534AB7' : '3px solid transparent',
      }}
    >
      <Icon size={18} style={{ color: active ? '#534AB7' : 'var(--text-muted)' }} />
      <span className="font-medium">{label}</span>
      {active && (
        <div 
          className="ml-auto w-1.5 h-1.5 rounded-full" 
          style={{ background: '#534AB7', boxShadow: '0 0 8px rgba(83,74,183,0.8)' }} 
        />
      )}
    </Link>
  );
}

export default function Layout({ children }) {
  const { currentUser, role, logout, alerts, fetchAlerts } = useAppStore();
  const [notifOpen, setNotifOpen] = useState(false);

  const navItems = role === 'student' ? STUDENT_NAV : role === 'teacher' ? TEACHER_NAV : ADMIN_NAV;
  
  const roleLabel = role === 'student' ? 'Student' : role === 'teacher' ? 'Faculty' : 'Admin';
  const unreadAlerts = alerts?.filter(a => !a.read).length || 0;

  const getRoleStyles = () => {
    if (role === 'student') return { color: '#38bdf8', bg: 'rgba(56,189,248,0.1)', border: 'rgba(56,189,248,0.3)' };
    if (role === 'teacher') return { color: '#a78bfa', bg: 'rgba(167,139,250,0.1)', border: 'rgba(167,139,250,0.3)' };
    return { color: '#2dd4bf', bg: 'rgba(45,212,191,0.1)', border: 'rgba(45,212,191,0.3)' };
  };
  const roleStyles = getRoleStyles();

  return (
    <div className="flex h-screen overflow-hidden bg-[#030014] text-slate-100 font-sans">
      {/* Sidebar - Glassmorphism */}
      <aside 
        className="w-[260px] flex-shrink-0 flex flex-col"
        style={{
          backdropFilter: 'blur(12px)',
          background: 'rgba(15,15,20,0.85)',
          borderRight: '1px solid rgba(255,255,255,0.15)',
        }}
      >
        <div className="p-6" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, #534AB7, #8b5cf6)',
                boxShadow: '0 0 20px rgba(83,74,183,0.5)',
              }}
            >
              <Brain size={22} className="text-white" />
            </div>
            <span className="text-xl font-medium text-white tracking-tight">Veloris</span>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <span 
              className="text-xs px-2.5 py-0.5 rounded-full font-medium border flex items-center gap-1.5"
              style={{ color: roleStyles.color, borderColor: roleStyles.border, background: roleStyles.bg }}
            >
              {role === 'student' ? '🎓' : role === 'teacher' ? '👨‍🏫' : '🛡️'} {roleLabel}
            </span>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 flex flex-col gap-1.5 overflow-y-auto">
          <div className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider px-4 mb-2">
            Main Menu
          </div>
          {navItems.map((item) => <NavItem key={item.path} {...item} />)}
        </nav>

        <div className="p-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div 
            className="flex items-center gap-3 p-3 rounded-xl"
            style={{ 
              background: 'rgba(255,255,255,0.03)', 
              border: '1px solid rgba(255,255,255,0.05)',
              transition: 'all 0.2s',
            }}
          >
            <div 
              className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-medium"
              style={{ color: roleStyles.color, borderColor: roleStyles.border, background: roleStyles.bg }}
            >
              {currentUser?.avatar}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-slate-200 truncate">{currentUser?.name}</div>
              <div className="text-xs text-[var(--text-muted)] truncate">{currentUser?.email}</div>
            </div>
            <button 
              onClick={logout} 
              className="p-2 -mr-1 text-[var(--text-muted)] hover:text-rose-400 hover:bg-rose-400/10 rounded-lg transition-colors group"
              title="Logout"
            >
              <LogOut size={16} className="group-hover:translate-x-[-2px] transition-transform" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden relative z-0">
        
        {/* Top Header - Glass Navbar */}
        <header 
          className="h-[72px] shrink-0 px-8 flex items-center justify-between sticky top-0 z-20"
          style={{
            background: 'rgba(15,15,20,0.8)',
            backdropFilter: 'blur(16px)',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <div className="flex-1">
            <div className="relative max-w-md hidden sm:block">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-4 w-4 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input 
                type="text" 
                className="input-premium pl-10 h-10 py-2 w-full max-w-sm rounded-[10px]" 
                placeholder={`Search ${roleLabel} dashboard...`} 
              />
            </div>
          </div>

          <div className="flex items-center gap-5">
            {role !== 'admin' && (
              <button 
                onClick={() => setNotifOpen(!notifOpen)} 
                className="relative w-10 h-10 rounded-xl flex items-center justify-center text-slate-300 hover:text-white transition-all"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}
              >
                <Bell size={18} />
                {unreadAlerts > 0 && (
                  <span 
                    className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full"
                    style={{ background: '#ef4444', boxShadow: '0 0 6px rgba(239,68,68,0.8)' }}
                  />
                )}
              </button>
            )}
            
            <div className="h-6 w-px" style={{ background: 'rgba(255,255,255,0.1)' }} />
            
            <div className="flex items-center gap-3 cursor-pointer group">
              <div className="text-right hidden md:block">
                <div className="text-sm font-medium text-slate-200 group-hover:text-white transition-colors">{currentUser?.name?.split(' ')[0]}</div>
                <div className="text-[10px] text-[var(--text-muted)] tracking-wider uppercase">{currentUser?.rollNo || roleLabel}</div>
              </div>
              <div 
                className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-medium border"
                style={{ color: roleStyles.color, borderColor: roleStyles.border, background: roleStyles.bg }}
              >
                {currentUser?.avatar}
              </div>
              <ChevronDown size={14} className="text-[var(--text-muted)] group-hover:text-slate-300 transition-colors" />
            </div>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 overflow-y-auto relative">
          <div 
            className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] rounded-full pointer-events-none -z-10"
            style={{ background: 'radial-gradient(circle, rgba(56,189,248,0.08) 0%, transparent 70%)' }}
          />
          
          <div className="p-8 max-w-[1600px] mx-auto z-10 fade-in-up">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}