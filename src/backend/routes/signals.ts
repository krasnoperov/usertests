import { Hono } from 'hono';
import type { AppContext } from './types';
import { createAuthMiddleware } from '../middleware/auth-middleware';
import { createProjectMiddleware } from '../middleware/project-middleware';
import { SignalDAO } from '../../dao/signal-dao';
import { TaskDAO } from '../../dao/task-dao';

const signalRoutes = new Hono<AppContext>();
const auth = createAuthMiddleware();
const projectAccess = createProjectMiddleware();

// List signals for a project
signalRoutes.get('/api/projects/:projectId/signals', auth, projectAccess, async (c) => {
  const projectId = c.get('projectId');
  const container = c.get('container');
  const signalDAO = container.get(SignalDAO);

  const signalType = c.req.query('type');
  const sessionId = c.req.query('session_id');
  const taskId = c.req.query('task_id');
  const limit = parseInt(c.req.query('limit') || '50');
  const offset = parseInt(c.req.query('offset') || '0');

  const signals = await signalDAO.list({
    project_id: projectId,
    signal_type: signalType || undefined,
    session_id: sessionId || undefined,
    task_id: taskId || undefined,
    limit,
    offset,
  });

  const total = await signalDAO.countByProject(projectId, signalType || undefined);

  return c.json({ signals, total, limit, offset });
});

// Get signal by ID
signalRoutes.get('/api/projects/:projectId/signals/:signalId', auth, projectAccess, async (c) => {
  const container = c.get('container');
  const signalDAO = container.get(SignalDAO);
  const { signalId } = c.req.param();

  const signal = await signalDAO.findById(signalId);
  if (!signal || signal.project_id !== c.get('projectId')) {
    return c.json({ error: 'Not found' }, 404);
  }

  return c.json({ signal });
});

// Link signal to task
signalRoutes.post('/api/projects/:projectId/signals/:signalId/link', auth, projectAccess, async (c) => {
  const container = c.get('container');
  const signalDAO = container.get(SignalDAO);
  const taskDAO = container.get(TaskDAO);
  const { signalId } = c.req.param();

  const signal = await signalDAO.findById(signalId);
  if (!signal || signal.project_id !== c.get('projectId')) {
    return c.json({ error: 'Signal not found' }, 404);
  }

  const body = await c.req.json<{ task_id: string }>();
  const task = await taskDAO.findById(body.task_id);
  if (!task || task.project_id !== c.get('projectId')) {
    return c.json({ error: 'Task not found' }, 404);
  }

  await signalDAO.linkToTask(signalId, body.task_id);
  await taskDAO.recalculateEvidence(body.task_id);

  return c.json({ success: true });
});

// Unlink signal from task
signalRoutes.post('/api/projects/:projectId/signals/:signalId/unlink', auth, projectAccess, async (c) => {
  const container = c.get('container');
  const signalDAO = container.get(SignalDAO);
  const taskDAO = container.get(TaskDAO);
  const { signalId } = c.req.param();

  const signal = await signalDAO.findById(signalId);
  if (!signal || signal.project_id !== c.get('projectId')) {
    return c.json({ error: 'Signal not found' }, 404);
  }

  if (signal.task_id) {
    await signalDAO.unlinkFromTask(signalId, signal.task_id);
    await taskDAO.recalculateEvidence(signal.task_id);
  }

  return c.json({ success: true });
});

// Delete signal
signalRoutes.delete('/api/projects/:projectId/signals/:signalId', auth, projectAccess, async (c) => {
  const container = c.get('container');
  const signalDAO = container.get(SignalDAO);
  const { signalId } = c.req.param();

  const signal = await signalDAO.findById(signalId);
  if (!signal || signal.project_id !== c.get('projectId')) {
    return c.json({ error: 'Not found' }, 404);
  }

  await signalDAO.delete(signalId);
  return c.json({ success: true });
});

export { signalRoutes };
