import { useEffect, useState } from 'react';
import { Link } from '../components/Link';
import { AppHeader } from '../components/AppHeader';
import { HeaderNav } from '../components/HeaderNav';
import { useAuth } from '../contexts/useAuth';
import { useRouteStore } from '../stores/routeStore';
import { signalsAPI, type Signal } from '../lib/api';
import styles from './DashboardPage.module.css';

const SIGNAL_TYPES = [
  { value: '', label: 'All Types' },
  { value: 'struggling_moment', label: '😤 Struggling Moment' },
  { value: 'desired_outcome', label: '🎯 Desired Outcome' },
  { value: 'hiring_criteria', label: '✅ Hiring Criteria' },
  { value: 'firing_moment', label: '🚪 Firing Moment' },
  { value: 'workaround', label: '🔧 Workaround' },
  { value: 'emotional_response', label: '💡 Emotional Response' },
];

export default function SignalsPage() {
  const { user } = useAuth();
  const params = useRouteStore((s) => s.params);
  const projectId = params.projectId!;
  const [signals, setSignals] = useState<Signal[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('');

  useEffect(() => {
    setLoading(true);
    signalsAPI.list(projectId, { type: typeFilter || undefined, limit: 50 })
      .then(({ signals, total }) => {
        setSignals(signals);
        setTotal(total);
      })
      .finally(() => setLoading(false));
  }, [projectId, typeFilter]);

  return (
    <div className={styles.page}>
      <AppHeader
        leftSlot={<Link to={`/p/${projectId}`} className={styles.brand}>UserTests</Link>}
        rightSlot={<HeaderNav userName={user?.name} userEmail={user?.email} />}
      />
      <nav className={styles.subnav}>
        <Link to={`/p/${projectId}`} className={styles.subnavLink}>Overview</Link>
        <Link to={`/p/${projectId}/sessions`} className={styles.subnavLink}>Sessions</Link>
        <Link to={`/p/${projectId}/signals`} className={styles.subnavLink}>Signals</Link>
        <Link to={`/p/${projectId}/tasks`} className={styles.subnavLink}>Tasks</Link>
        <Link to={`/p/${projectId}/screeners`} className={styles.subnavLink}>Screeners</Link>
      </nav>

      <main className={styles.main}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ margin: 0 }}>Signals ({total})</h2>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            style={{
              padding: '0.35rem 0.75rem',
              fontSize: '0.8rem',
              background: '#141416',
              color: '#e4e4e7',
              border: '1px solid #27272a',
              borderRadius: '4px',
            }}
          >
            {SIGNAL_TYPES.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className={styles.loading}>Loading...</div>
        ) : signals.length === 0 ? (
          <div className={styles.empty}>No signals found</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {signals.map(signal => (
              <div key={signal.id} className={styles.card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                  <span style={{
                    fontSize: '0.75rem',
                    padding: '0.15rem 0.5rem',
                    borderRadius: '9999px',
                    background: signalColor(signal.signal_type),
                    color: 'white',
                  }}>
                    {signal.signal_type.replace('_', ' ')}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: '#71717a' }}>
                    confidence: {(signal.confidence * 100).toFixed(0)}%
                  </span>
                </div>
                <blockquote style={{
                  margin: '0.5rem 0',
                  padding: '0.5rem 1rem',
                  borderLeft: '3px solid #6366f1',
                  color: '#e4e4e7',
                  fontStyle: 'italic',
                  fontSize: '0.9rem',
                }}>
                  "{signal.quote}"
                </blockquote>
                {signal.analysis && (
                  <p style={{ fontSize: '0.8rem', color: '#a1a1aa', margin: '0.5rem 0 0' }}>
                    {signal.analysis}
                  </p>
                )}
                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', fontSize: '0.75rem', color: '#71717a' }}>
                  <Link to={`/p/${projectId}/sessions/${signal.session_id}`} style={{ color: '#6366f1' }}>
                    View session →
                  </Link>
                  {signal.task_id && (
                    <Link to={`/p/${projectId}/tasks/${signal.task_id}`} style={{ color: '#6366f1' }}>
                      Linked task →
                    </Link>
                  )}
                  <span>{new Date(signal.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function signalColor(type: string): string {
  switch (type) {
    case 'struggling_moment': return '#dc2626';
    case 'desired_outcome': return '#2563eb';
    case 'hiring_criteria': return '#16a34a';
    case 'firing_moment': return '#ea580c';
    case 'workaround': return '#9333ea';
    case 'emotional_response': return '#ca8a04';
    default: return '#71717a';
  }
}
