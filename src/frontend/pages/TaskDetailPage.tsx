import { useEffect, useState } from 'react';
import { Link } from '../components/Link';
import { AppHeader } from '../components/AppHeader';
import { HeaderNav } from '../components/HeaderNav';
import { useAuth } from '../contexts/useAuth';
import { useRouteStore } from '../stores/routeStore';
import { tasksAPI, type Signal, type Task } from '../lib/api';
import styles from './EntityPage.module.css';

const TASK_STATUSES = ['backlog', 'ready', 'in_progress', 'review', 'deployed', 'measuring', 'done', 'wont_fix'] as const;

export default function TaskDetailPage() {
  const { user } = useAuth();
  const params = useRouteStore((s) => s.params);
  const projectId = params.projectId!;
  const taskId = params.taskId!;

  const [task, setTask] = useState<Task | null>(null);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusUpdating, setStatusUpdating] = useState(false);

  const [specResult, setSpecResult] = useState<unknown | null>(null);
  const [implementResult, setImplementResult] = useState<unknown | null>(null);
  const [impactResult, setImpactResult] = useState<unknown | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<'spec' | 'implement' | 'measure' | null>(null);

  useEffect(() => {
    loadTask();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, taskId]);

  const loadTask = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await tasksAPI.get(projectId, taskId);
      setTask(result.task);
      setSignals(result.signals);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load task');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (status: string) => {
    if (!task) return;
    setStatusUpdating(true);
    setActionError(null);
    try {
      const result = await tasksAPI.update(projectId, task.id, { status });
      setTask(result.task);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Failed to update task status');
    } finally {
      setStatusUpdating(false);
    }
  };

  const runAction = async (action: 'spec' | 'implement' | 'measure') => {
    if (!task) return;

    setActionLoading(action);
    setActionError(null);

    try {
      if (action === 'spec') {
        const result = await tasksAPI.generateSpec(projectId, task.id);
        setSpecResult(result);
      }
      if (action === 'implement') {
        const result = await tasksAPI.implement(projectId, task.id);
        setImplementResult(result);
        await loadTask();
      }
      if (action === 'measure') {
        const result = await tasksAPI.measureImpact(projectId, task.id);
        setImpactResult(result);
        await loadTask();
      }
    } catch (e) {
      setActionError(e instanceof Error ? e.message : `Failed to ${action}`);
    } finally {
      setActionLoading(null);
    }
  };

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
        <Link to={`/p/${projectId}/tasks`} className={`${styles.subnavLink} ${styles.active}`}>Tasks</Link>
        <Link to={`/p/${projectId}/screeners`} className={styles.subnavLink}>Screeners</Link>
        <Link to={`/p/${projectId}/settings`} className={styles.subnavLink}>Settings</Link>
      </nav>

      <main className={styles.main}>
        {loading && <div className={styles.loading}>Loading task...</div>}
        {error && <div className={styles.error}>{error}</div>}

        {!loading && !error && task && (
          <div className={styles.grid}>
            <div className={styles.headingRow}>
              <h2 className={styles.title}>{task.title}</h2>
              <Link to={`/p/${projectId}/tasks`} className={styles.link}>← Back to tasks</Link>
            </div>

            <section className={styles.card}>
              <h3 className={styles.cardTitle}>Task Details</h3>
              <div className={styles.metaGrid}>
                <Meta label="Status" value={task.status} />
                <Meta label="Type" value={task.task_type} />
                <Meta label="Priority" value={`${task.priority_label} (${task.priority_score})`} />
                <Meta label="Effort" value={task.effort_estimate || '—'} />
                <Meta label="Signals" value={String(task.signal_count)} />
                <Meta label="Sessions" value={String(task.session_count)} />
              </div>

              {task.description && (
                <p style={{ marginTop: '0.8rem', lineHeight: 1.5 }}>{task.description}</p>
              )}

              <div className={styles.formRow} style={{ marginTop: '0.9rem' }}>
                <label className={styles.label}>Update status</label>
                <select
                  className={styles.select}
                  value={task.status}
                  onChange={(e) => void updateStatus(e.target.value)}
                  disabled={statusUpdating}
                >
                  {TASK_STATUSES.map((status) => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>
            </section>

            <section className={styles.card}>
              <h3 className={styles.cardTitle}>Implementation Actions</h3>
              <div className={styles.buttonRow}>
                <button className={`${styles.button} ${styles.buttonPrimary}`} onClick={() => void runAction('spec')} disabled={actionLoading !== null}>
                  {actionLoading === 'spec' ? 'Generating...' : 'Generate Spec'}
                </button>
                <button className={`${styles.button} ${styles.buttonPrimary}`} onClick={() => void runAction('implement')} disabled={actionLoading !== null}>
                  {actionLoading === 'implement' ? 'Implementing...' : 'Implement'}
                </button>
                <button className={styles.button} onClick={() => void runAction('measure')} disabled={actionLoading !== null}>
                  {actionLoading === 'measure' ? 'Measuring...' : 'Measure Impact'}
                </button>
              </div>

              {actionError && <div className={styles.error} style={{ textAlign: 'left', padding: '0.6rem 0 0' }}>{actionError}</div>}

              {task.implementation_pr_url && (
                <div className={styles.small} style={{ marginTop: '0.8rem' }}>
                  PR: <a href={task.implementation_pr_url} className={styles.link} target="_blank" rel="noreferrer">{task.implementation_pr_url}</a>
                </div>
              )}
              {task.impact_score !== null && (
                <div className={styles.small}>Impact score: {task.impact_score.toFixed(2)}%</div>
              )}
            </section>

            <section className={styles.card}>
              <h3 className={styles.cardTitle}>Evidence Signals ({signals.length})</h3>
              {signals.length === 0 ? (
                <div className={styles.empty}>No linked signals</div>
              ) : (
                <div className={styles.list}>
                  {signals.map((signal) => (
                    <div className={styles.row} key={signal.id}>
                      <div className={styles.rowHeader}>
                        <span className={styles.badge}>{signal.signal_type}</span>
                        <span className={styles.small}>{Math.round(signal.confidence * 100)}% confidence</span>
                      </div>
                      <blockquote className={styles.quote}>“{signal.quote}”</blockquote>
                      <Link className={styles.link} to={`/p/${projectId}/sessions/${signal.session_id}`}>View source session</Link>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {(specResult !== null || implementResult !== null || impactResult !== null) && (
              <section className={styles.card}>
                <h3 className={styles.cardTitle}>Action Results</h3>
                {specResult !== null && (
                  <div style={{ marginBottom: '0.8rem' }}>
                    <div className={styles.small} style={{ marginBottom: '0.3rem' }}>Spec</div>
                    <pre className={styles.pre}>{JSON.stringify(specResult, null, 2) ?? 'No response body'}</pre>
                  </div>
                )}
                {implementResult !== null && (
                  <div style={{ marginBottom: '0.8rem' }}>
                    <div className={styles.small} style={{ marginBottom: '0.3rem' }}>Implementation</div>
                    <pre className={styles.pre}>{JSON.stringify(implementResult, null, 2) ?? 'No response body'}</pre>
                  </div>
                )}
                {impactResult !== null && (
                  <div>
                    <div className={styles.small} style={{ marginBottom: '0.3rem' }}>Impact</div>
                    <pre className={styles.pre}>{JSON.stringify(impactResult, null, 2) ?? 'No response body'}</pre>
                  </div>
                )}
              </section>
            )}
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
