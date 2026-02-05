import { useEffect, useState } from 'react';
import { Link } from '../components/Link';
import { AppHeader } from '../components/AppHeader';
import { HeaderNav } from '../components/HeaderNav';
import { useAuth } from '../contexts/useAuth';
import { useRouteStore } from '../stores/routeStore';
import { sessionsAPI, type Session } from '../lib/api';
import styles from './DashboardPage.module.css';

export default function SessionsPage() {
  const { user } = useAuth();
  const params = useRouteStore((s) => s.params);
  const projectId = params.projectId!;
  const [sessions, setSessions] = useState<Session[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('');

  useEffect(() => {
    setLoading(true);
    sessionsAPI.list(projectId, { status: statusFilter || undefined, limit: 50 })
      .then(({ sessions, total }) => {
        setSessions(sessions);
        setTotal(total);
      })
      .finally(() => setLoading(false));
  }, [projectId, statusFilter]);

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
          <h2 style={{ margin: 0 }}>Sessions ({total})</h2>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {['', 'pending', 'active', 'completed', 'abandoned'].map(status => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                style={{
                  padding: '0.35rem 0.75rem',
                  fontSize: '0.8rem',
                  background: statusFilter === status ? '#6366f1' : '#141416',
                  color: statusFilter === status ? 'white' : '#a1a1aa',
                  border: '1px solid #27272a',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                {status || 'All'}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className={styles.loading}>Loading...</div>
        ) : sessions.length === 0 ? (
          <div className={styles.empty}>No sessions found</div>
        ) : (
          <div className={styles.card}>
            <div className={styles.sessionList}>
              {sessions.map(s => (
                <Link key={s.id} to={`/p/${projectId}/sessions/${s.id}`} className={styles.sessionItem}>
                  <span className={styles.sessionName}>
                    {s.participant_name || s.participant_email || 'Anonymous'}
                  </span>
                  <span className={`${styles.badge} ${styles[`badge_${s.status}`]}`}>{s.status}</span>
                  <span className={styles.sessionSignals}>{s.signal_count} signals</span>
                  <span className={styles.sessionDate}>
                    {s.duration_seconds ? `${Math.floor(s.duration_seconds / 60)}m` : '—'}
                  </span>
                  <span className={styles.sessionDate}>
                    {new Date(s.created_at).toLocaleDateString()}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
