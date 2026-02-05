import { Hono } from 'hono';
import type { AppContext } from './types';
import { createAuthMiddleware } from '../middleware/auth-middleware';
import { createProjectMiddleware } from '../middleware/project-middleware';
import { TaskDAO } from '../../dao/task-dao';
import { SignalDAO } from '../../dao/signal-dao';

const taskRoutes = new Hono<AppContext>();
const auth = createAuthMiddleware();
const projectAccess = createProjectMiddleware();

// List tasks for a project
taskRoutes.get('/api/projects/:projectId/tasks', auth, projectAccess, async (c) => {
  const projectId = c.get('projectId');
  const container = c.get('container');
  const taskDAO = container.get(TaskDAO);

  const status = c.req.query('status');
  const taskType = c.req.query('type');
  const limit = parseInt(c.req.query('limit') || '50');
  const offset = parseInt(c.req.query('offset') || '0');

  const tasks = await taskDAO.list({
    project_id: projectId,
    status: status || undefined,
    task_type: taskType || undefined,
    limit,
    offset,
  });

  const total = await taskDAO.countByProject(projectId, status || undefined);

  return c.json({ tasks, total, limit, offset });
});

// Get ready tasks (for pi.dev harness)
taskRoutes.get('/api/projects/:projectId/tasks/ready', auth, projectAccess, async (c) => {
  const projectId = c.get('projectId');
  const container = c.get('container');
  const taskDAO = container.get(TaskDAO);

  const limit = parseInt(c.req.query('limit') || '10');
  const tasks = await taskDAO.listReady(projectId, limit);

  return c.json({ tasks });
});

// Create task
taskRoutes.post('/api/projects/:projectId/tasks', auth, projectAccess, async (c) => {
  const projectId = c.get('projectId');
  const container = c.get('container');
  const taskDAO = container.get(TaskDAO);

  const body = await c.req.json<{
    title: string;
    description?: string;
    task_type?: string;
    priority_score?: number;
    effort_estimate?: string;
  }>();

  if (!body.title || body.title.trim().length === 0) {
    return c.json({ error: 'Task title is required' }, 400);
  }

  const task = await taskDAO.create({
    project_id: projectId,
    title: body.title.trim(),
    description: body.description,
    task_type: body.task_type,
    priority_score: body.priority_score,
    effort_estimate: body.effort_estimate,
  });

  return c.json({ task }, 201);
});

// Get task detail with evidence
taskRoutes.get('/api/projects/:projectId/tasks/:taskId', auth, projectAccess, async (c) => {
  const container = c.get('container');
  const taskDAO = container.get(TaskDAO);
  const signalDAO = container.get(SignalDAO);
  const { taskId } = c.req.param();

  const task = await taskDAO.findById(taskId);
  if (!task || task.project_id !== c.get('projectId')) {
    return c.json({ error: 'Not found' }, 404);
  }

  const signals = await signalDAO.getSignalsByTask(taskId);

  return c.json({ task, signals });
});

// Update task
taskRoutes.patch('/api/projects/:projectId/tasks/:taskId', auth, projectAccess, async (c) => {
  const container = c.get('container');
  const taskDAO = container.get(TaskDAO);
  const { taskId } = c.req.param();

  const task = await taskDAO.findById(taskId);
  if (!task || task.project_id !== c.get('projectId')) {
    return c.json({ error: 'Not found' }, 404);
  }

  const body = await c.req.json<{
    title?: string;
    description?: string;
    task_type?: string;
    status?: string;
    priority_score?: number;
    effort_estimate?: string;
  }>();

  // Recalculate priority label if score changes
  const updates: Record<string, unknown> = { ...body };
  if (body.priority_score !== undefined) {
    const score = body.priority_score;
    updates.priority_label = score >= 80 ? 'critical' : score >= 60 ? 'high' : score >= 40 ? 'medium' : 'low';
  }

  await taskDAO.update(taskId, updates);
  const updated = await taskDAO.findById(taskId);
  return c.json({ task: updated });
});

// Delete task
taskRoutes.delete('/api/projects/:projectId/tasks/:taskId', auth, projectAccess, async (c) => {
  const container = c.get('container');
  const taskDAO = container.get(TaskDAO);
  const { taskId } = c.req.param();

  const task = await taskDAO.findById(taskId);
  if (!task || task.project_id !== c.get('projectId')) {
    return c.json({ error: 'Not found' }, 404);
  }

  await taskDAO.delete(taskId);
  return c.json({ success: true });
});

export { taskRoutes };
