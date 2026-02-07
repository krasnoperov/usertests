import { useEffect, useState } from 'react';
import { Link } from '../components/Link';
import { AppHeader } from '../components/AppHeader';
import { HeaderNav } from '../components/HeaderNav';
import { useAuth } from '../contexts/useAuth';
import { useRouteStore } from '../stores/routeStore';
import { sessionsAPI, signalsAPI, type Session, type SessionEvent, type SessionMessage, type Signal } from '../lib/api';
import styles from './EntityPage.module.css';

export default function SessionDetailPage() {
  const { user } = useAuth();
  const params = useRouteStore((s) => s.params);
  const projectId = params.projectId!;
  const sessionId = params.sessionId!;

  const [session, setSession] = useState<Session | null>(null);
  const [messages, setMessages] = useState<SessionMessage[]>([]);
  const [events, setEvents] = useState<SessionEvent[]>([]);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSessionDetails = async () => {
    setLoading(true);
    setError(null);

    try {
      const [sessionResult, signalResult] = await Promise.all([
        sessionsAPI.get(projectId, sessionId),
        signalsAPI.list(projectId, { session_id: sessionId, limit: 100 }),
      ]);

      setSession(sessionResult.session);
      setMessages(sessionResult.messages);
      setEvents(sessionResult.events);
      setSignals(signalResult.signals);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load session');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadSessionDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, sessionId]);

  return (
    <div className={styles.page}>
      <AppHeader
        leftSlot={<Link to={`/p/${projectId}`} className={styles.brand}>UserTests</Link>}
        rightSlot={<HeaderNav userName={user?.name} userEmail={user?.email} />}
      />

      <nav className={styles.subnav}>
        <Link to={`/p/${projectId}`} className={styles.subnavLink}>Overview</Link>
        <Link to={`/p/${projectId}/sessions`} className={`${styles.subnavLink} ${styles.active}`}>Sessions</Link>
        <Link to={`/p/${projectId}/signals`} className={styles.subnavLink}>Signals</Link>
        <Link to={`/p/${projectId}/tasks`} className={styles.subnavLink}>Tasks</Link>
        <Link to={`/p/${projectId}/screeners`} className={styles.subnavLink}>Screeners</Link>
        <Link to={`/p/${projectId}/settings`} className={styles.subnavLink}>Settings</Link>
      </nav>

      <main className={styles.main}>
        {loading && <div className={styles.loading}>Loading session...</div>}
        {error && <div className={styles.error}>{error}</div>}

        {!loading && !error && session && (
          <div className={styles.grid}>
            <div className={styles.headingRow}>
              <h2 className={styles.title}>Session {session.id}</h2>
              <Link to={`/p/${projectId}/sessions`} className={styles.link}>← Back to sessions</Link>
            </div>

            <section className={styles.card}>
              <h3 className={styles.cardTitle}>Session Metadata</h3>
              <div className={styles.metaGrid}>
                <Meta label="Status" value={session.status} />
                <Meta label="Interview Mode" value={session.interview_mode} />
                <Meta label="Current Phase" value={session.current_phase || '—'} />
                <Meta label="Participant" value={session.participant_name || session.participant_email || 'Anonymous'} />
                <Meta label="Duration" value={formatDuration(session.duration_seconds)} />
                <Meta label="Signals" value={String(session.signal_count)} />
                <Meta label="Created" value={new Date(session.created_at).toLocaleString()} />
                <Meta label="Completed" value={session.completed_at ? new Date(session.completed_at).toLocaleString() : '—'} />
              </div>
            </section>

            <section className={styles.card}>
              <h3 className={styles.cardTitle}>Transcript</h3>
              {messages.length === 0 ? (
                <div className={styles.empty}>No messages recorded</div>
              ) : (
                <div className={styles.list}>
                  {messages.map((message) => (
                    <div key={message.id} className={styles.row}>
                      <div className={styles.rowHeader}>
                        <span className={styles.badge}>{message.role}</span>
                        <span className={styles.small}>{formatMs(message.timestamp_ms)}</span>
                      </div>
                      <p style={{ margin: 0, lineHeight: 1.4 }}>{message.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <div className={`${styles.grid} ${styles.gridTwo}`}>
              <section className={styles.card}>
                <h3 className={styles.cardTitle}>Event Timeline</h3>
                {events.length === 0 ? (
                  <div className={styles.empty}>No interaction events captured</div>
                ) : (
                  <div className={styles.list}>
                    {events.map((event) => (
                      <div key={event.id} className={styles.row}>
                        <div className={styles.rowHeader}>
                          <span className={styles.badge}>{event.event_type}</span>
                          <span className={styles.small}>{formatMs(event.timestamp_ms)}</span>
                        </div>
                        <div className={styles.small}>
                          {event.target_selector && <div>Target: {event.target_selector}</div>}
                          {event.url && <div>URL: {event.url}</div>}
                          {event.page_title && <div>Title: {event.page_title}</div>}
                        </div>
                        <pre className={styles.pre} style={{ marginTop: '0.5rem', maxHeight: '160px' }}>
                          {prettyJSON(parseJSON(event.data_json))}
                        </pre>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className={styles.card}>
                <h3 className={styles.cardTitle}>Linked Signals ({signals.length})</h3>
                {signals.length === 0 ? (
                  <div className={styles.empty}>No signals extracted yet</div>
                ) : (
                  <div className={styles.list}>
                    {signals.map((signal) => (
                      <div key={signal.id} className={styles.row}>
                        <div className={styles.rowHeader}>
                          <span className={styles.badge}>{signal.signal_type}</span>
                          <span className={styles.small}>{Math.round(signal.confidence * 100)}% confidence</span>
                        </div>
                        <blockquote className={styles.quote}>“{signal.quote}”</blockquote>
                        <div className={styles.buttonRow}>
                          <Link to={`/p/${projectId}/signals`} className={styles.link}>View in signals</Link>
                          {signal.task_id && (
                            <Link to={`/p/${projectId}/tasks/${signal.task_id}`} className={styles.link}>Linked task</Link>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.metaItem}>
      <span className={styles.metaLabel}>{label}</span>
      <span className={styles.metaValue}>{value}</span>
    </div>
  );
}

function formatDuration(seconds: number | null): string {
  if (seconds === null || seconds < 0) return '—';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s`;
}

function formatMs(timestampMs: number): string {
  const mins = Math.floor(timestampMs / 60000);
  const secs = Math.floor((timestampMs % 60000) / 1000);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function parseJSON(input: string): unknown {
  try {
    return JSON.parse(input) as unknown;
  } catch {
    return input;
  }
}

function prettyJSON(value: unknown): string {
  return typeof value === 'string' ? value : JSON.stringify(value, null, 2);
}
