import React from 'react';

export function RiskBadge({ level, score }) {
  const cfg = {
    green: { label: 'On Track', cls: 'risk-badge-green' },
    yellow: { label: 'Watching', cls: 'risk-badge-yellow' },
    red: { label: 'At Risk', cls: 'risk-badge-red' },
  };
  const c = cfg[level] || cfg.green;

  return (
    <span className={c.cls}>
      {c.label}{score !== undefined && ` (${score})`}
    </span>
  );
}

export function StatCard({ label, value, sub, color = '#8b5cf6', icon: Icon, trend }) {
  return (
    <div className="neumorphic p-5 group hover:translate-y-[-2px] transition-all duration-200">
      <div className="flex items-start justify-between mb-4">
        <span className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">{label}</span>
        {Icon && (
          <div 
            className="w-8 h-8 rounded-lg flex items-center justify-center border"
            style={{ background: `${color}15`, borderColor: `${color}30`, color }}
          >
            <Icon size={16} />
          </div>
        )}
      </div>
      
      <div>
        <div 
          className="text-[28px] font-medium text-white mb-1"
          style={{ fontFamily: 'Inter, sans-serif' }}
        >
          {value}
        </div>
        {sub && <div className="text-xs text-[var(--text-muted)]">{sub}</div>}
        
        {trend && (
          <div className={`text-xs font-medium mt-3 flex items-center gap-1.5 ${trend > 0 ? 'text-[#1D9E75]' : 'text-[#A32D2D]'}`}>
            <span>{trend > 0 ? '↑' : '↓'}</span>
            <span>{Math.abs(trend)}%</span>
          </div>
        )}
      </div>
    </div>
  );
}

export function PageHeader({ title, subtitle, action }) {
  return (
    <div className="flex items-start justify-between mb-8 pb-6 border-b border-white/[0.06]">
      <div>
        <h1 className="text-2xl font-medium text-white tracking-tight mb-2">
          {title}
        </h1>
        {subtitle && <p className="text-sm font-normal text-[var(--text-muted)]">{subtitle}</p>}
      </div>
      {action && <div className="ml-4 shrink-0">{action}</div>}
    </div>
  );
}

export function ProgressBar({ value, max = 100, color = '#8b5cf6', height = 5 }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div 
      className="w-full rounded-full overflow-hidden"
      style={{ 
        background: 'rgba(255,255,255,0.06)', 
        height: `${height}px` 
      }}
    >
      <div 
        className="h-full rounded-full transition-all duration-500"
        style={{ 
          width: `${pct}%`,
          background: color,
          boxShadow: `0 0 10px ${color}40`
        }} 
      />
    </div>
  );
}

export function EmptyState({ icon: Icon, title, desc }) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl glass-panel border border-dashed border-white/[0.1]">
      <div className="w-16 h-16 rounded-full bg-white/[0.03] flex items-center justify-center mb-4 border border-white/[0.08]">
        {Icon && <Icon size={32} className="text-[var(--text-muted)]" />}
      </div>
      <div className="text-base font-medium text-white mb-2">{title}</div>
      {desc && <div className="text-sm text-[var(--text-muted)] max-w-sm">{desc}</div>}
    </div>
  );
}

export function Tabs({ tabs, active, onChange }) {
  return (
    <div className="inline-flex gap-1 glass-panel p-1.5 rounded-xl mb-8">
      {tabs.map((t) => {
        const isActive = active === t.key;
        return (
          <button
            key={t.key}
            onClick={() => onChange(t.key)}
            className={`relative px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 
              ${isActive ? 'text-white' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'}
            `}
          >
            {isActive && (
              <div 
                className="absolute inset-0 rounded-lg" 
                style={{ background: 'rgba(83, 74, 183, 0.2)', border: '1px solid rgba(83, 74, 183, 0.3)' }} 
              />
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-[#030014]/80 glass-tooltip" />
      <div 
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-white/[0.15] glass-elevated shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 glass-elevated p-6 pb-4 mb-4 border-b border-white/[0.06] flex items-center justify-between rounded-t-2xl -mx-6 -mt-6 px-8">
          <h3 className="text-lg font-medium text-white">{title}</h3>
          <button 
            onClick={onClose} 
            className="w-8 h-8 rounded-full bg-white/[0.05] hover:bg-rose-500/20 hover:text-rose-400 flex items-center justify-center transition-all text-[var(--text-muted)]"
          >
            ×
          </button>
        </div>
        <div className="px-8 pb-6">
          {children}
        </div>
      </div>
    </div>
  );
}