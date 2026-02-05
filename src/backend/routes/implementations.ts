import { Hono } from 'hono';
import type { AppContext } from './types';
import { createAuthMiddleware } from '../middleware/auth-middleware';
import { createProjectMiddleware } from '../middleware/project-middleware';
import { ImplementationDAO } from '../../dao/implementation-dao';
import { TaskDAO } from '../../dao/task-dao';
import { SignalDAO } from '../../dao/signal-dao';
import { ProjectDAO } from '../../dao/project-dao';
import {
  generateSpec,
  buildImplementationPrompt,
  extractKeywords,
  type TaskEvidence,
} from '../services/harness/spec-generator';
import {
  buildPRBody,
  extractTaskIdFromBranch,
} from '../services/harness/github-client';
import { measureImpact } from '../services/harness/impact-tracker';
import { createDb } from '../../db';
import type { Env } from '../../core/types';

const implementationRoutes = new Hono<AppContext>();
const auth = createAuthMiddleware();
const projectAccess = createProjectMiddleware();

// List implementations for a project
implementationRoutes.get('/api/projects/:projectId/implementations', auth, projectAccess, async (c) => {
  const projectId = c.get('projectId');
  const container = c.get('container');
  const implDAO = container.get(ImplementationDAO);

  const status = c.req.query('status');
  const implementations = await implDAO.listByProject(projectId, status || undefined);

  return c.json({ implementations });
});

// Generate spec for a task (dry run / preview)
implementationRoutes.post('/api/projects/:projectId/tasks/:taskId/spec', auth, projectAccess, async (c) => {
  const projectId = c.get('projectId');
  const container = c.get('container');
  const taskDAO = container.get(TaskDAO);
  const signalDAO = container.get(SignalDAO);
  const projectDAO = container.get(ProjectDAO);
  const { taskId } = c.req.param();

  const task = await taskDAO.findById(taskId);
  if (!task || task.project_id !== projectId) {
    return c.json({ error: 'Task not found' }, 404);
  }

  const project = await projectDAO.findById(projectId);
  if (!project) {
    return c.json({ error: 'Project not found' }, 404);
  }

  const signals = await signalDAO.getSignalsByTask(taskId);

  const evidence: TaskEvidence = {
    title: task.title,
    description: task.description,
    task_type: task.task_type,
    priority_label: task.priority_label,
    signals: signals.map(s => ({
      signal_type: s.signal_type,
      quote: s.quote,
      context: s.context,
      analysis: s.analysis,
      confidence: s.confidence,
      intensity: s.intensity,
    })),
  };

  const keywords = extractKeywords(
    task.title,
    signals.map(s => s.quote)
  );

  const spec = generateSpec(
    evidence,
    project.github_repo_url || '',
    [], // TODO: search codebase for relevant files using keywords
    '', // TODO: extract code context
  );

  const prompt = buildImplementationPrompt(spec);

  return c.json({ spec, prompt, keywords });
});

// Create an implementation attempt
implementationRoutes.post('/api/projects/:projectId/tasks/:taskId/implement', auth, projectAccess, async (c) => {
  const projectId = c.get('projectId');
  const container = c.get('container');
  const taskDAO = container.get(TaskDAO);
  const implDAO = container.get(ImplementationDAO);
  const signalDAO = container.get(SignalDAO);
  const projectDAO = container.get(ProjectDAO);
  const { taskId } = c.req.param();

  const task = await taskDAO.findById(taskId);
  if (!task || task.project_id !== projectId) {
    return c.json({ error: 'Task not found' }, 404);
  }

  const body = await c.req.json<{ dry_run?: boolean }>();

  const project = await projectDAO.findById(projectId);
  const signals = await signalDAO.getSignalsByTask(taskId);

  const evidence: TaskEvidence = {
    title: task.title,
    description: task.description,
    task_type: task.task_type,
    priority_label: task.priority_label,
    signals: signals.map(s => ({
      signal_type: s.signal_type,
      quote: s.quote,
      context: s.context,
      analysis: s.analysis,
      confidence: s.confidence,
      intensity: s.intensity,
    })),
  };

  const spec = generateSpec(
    evidence,
    project?.github_repo_url || '',
    [],
    '',
  );

  const implementation = await implDAO.create({
    task_id: taskId,
    project_id: projectId,
    spec_json: JSON.stringify(spec),
    is_dry_run: body.dry_run,
  });

  // Update task status
  await taskDAO.updateStatus(taskId, 'in_progress');

  return c.json({ implementation, spec }, 201);
});

// Get implementation detail
implementationRoutes.get('/api/projects/:projectId/implementations/:implId', auth, projectAccess, async (c) => {
  const container = c.get('container');
  const implDAO = container.get(ImplementationDAO);
  const { implId } = c.req.param();

  const impl = await implDAO.findById(implId);
  if (!impl || impl.project_id !== c.get('projectId')) {
    return c.json({ error: 'Not found' }, 404);
  }

  return c.json({ implementation: impl });
});

// Measure impact for a deployed task
implementationRoutes.post('/api/projects/:projectId/tasks/:taskId/measure', auth, projectAccess, async (c) => {
  const container = c.get('container');
  const taskDAO = container.get(TaskDAO);
  const { taskId } = c.req.param();
  const env = c.env as Env;

  const task = await taskDAO.findById(taskId);
  if (!task || task.project_id !== c.get('projectId')) {
    return c.json({ error: 'Task not found' }, 404);
  }

  if (!task.deployed_at) {
    return c.json({ error: 'Task has not been deployed' }, 400);
  }

  const db = createDb(env.DB);
  const result = await measureImpact(db, taskId, task.project_id, task.deployed_at);

  // Update task with measurement
  await taskDAO.update(taskId, {
    baseline_signal_rate: result.baselineRate,
    current_signal_rate: result.currentRate,
    impact_score: result.reductionPercent,
    measurement_completed_at: new Date().toISOString(),
    status: result.reductionPercent > 0 ? 'done' : 'measuring',
  });

  return c.json({ impact: result });
});

// GitHub webhook endpoint for PR merge detection
implementationRoutes.post('/api/webhooks/github', async (c) => {
  const event = c.req.header('X-GitHub-Event');

  if (event !== 'pull_request') {
    return c.json({ ignored: true });
  }

  const body = await c.req.json<{
    action: string;
    pull_request: {
      number: number;
      merged: boolean;
      head: { ref: string };
    };
  }>();

  if (body.action !== 'closed' || !body.pull_request.merged) {
    return c.json({ ignored: true });
  }

  // Check if this is a UserTests PR
  const branchName = body.pull_request.head.ref;
  const taskId = extractTaskIdFromBranch(branchName);

  if (!taskId) {
    return c.json({ ignored: true, reason: 'Not a UserTests branch' });
  }

  // Update implementation and task status
  const container = c.get('container');
  const implDAO = container.get(ImplementationDAO);
  const taskDAO = container.get(TaskDAO);

  // Find implementation by PR number
  const implementations = await implDAO.findByTask(taskId);
  const impl = implementations.find(i => i.pr_number === body.pull_request.number);

  if (impl) {
    await implDAO.markPRMerged(impl.id);
  }

  // Update task to deployed
  await taskDAO.updateStatus(taskId, 'deployed');
  await taskDAO.update(taskId, {
    measurement_started_at: new Date().toISOString(),
  });

  return c.json({ success: true, taskId, action: 'deployed' });
});

export { implementationRoutes };
