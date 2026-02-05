import { useEffect, useState } from 'react';
import { Link } from '../components/Link';
import { AppHeader } from '../components/AppHeader';
import { HeaderNav } from '../components/HeaderNav';
import { useAuth } from '../contexts/useAuth';
import { useRouteStore } from '../stores/routeStore';
import { tasksAPI, type Task } from '../lib/api';
import styles from './TasksPage.module.css';

const COLUMNS = [
  { key: 'backlog', label: 'Backlog' },
  { key: 'ready', label: 'Ready' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'review', label: 'Review' },
  { key: 'deployed', label: 'Deployed' },
  { key: 'measuring', label: 'Measuring' },
  { key: 'done', label: 'Done' },
];

export default function TasksPage() {
  const { user } = useAuth();
  const params = useRouteStore((s) => s.params);
  const projectId = params.projectId!;
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    tasksAPI.list(projectId, { limit: 200 })
      .then(({ tasks }) => setTasks(tasks))
      .finally(() => setLoading(false));
  }, [projectId]);

  const tasksByStatus = COLUMNS.map(col => ({
    ...col,
    tasks: tasks.filter(t => t.status === col.key).sort((a, b) => b.priority_score - a.priority_score),
  }));

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    try {
      await tasksAPI.update(projectId, taskId, { status: newStatus });
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
    } catch (e) {
      console.error('Failed to update task:', e);
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
      </nav>

      <main className={styles.main}>
        {loading ? (
          <div className={styles.loading}>Loading tasks...</div>
        ) : (
          <div className={styles.kanban}>
            {tasksByStatus.map(col => (
              <div key={col.key} className={styles.column}>
                <div className={styles.columnHeader}>
                  <span className={styles.columnTitle}>{col.label}</span>
                  <span className={styles.columnCount}>{col.tasks.length}</span>
                </div>
                <div className={styles.columnCards}>
                  {col.tasks.map(task => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      projectId={projectId}
                      onStatusChange={handleStatusChange}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function TaskCard({
  task,
  projectId,
  onStatusChange,
}: {
  task: Task;
  projectId: string;
  onStatusChange: (taskId: string, status: string) => void;
}) {
  return (
    <div className={styles.card}>
      <Link to={`/p/${projectId}/tasks/${task.id}`} className={styles.cardTitle}>
        <span className={`${styles.priorityDot} ${styles[`priority_${task.priority_label}`]}`} />
        {task.title}
      </Link>
      <div className={styles.cardMeta}>
        <span className={styles.cardType}>{task.task_type}</span>
        <span>{task.signal_count} signals</span>
        {task.effort_estimate && <span>effort: {task.effort_estimate}</span>}
      </div>
      {task.impact_score !== null && (
        <div className={styles.cardImpact}>
          Impact: {task.impact_score > 0 ? '↓' : '↑'} {Math.abs(task.impact_score).toFixed(0)}%
        </div>
      )}
      <div className={styles.cardActions}>
        {task.status === 'backlog' && (
          <button className={styles.actionBtn} onClick={() => onStatusChange(task.id, 'ready')}>→ Ready</button>
        )}
        {task.status === 'ready' && (
          <button className={styles.actionBtn} onClick={() => onStatusChange(task.id, 'in_progress')}>→ Start</button>
        )}
        {task.status === 'in_progress' && (
          <button className={styles.actionBtn} onClick={() => onStatusChange(task.id, 'review')}>→ Review</button>
        )}
      </div>
    </div>
  );
}
