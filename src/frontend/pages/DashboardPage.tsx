import { useEffect, useState } from 'react';
import { Link } from '../components/Link';
import { AppHeader } from '../components/AppHeader';
import { HeaderNav } from '../components/HeaderNav';
import { useAuth } from '../contexts/useAuth';
import { useRouteStore } from '../stores/routeStore';
import { overviewAPI, type OverviewData } from '../lib/api';
import styles from './DashboardPage.module.css';

const SIGNAL_TYPE_LABELS: Record<string, string> = {
  struggling_moment: '😤 Struggling',
  desired_outcome: '🎯 Desired Outcome',
  hiring_criteria: '✅ Hiring',
  firing_moment: '🚪 Firing',
  workaround: '🔧 Workaround',
  emotional_response: '💡 Emotional',
};

const STATUS_LABELS: Record<string, string> = {
  backlog: 'Backlog',
  ready: 'Ready',
  in_progress: 'In Progress',
  review: 'Review',
  deployed: 'Deployed',
  measuring: 'Measuring',
  done: 'Done',
};

export default function DashboardPage() {
  const { user } = useAuth();
  const params = useRouteStore((s) => s.params);
  const projectId = params.projectId!;
  const [data, setData] = useState<OverviewData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    overviewAPI.get(projectId)
      .then(setData)
      .catch((e) => setError(e.message));
  }, [projectId]);

  return (
    <div className={styles.page}>
      <AppHeader
        leftSlot={
          <Link to={`/p/${projectId}`} className={styles.brand}>UserTests</Link>
        }
        rightSlot={
          <HeaderNav userName={user?.name} userEmail={user?.email} />
        }
      />
      <nav className={styles.subnav}>
        <Link to={`/p/${projectId}`} className={styles.subnavLink}>Overview</Link>
        <Link to={`/p/${projectId}/sessions`} className={styles.subnavLink}>Sessions</Link>
        <Link to={`/p/${projectId}/signals`} className={styles.subnavLink}>Signals</Link>
        <Link to={`/p/${projectId}/tasks`} className={styles.subnavLink}>Tasks</Link>
        <Link to={`/p/${projectId}/screeners`} className={styles.subnavLink}>Screeners</Link>
        <Link to={`/p/${projectId}/settings`} className={styles.subnavLink}>Settings</Link>
      </nav>

      <main className={styles.main}>
        {error && <div className={styles.error}>{error}</div>}
        {!data && !error && <div className={styles.loading}>Loading...</div>}
        {data && (
          <div className={styles.grid}>
            {/* Metric Cards */}
            <div className={styles.metricsRow}>
              <MetricCard label="Sessions" value={data.sessions.total} sub={`${data.sessions.completed} completed`} />
              <MetricCard label="Signals" value={data.signals.total} sub="extracted" />
              <MetricCard label="Tasks" value={data.tasks.total} sub={`${data.tasks.by_status.ready || 0} ready`} />
              <MetricCard label="Screeners" value={data.screeners.total} sub={`${data.screeners.total_qualified} qualified`} />
            </div>

            {/* Signal Types */}
            <div className={styles.card}>
              <h3>Signals by Type</h3>
              <div className={styles.signalBars}>
                {Object.entries(data.signals.by_type).map(([type, count]) => (
                  <div key={type} className={styles.signalBar}>
                    <span className={styles.signalLabel}>{SIGNAL_TYPE_LABELS[type] || type}</span>
                    <div className={styles.barTrack}>
                      <div
                        className={styles.barFill}
                        style={{ width: `${data.signals.total > 0 ? (count / data.signals.total) * 100 : 0}%` }}
                      />
                    </div>
                    <span className={styles.signalCount}>{count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Task Status */}
            <div className={styles.card}>
              <h3>Task Pipeline</h3>
              <div className={styles.pipeline}>
                {Object.entries(STATUS_LABELS).map(([status, label]) => (
                  <div key={status} className={styles.pipelineStage}>
                    <span className={styles.pipelineCount}>{data.tasks.by_status[status] || 0}</span>
                    <span className={styles.pipelineLabel}>{label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Sessions */}
            <div className={styles.card}>
              <h3>Recent Sessions</h3>
              {data.recent_sessions.length === 0 ? (
                <p className={styles.empty}>No sessions yet</p>
              ) : (
                <div className={styles.sessionList}>
                  {data.recent_sessions.map(s => (
                    <Link key={s.id} to={`/p/${projectId}/sessions/${s.id}`} className={styles.sessionItem}>
                      <span className={styles.sessionName}>{s.participant_name || 'Anonymous'}</span>
                      <span className={`${styles.badge} ${styles[`badge_${s.status}`]}`}>{s.status}</span>
                      <span className={styles.sessionSignals}>{s.signal_count} signals</span>
                      <span className={styles.sessionDate}>{new Date(s.created_at).toLocaleDateString()}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Top Tasks */}
            <div className={styles.card}>
              <h3>Top Priority Tasks</h3>
              {data.top_tasks.length === 0 ? (
                <p className={styles.empty}>No ready tasks</p>
              ) : (
                <div className={styles.taskList}>
                  {data.top_tasks.map(t => (
                    <Link key={t.id} to={`/p/${projectId}/tasks/${t.id}`} className={styles.taskItem}>
                      <span className={`${styles.priorityDot} ${styles[`priority_${t.priority_label}`]}`} />
                      <span className={styles.taskTitle}>{t.title}</span>
                      <span className={styles.taskMeta}>{t.signal_count} signals · {t.session_count} sessions</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function MetricCard({ label, value, sub }: { label: string; value: number; sub: string }) {
  return (
    <div className={styles.metricCard}>
      <div className={styles.metricValue}>{value}</div>
      <div className={styles.metricLabel}>{label}</div>
      <div className={styles.metricSub}>{sub}</div>
    </div>
  );
}
