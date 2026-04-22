import React, { useEffect, useState } from 'react';
import { PageHeader, RiskBadge } from '../../components/UI';
import useAppStore from '../../store';
import { api } from '../../api';
import { Bell, Eye, Loader2, CheckCircle, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function TeacherAlerts() {
  const navigate = useNavigate();
  const { alerts, fetchAlerts, markAlertRead, students, fetchStudents } = useAppStore();
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      await Promise.all([fetchAlerts(), fetchStudents()]);
      setLoading(false);
    }
    loadData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
  const read = alerts.filter(a => a.is_read);

  const severityColor = (s) => {
    const lvl = (s || '').toLowerCase();
    if (lvl === 'red') return 'var(--status-err)';
    if (lvl === 'yellow') return 'var(--status-warn)';
    return 'var(--text-muted)';
  };

  const initials = (name) =>
    (name || '?').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  const AlertCard = ({ alert }) => {
    const student = students.find(s => s.id === alert.student_id);
    const studentName = student?.name || alert.student_name || `Student #${alert.student_id}`;

    return (
      <div
        className="premium-card"
        style={{
          padding: '16px 20px',
          borderLeft: `3px solid ${severityColor(alert.severity)}`,
          opacity: alert.is_read ? 0.6 : 1,
          transition: 'opacity 0.2s',
          marginBottom: '0px' // for spacing in parent
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
          {/* Avatar */}
          <div style={{
            width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0,
            background: 'var(--bg-elevated)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '12px', fontWeight: '700', color: severityColor(alert.severity),
            border: `1px solid rgba(255,255,255,0.06)`
          }}>
            {initials(studentName)}
          </div>

          {/* Body */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
              <span style={{ fontSize: '13px', fontWeight: '600' }}>{studentName}</span>
              <RiskBadge level={(alert.severity || 'green').toLowerCase()} />
              <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginLeft: 'auto' }}>
                {alert.created_at ? new Date(alert.created_at).toLocaleString() : ''}
              </span>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.5', marginBottom: '12px' }}>
              {alert.message}
            </p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                className="btn"
                onClick={() => navigate(`/teacher/students/${alert.student_id}`)}
                style={{ fontSize: '11px', padding: '5px 12px' }}
              >
                <Eye size={12} /> View Student
              </button>
              {!alert.is_read && (
                <button
                  className="btn"
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
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', h: '300px' }}>
        <Loader2 className="animate-spin" style={{ color: 'var(--accent)' }} />
      </div>
    );
  }

  return (
    <div className="fade-in-up" style={{ maxWidth: '680px', margin: '0 auto', padding: '2rem 1rem' }}>
      <PageHeader
        title="Risk Alerts"
        subtitle="Students flagged by the wellbeing engine — behavioral signals only"
      />

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px' }}>
        <button
          className="btn"
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

      <div style={{ marginBottom: '24px', padding: '12px 16px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: '12px', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
        <strong style={{ color: 'var(--status-err)' }}>How alerts work:</strong> The wellbeing engine runs nightly, scoring each student on behavioral signals — activity gaps, late submissions, attendance drops, and marks trends. No mood surveys. No self-reporting.
      </div>

      {alerts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '64px 20px', color: 'var(--text-muted)', fontSize: '13px' }}>
          <Bell size={32} style={{ margin: '0 auto 16px', display: 'block', opacity: 0.3 }} />
          No alerts at the moment — all students look healthy.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {unread.length > 0 && (
            <>
              <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', padding: '4px 0' }}>
                Unread ({unread.length})
              </div>
              {unread.map(a => <AlertCard key={a.id} alert={a} />)}
            </>
          )}
          {read.length > 0 && (
            <>
              <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', padding: '4px 0', marginTop: '12px' }}>
                Read ({read.length})
              </div>
              {read.map(a => <AlertCard key={a.id} alert={a} />)}
            </>
          )}
        </div>
      )}

      <div style={{ textAlign: 'center', padding: '24px', fontSize: '11px', color: 'var(--text-muted)', marginTop: '16px' }}>
        Algorithms run at midnight · Next check in ~{24 - new Date().getHours()} hours
      </div>
    </div>
  );
}
