import React from 'react';

export function RiskBadge({ level, score }) {
  const cfg = {
    green:  { label: 'Low Risk', bg: 'rgba(52,211,153,0.1)',  color: 'var(--status-ok)', border: 'rgba(52,211,153,0.2)'  },
    yellow: { label: 'At Watch', bg: 'rgba(251,191,36,0.1)', color: 'var(--status-warn)', border: 'rgba(251,191,36,0.2)' },
    red:    { label: 'At Risk',  bg: 'rgba(248,113,113,0.1)',  color: 'var(--status-err)', border: 'rgba(248,113,113,0.2)'  },
  };
  const c = cfg[level] || cfg.green;

  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold"
      style={{ background: c.bg, color: c.color, border: `1px solid ${c.border}` }}
    >
      <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: c.color }} />
      {c.label}{score !== undefined && ` · ${score}`}
    </span>
  );
}

export function StatCard({ label, value, sub, color, icon: Icon, trend }) {
  return (
    <div className="premium-card group">
      <div className="flex items-start justify-between mb-4">
        <span
          className="text-[10px] font-bold uppercase tracking-widest"
          style={{ color: 'var(--text-muted)' }}
        >
          {label}
        </span>
        {Icon && (
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)' }}
          >
            <Icon size={15} style={{ color: color || 'rgba(255,255,255,0.4)' }} />
          </div>
        )}
      </div>

      <div
        className="text-[2rem] font-black font-space tracking-tight mb-1"
        style={{ color: 'var(--text-primary)' }}
      >
        {value}
      </div>
      {sub && (
        <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{sub}</div>
      )}

      {trend && (
        <div
          className="text-[11px] font-semibold mt-3 flex items-center gap-1.5"
          style={{ color: trend > 0 ? 'var(--status-ok)' : 'var(--status-err)' }}
        >
          <span>{trend > 0 ? '↑' : '↓'} {Math.abs(trend)}% vs last month</span>
        </div>
      )}
    </div>
  );
}

export function PageHeader({ title, subtitle, action }) {
  return (
    <div
      className="flex items-start justify-between mb-7 pb-5"
      style={{ borderBottom: '1px solid var(--border)' }}
    >
      <div>
        <h1
          className="text-[1.6rem] font-black font-space tracking-tight mb-1"
          style={{ color: 'var(--text-primary)' }}
        >
          {title}
        </h1>
        {subtitle && (
          <p className="text-[12px] font-medium" style={{ color: 'var(--text-muted)' }}>
            {subtitle}
          </p>
        )}
      </div>
      {action && <div className="ml-4 shrink-0">{action}</div>}
    </div>
  );
}

export function ProgressBar({ value, max = 100, color, height = 5 }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div
      className="w-full rounded-full overflow-hidden"
      style={{ height: `${height}px`, background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)' }}
    >
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{ width: `${pct}%`, background: color || 'rgba(255,255,255,0.4)' }}
      />
    </div>
  );
}

export function EmptyState({ icon: Icon, title, desc }) {
  return (
    <div
      className="flex flex-col items-center justify-center p-12 text-center rounded-xl"
      style={{ border: '1px dashed var(--border)', background: 'rgba(255,255,255,0.01)' }}
    >
      <div
        className="w-14 h-14 rounded-full flex items-center justify-center mb-4"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)' }}
      >
        {Icon && <Icon size={26} style={{ color: 'var(--text-muted)' }} />}
      </div>
      <div className="text-[14px] font-bold mb-2" style={{ color: 'var(--text-primary)' }}>{title}</div>
      {desc && <div className="text-[12px] max-w-xs" style={{ color: 'var(--text-muted)' }}>{desc}</div>}
    </div>
  );
}

export function Tabs({ tabs, active, onChange }) {
  return (
    <div
      className="inline-flex gap-1 p-1 rounded-xl mb-6"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)' }}
    >
      {tabs.map((t) => {
        const isActive = active === t.key;
        return (
          <button
            key={t.key}
            onClick={() => onChange(t.key)}
            className="relative px-4 py-2 rounded-lg text-[12px] font-semibold transition-all duration-200"
            style={{
              background: isActive ? 'rgba(255,255,255,0.08)' : 'transparent',
              color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
              border: isActive ? '1px solid var(--border-hover)' : '1px solid transparent',
            }}
          >
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="absolute inset-0"
        style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(12px)' }}
      />
      <div
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto custom-scrollbar rounded-2xl"
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', boxShadow: '0 20px 60px rgba(0,0,0,0.6)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="sticky top-0 flex items-center justify-between px-6 py-4 rounded-t-2xl"
          style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border)', backdropFilter: 'blur(12px)' }}
        >
          <h3 className="text-[15px] font-bold font-space" style={{ color: 'var(--text-primary)' }}>{title}</h3>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center text-[16px] transition-colors"
            style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(248,113,113,0.1)'; e.currentTarget.style.color = 'var(--status-err)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
          >
            ×
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
