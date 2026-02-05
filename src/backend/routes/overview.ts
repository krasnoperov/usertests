import { Hono } from 'hono';
import type { AppContext } from './types';
import { createAuthMiddleware } from '../middleware/auth-middleware';
import { createProjectMiddleware } from '../middleware/project-middleware';
import { SessionDAO } from '../../dao/session-dao';
import { SignalDAO } from '../../dao/signal-dao';
import { TaskDAO } from '../../dao/task-dao';
import { ScreenerDAO } from '../../dao/screener-dao';

const overviewRoutes = new Hono<AppContext>();
const auth = createAuthMiddleware();
const projectAccess = createProjectMiddleware();

// Dashboard overview for a project
overviewRoutes.get('/api/projects/:projectId/overview', auth, projectAccess, async (c) => {
  const projectId = c.get('projectId');
  const container = c.get('container');
  const sessionDAO = container.get(SessionDAO);
  const signalDAO = container.get(SignalDAO);
  const taskDAO = container.get(TaskDAO);
  const screenerDAO = container.get(ScreenerDAO);

  // Session counts
  const totalSessions = await sessionDAO.countByProject(projectId);
  const activeSessions = await sessionDAO.countByProject(projectId, 'active');
  const completedSessions = await sessionDAO.countByProject(projectId, 'completed');

  // Signal counts by type
  const signalTypes = ['struggling_moment', 'desired_outcome', 'hiring_criteria', 'firing_moment', 'workaround', 'emotional_response'];
  const signalCounts: Record<string, number> = {};
  let totalSignals = 0;
  for (const type of signalTypes) {
    const count = await signalDAO.countByProject(projectId, type);
    signalCounts[type] = count;
    totalSignals += count;
  }

  // Task counts by status
  const taskStatuses = ['backlog', 'ready', 'in_progress', 'review', 'deployed', 'measuring', 'done'];
  const taskCounts: Record<string, number> = {};
  let totalTasks = 0;
  for (const status of taskStatuses) {
    const count = await taskDAO.countByProject(projectId, status);
    taskCounts[status] = count;
    totalTasks += count;
  }

  // Screener summary
  const screeners = await screenerDAO.listByProject(projectId);
  const screenerSummary = {
    total: screeners.length,
    active: screeners.filter(s => s.status === 'active').length,
    total_views: screeners.reduce((sum, s) => sum + s.view_count, 0),
    total_qualified: screeners.reduce((sum, s) => sum + s.qualified_count, 0),
  };

  // Recent sessions
  const recentSessions = await sessionDAO.list({ project_id: projectId, limit: 5 });

  // Top tasks (highest priority, ready)
  const topTasks = await taskDAO.listReady(projectId, 5);

  return c.json({
    sessions: {
      total: totalSessions,
      active: activeSessions,
      completed: completedSessions,
    },
    signals: {
      total: totalSignals,
      by_type: signalCounts,
    },
    tasks: {
      total: totalTasks,
      by_status: taskCounts,
    },
    screeners: screenerSummary,
    recent_sessions: recentSessions,
    top_tasks: topTasks,
  });
});

export { overviewRoutes };
