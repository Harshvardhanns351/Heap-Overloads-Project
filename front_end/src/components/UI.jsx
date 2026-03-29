import React from 'react';

export function RiskBadge({ level, score }) {
  const cfg = {
    green: { label: 'Low Risk', cls: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.2)]', dot: 'bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,1)]' },
    yellow: { label: 'At Watch', cls: 'bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-[0_0_10px_rgba(245,158,11,0.2)]', dot: 'bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,1)]' },
    red: { label: 'At Risk', cls: 'bg-rose-500/10 text-rose-400 border border-rose-500/20 shadow-[0_0_10px_rgba(244,63,94,0.2)]', dot: 'bg-rose-400 shadow-[0_0_8px_rgba(244,63,94,1)]' },
  };
  const c = cfg[level] || cfg.green;

  return (
    <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold leading-none ${c.cls} backdrop-blur-sm transition-all hover:scale-105`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot} animate-pulse`} />
      {c.label}{score !== undefined && ` · ${score}`}
    </span>
  );
}

export function StatCard({ label, value, sub, color = 'sky', icon: Icon, trend }) {
  const colorMap = {
    sky: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
    violet: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
    emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    rose: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
    amber: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  };
  const clr = colorMap[color] || colorMap.sky;

  return (
    <div className="premium-card group hover:-translate-y-1">
      {/* Background radial glow */}
      <div className={`absolute -top-10 -right-10 w-32 h-32 rounded-full blur-3xl opacity-30 pointer-events-none transition-all duration-500 group-hover:scale-150 ${clr.replace('text-', 'bg-').split(' ')[0]}`} />
      
      <div className="flex items-start justify-between mb-4 relative z-10">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{label}</span>
        {Icon && (
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center border shadow-lg backdrop-blur-md transition-all duration-300 group-hover:scale-110 ${clr}`}>
            <Icon size={16} />
          </div>
        )}
      </div>
      
      <div className="relative z-10">
        <div className="text-4xl font-black font-space tracking-tight text-white mb-1 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-slate-400 transition-all">
          {value}
        </div>
        {sub && <div className="text-xs text-slate-500 font-medium">{sub}</div>}
        
        {trend && (
          <div className={`text-xs font-bold mt-3 flex items-center gap-1.5 ${trend > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            <span className={`flex items-center justify-center w-4 h-4 rounded-full ${trend > 0 ? 'bg-emerald-500/20' : 'bg-rose-500/20'}`}>
              {trend > 0 ? '↑' : '↓'}
            </span>
            <span>{Math.abs(trend)}% vs last month</span>
          </div>
        )}
      </div>
    </div>
  );
}

export function PageHeader({ title, subtitle, action }) {
  return (
    <div className="flex items-start justify-between mb-8 pb-6 border-b border-white/10">
      <div>
        <h1 className="text-3xl font-black font-space tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-200 to-slate-400 mb-2">
          {title}
        </h1>
        {subtitle && <p className="text-sm font-medium text-slate-400">{subtitle}</p>}
      </div>
      {action && <div className="ml-4 shrink-0">{action}</div>}
    </div>
  );
}

export function ProgressBar({ value, max = 100, color = 'bg-sky-500', height = 'h-2' }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className={`w-full bg-[#0a0a2a] rounded-full overflow-hidden border border-white/5 shadow-inner ${height}`}>
      <div 
        className={`h-full rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_currentColor] ${color}`} 
        style={{ width: `${pct}%` }} 
      />
    </div>
  );
}

export function EmptyState({ icon: Icon, title, desc }) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl glass-panel border-dashed border-2 border-white/10 backdrop-blur-sm">
      <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4 border border-white/10 shadow-xl">
        {Icon && <Icon size={32} className="text-slate-500" />}
      </div>
      <div className="text-lg font-bold text-white mb-2">{title}</div>
      {desc && <div className="text-sm text-slate-400 max-w-sm">{desc}</div>}
    </div>
  );
}

export function Tabs({ tabs, active, onChange }) {
  return (
    <div className="inline-flex gap-1 bg-[#0a0a2a]/80 p-1.5 rounded-xl border border-white/10 backdrop-blur-md mb-8 shadow-inner overflow-hidden">
      {tabs.map((t) => {
        const isActive = active === t.key;
        return (
          <button
            key={t.key}
            onClick={() => onChange(t.key)}
            className={`relative px-5 py-2.5 rounded-lg text-sm font-bold transition-all duration-300 z-10 
              ${isActive ? 'text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'}
            `}
          >
            {isActive && (
              <div className="absolute inset-0 bg-white/10 border border-white/20 rounded-lg shadow-[0_2px_10px_rgba(0,0,0,0.5)] -z-10" />
            )}
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

export function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6" onClick={onClose}>
      
      {/* Backdrop */}
      <div className="absolute inset-0 bg-[#030014]/80 backdrop-blur-xl transition-opacity animate-fade-in" />
      
      {/* Modal Card */}
      <div 
        className="premium-card relative w-full max-w-2xl max-h-[90vh] overflow-y-auto custom-scrollbar shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8)] border-white/20" 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-[#0a0a2a]/95 backdrop-blur-md pt-2 pb-4 mb-6 border-b border-white/10 flex items-center justify-between z-20 -mt-2 -mx-6 px-8 rounded-t-2xl">
          <h3 className="text-xl font-bold font-space text-white tracking-tight">{title}</h3>
          <button 
            onClick={onClose} 
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-rose-500/20 hover:text-rose-400 flex items-center justify-center transition-all text-slate-400 border border-transparent hover:border-rose-500/30"
          >
            ×
          </button>
        </div>
        
        <div className="relative z-10 pb-2">
          {children}
        </div>
      </div>
    </div>
  );
}
