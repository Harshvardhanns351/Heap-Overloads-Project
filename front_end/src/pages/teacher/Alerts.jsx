import React, { useEffect, useState } from 'react';
import { PageHeader, RiskBadge } from '../../components/UI';
import useAppStore from '../../store';
import { api } from '../../api';
import { Bell, Eye, Loader2, CheckCircle, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function TeacherAlerts() {
  const navigate = useNavigate();
  const { alerts, fetchAlerts, markAlertRead } = useAppStore();
  const [running, setRunning] = useState(false);

  useEffect(() => { fetchAlerts(); }, []);

  const handleRunCheck = async () => {
    setRunning(true);
    try {
      await api.alerts.runCheck();
      await fetchAlerts();
    } catch (e) {
      console.error('Wellbeing check failed', e);
    } finally {
      setRunning(false);
    }
  };

  const unread = alerts.filter(a => !a.is_read);
  const read   = alerts.filter(a => a.is_read);

  const severityColor = (s) => {
    const lvl = (s || '').toLowerCase();
    if (lvl === 'red')    return '#ef4444';
    if (lvl === 'yellow') return '#f59e0b';
    return '#808080';
  };

  const initials = (name) =>
    (name || '?').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  const AlertCard = ({ alert }) => (
    <div
      className="card"
      style={{
        padding: '16px 20px',
        borderLeft: `3px solid ${severityColor(alert.severity)}`,
        opacity: alert.is_read ? 0.55 : 1,
        transition: 'opacity 0.2s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
        {/* Avatar */}
        <div style={{
          width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0,
          background: `${severityColor(alert.severity)}18`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '12px', fontWeight: '700', color: severityColor(alert.severity),
        }}>
          {initials(alert.student_name)}
        </div>

        {/* Body */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
            <span style={{ fontSize: '13px', fontWeight: '600' }}>
              {alert.student_name || `Student #${alert.student_id}`}
            </span>
            <RiskBadge level={(alert.severity || 'green').toLowerCase()} />
            <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginLeft: 'auto' }}>
              {alert.created_at ? new Date(alert.created_at).toLocaleDateString() : ''}
            </span>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.5', marginBottom: '12px' }}>
            {alert.message}
          </p>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className="btn btn-ghost"
              onClick={() => navigate(`/teacher/students/${alert.student_id}`)}
              style={{ fontSize: '11px', padding: '5px 12px' }}
            >
              <Eye size={12} /> View Profile
            </button>
            {!alert.is_read && (
              <button
                className="btn btn-ghost"
                onClick={() => markAlertRead(alert.id)}
                style={{ fontSize: '11px', padding: '5px 12px' }}
              >
                <CheckCircle size={12} /> Mark Read
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="fade-in-up" style={{ maxWidth: '680px' }}>
      <PageHeader
        title="Risk Alerts"
        subtitle="Students flagged by the wellbeing engine — behavioral signals only"
      />

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px' }}>
        <button
          className="btn btn-ghost"
          onClick={handleRunCheck}
          disabled={running}
          style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          {running
            ? <Loader2 size={13} style={{ animation: 'spin 0.8s linear infinite' }} />
            : <RefreshCw size={13} />}
          {running ? 'Running check…' : 'Run Check Now'}
        </button>
      </div>

      <div style={{ marginBottom: '20px', padding: '12px 16px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: '10px', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
        <strong style={{ color: '#ef4444' }}>How alerts work:</strong> The wellbeing engine runs nightly, scoring each student on behavioral signals — activity gaps, late submissions, attendance drops, and marks trends. No mood surveys. No self-reporting.
      </div>

      {alerts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)', fontSize: '13px' }}>
          <Bell size={28} style={{ margin: '0 auto 12px', display: 'block', opacity: 0.3 }} />
          No alerts at the moment — all students look healthy.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {unread.length > 0 && (
            <>
              <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '4px 0' }}>
                Unread ({unread.length})
              </div>
              {unread.map(a => <AlertCard key={a.id} alert={a} />)}
            </>
          )}
          {read.length > 0 && (
            <>
              <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '4px 0', marginTop: '8px' }}>
                Read ({read.length})
              </div>
              {read.map(a => <AlertCard key={a.id} alert={a} />)}
            </>
          )}
        </div>
      )}

      <div style={{ textAlign: 'center', padding: '16px', fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>
        Algorithms run at midnight · Next check in ~{24 - new Date().getHours()} hours
      </div>
    </div>
  );
}
