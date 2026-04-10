import React from 'react';

export function RiskBadge({ level, score }) {
  const cfg = {
    green:  { label: 'Low Risk', bg: 'rgba(255,255,255,0.06)', color: '#a0a0a0', border: 'rgba(255,255,255,0.1)' },
    yellow: { label: 'At Watch', bg: 'rgba(245,158,11,0.1)',   color: '#fbbf24', border: 'rgba(245,158,11,0.2)' },
    red:    { label: 'At Risk',  bg: 'rgba(239,68,68,0.1)',    color: '#f87171', border: 'rgba(239,68,68,0.2)'  },
  };
  const c = cfg[level] || cfg.green;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '3px 10px', borderRadius: '99px', fontSize: '11px', fontWeight: '600', background: c.bg, color: c.color, border: `1px solid ${c.border}` }}>
      <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: c.color, flexShrink: 0 }} />
      {c.label}{score !== undefined && ` · ${score}`}
    </span>
  );
}

export function StatCard({ label, value, sub, icon: Icon, trend }) {
  return (
    <div className="premium-card">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '14px' }}>
        <span style={{ fontSize: '10px', fontWeight: '700', color: '#505050', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</span>
        {Icon && (
          <div style={{ width: '30px', height: '30px', borderRadius: '7px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon size={14} style={{ color: '#808080' }} />
          </div>
        )}
      </div>
      <div style={{ fontSize: '28px', fontWeight: '800', color: '#f0f0f0', fontFamily: 'Space Grotesk, sans-serif', lineHeight: 1, marginBottom: '4px' }}>{value}</div>
      {sub && <div style={{ fontSize: '11px', color: '#505050' }}>{sub}</div>}
      {trend && (
        <div style={{ fontSize: '11px', fontWeight: '600', marginTop: '10px', color: trend > 0 ? '#6ee7b7' : '#f87171', display: 'flex', alignItems: 'center', gap: '4px' }}>
          {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}% vs last month
        </div>
      )}
    </div>
  );
}

export function PageHeader({ title, subtitle, action }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '28px', paddingBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
      <div>
        <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '800', fontFamily: 'Space Grotesk, sans-serif', color: '#f0f0f0', letterSpacing: '-0.02em' }}>{title}</h1>
        {subtitle && <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#606060' }}>{subtitle}</p>}
      </div>
      {action && <div style={{ marginLeft: '16px', flexShrink: 0 }}>{action}</div>}
    </div>
  );
}

export function ProgressBar({ value, max = 100, color, height = 'h-2' }) {
  const pct = Math.min(100, (value / max) * 100);
  // Accept both hex colors and Tailwind class strings — normalize to inline style
  const barColor = color && color.startsWith('#') ? color : '#505050';
  const h = typeof height === 'number' ? `${height}px` : '6px';
  return (
    <div style={{ width: '100%', height: h, background: 'rgba(255,255,255,0.06)', borderRadius: '99px', overflow: 'hidden' }}>
      <div style={{ width: `${pct}%`, height: '100%', background: barColor, borderRadius: '99px', transition: 'width 0.6s ease' }} />
    </div>
  );
}

export function EmptyState({ icon: Icon, title, desc }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px', textAlign: 'center', borderRadius: '12px', border: '1px dashed rgba(255,255,255,0.08)' }}>
      {Icon && (
        <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px' }}>
          <Icon size={24} style={{ color: '#404040' }} />
        </div>
      )}
      <div style={{ fontSize: '14px', fontWeight: '600', color: '#c0c0c0', marginBottom: '6px' }}>{title}</div>
      {desc && <div style={{ fontSize: '12px', color: '#505050', maxWidth: '280px' }}>{desc}</div>}
    </div>
  );
}

export function Tabs({ tabs, active, onChange }) {
  return (
    <div style={{ display: 'inline-flex', gap: '2px', background: '#111111', padding: '4px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.07)', marginBottom: '24px' }}>
      {tabs.map(t => {
        const isActive = active === t.key;
        return (
          <button key={t.key} onClick={() => onChange(t.key)} style={{
            padding: '7px 16px', borderRadius: '7px', fontSize: '12px', fontWeight: '600',
            cursor: 'pointer', border: 'none', fontFamily: 'inherit', transition: 'all 0.15s',
            background: isActive ? 'rgba(255,255,255,0.1)' : 'transparent',
            color: isActive ? '#f0f0f0' : '#606060',
          }}
            onMouseEnter={e => { if (!isActive) e.currentTarget.style.color = '#a0a0a0'; }}
            onMouseLeave={e => { if (!isActive) e.currentTarget.style.color = '#606060'; }}
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
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }} onClick={onClose}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }} />
      <div className="premium-card" style={{ position: 'relative', width: '100%', maxWidth: '640px', maxHeight: '90vh', overflowY: 'auto', zIndex: 1, boxShadow: '0 20px 60px rgba(0,0,0,0.8)' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#f0f0f0', fontFamily: 'Space Grotesk, sans-serif' }}>{title}</h3>
          <button onClick={onClose} style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer', color: '#808080', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', transition: 'all 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; e.currentTarget.style.color = '#ef4444'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#808080'; }}>
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
