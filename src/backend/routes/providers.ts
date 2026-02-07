import { Hono } from 'hono';
import type { AppContext } from './types';
import { createAuthMiddleware } from '../middleware/auth-middleware';
import { createProjectMiddleware } from '../middleware/project-middleware';
import { ImplementationDAO } from '../../dao/implementation-dao';
import { TaskDAO } from '../../dao/task-dao';
import { SignalDAO } from '../../dao/signal-dao';
import { ProjectDAO } from '../../dao/project-dao';
import { TaskProviderDAO } from '../../dao/task-provider-dao';
import { TaskMeasurementDAO } from '../../dao/task-measurement-dao';
import {
  generateSpec,
  buildImplementationPrompt,
  extractKeywords,
  type TaskEvidence,
} from '../services/harness/spec-generator';
import { GitHubProvider, type GitHubProviderConfig } from '../services/providers/github-provider';
import { measureImpact } from '../services/harness/impact-tracker';
import { createDb } from '../../db';
import type { Env } from '../../core/types';

const providerRoutes = new Hono<AppContext>();
const auth = createAuthMiddleware();
const projectAccess = createProjectMiddleware();

const githubProvider = new GitHubProvider();

// List implementations for a project (kept for backwards compat)
providerRoutes.get('/api/projects/:projectId/implementations', auth, projectAccess, async (c) => {
  const projectId = c.get('projectId');
  const container = c.get('container');
  const implDAO = container.get(ImplementationDAO);

  const status = c.req.query('status');
  const implementations = await implDAO.listByProject(projectId, status || undefined);

  return c.json({ implementations });
});

// Generate spec for a task (dry run / preview)
providerRoutes.post('/api/projects/:projectId/tasks/:taskId/spec', auth, projectAccess, async (c) => {
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
    [],
    '',
  );

  const prompt = buildImplementationPrompt(spec);

  return c.json({ spec, prompt, keywords });
});

// Push task to configured provider (replaces /implement)
providerRoutes.post('/api/projects/:projectId/tasks/:taskId/push', auth, projectAccess, async (c) => {
  const projectId = c.get('projectId');
  const container = c.get('container');
  const taskDAO = container.get(TaskDAO);
  const implDAO = container.get(ImplementationDAO);
  const signalDAO = container.get(SignalDAO);
  const projectDAO = container.get(ProjectDAO);
  const providerDAO = container.get(TaskProviderDAO);
  const env = c.env as Env;
  const { taskId } = c.req.param();

  const task = await taskDAO.findById(taskId);
  if (!task || task.project_id !== projectId) {
    return c.json({ error: 'Task not found' }, 404);
  }

  const body = await c.req.json<{ provider?: string; dry_run?: boolean }>();
  const providerName = body.provider || 'github';

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

  const spec = generateSpec(evidence, project.github_repo_url || '', [], '');

  // Create implementation record
  const implementation = await implDAO.create({
    task_id: taskId,
    project_id: projectId,
    spec_json: JSON.stringify(spec),
    is_dry_run: body.dry_run,
  });

  // Update task status to in_progress
  await taskDAO.updateStatus(taskId, 'in_progress');

  let pushResult = null;

  if (!body.dry_run && providerName === 'github' && project.github_repo_url && env.GITHUB_TOKEN) {
    const config: GitHubProviderConfig = {
      token: env.GITHUB_TOKEN,
      repoUrl: project.github_repo_url,
      defaultBranch: project.github_default_branch || 'main',
    };

    try {
      await implDAO.markStarted(implementation.id);

      pushResult = await githubProvider.pushTask(task, spec, config);

      // Persist PR info on implementation record
      await implDAO.setPRInfo(
        implementation.id,
        pushResult.externalUrl,
        Number(pushResult.externalId),
        (pushResult.metadata as { branch: string }).branch,
      );

      // Store provider state
      await providerDAO.upsert(taskId, projectId, 'github', {
        external_id: pushResult.externalId,
        external_url: pushResult.externalUrl,
        external_status: pushResult.externalStatus,
        metadata_json: JSON.stringify(pushResult.metadata),
        synced_at: new Date().toISOString(),
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      await implDAO.markFailed(implementation.id, reason);
      console.error(`Provider push failed for task ${taskId}:`, reason);
    }
  }

  const updated = await implDAO.findById(implementation.id);

  return c.json({ implementation: updated || implementation, spec, provider: pushResult }, 201);
});

// Backwards-compatible /implement endpoint — delegates to push
providerRoutes.post('/api/projects/:projectId/tasks/:taskId/implement', auth, projectAccess, async (c) => {
  const projectId = c.get('projectId');
  const container = c.get('container');
  const taskDAO = container.get(TaskDAO);
  const implDAO = container.get(ImplementationDAO);
  const signalDAO = container.get(SignalDAO);
  const projectDAO = container.get(ProjectDAO);
  const providerDAO = container.get(TaskProviderDAO);
  const env = c.env as Env;
  const { taskId } = c.req.param();

  const task = await taskDAO.findById(taskId);
  if (!task || task.project_id !== projectId) {
    return c.json({ error: 'Task not found' }, 404);
  }

  const body = await c.req.json<{ dry_run?: boolean }>();

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

  const spec = generateSpec(evidence, project.github_repo_url || '', [], '');

  const implementation = await implDAO.create({
    task_id: taskId,
    project_id: projectId,
    spec_json: JSON.stringify(spec),
    is_dry_run: body.dry_run,
  });

  await taskDAO.updateStatus(taskId, 'in_progress');

  let prInfo: { pr_url: string; pr_number: number; branch_name: string } | null = null;

  if (!body.dry_run && project.github_repo_url && env.GITHUB_TOKEN) {
    const config: GitHubProviderConfig = {
      token: env.GITHUB_TOKEN,
      repoUrl: project.github_repo_url,
      defaultBranch: project.github_default_branch || 'main',
    };

    try {
      await implDAO.markStarted(implementation.id);

      const pushResult = await githubProvider.pushTask(task, spec, config);

      await implDAO.setPRInfo(
        implementation.id,
        pushResult.externalUrl,
        Number(pushResult.externalId),
        (pushResult.metadata as { branch: string }).branch,
      );

      prInfo = {
        pr_url: pushResult.externalUrl,
        pr_number: Number(pushResult.externalId),
        branch_name: (pushResult.metadata as { branch: string }).branch,
      };

      // Store provider state
      await providerDAO.upsert(taskId, projectId, 'github', {
        external_id: pushResult.externalId,
        external_url: pushResult.externalUrl,
        external_status: pushResult.externalStatus,
        metadata_json: JSON.stringify(pushResult.metadata),
        synced_at: new Date().toISOString(),
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      await implDAO.markFailed(implementation.id, reason);
      console.error(`GitHub integration failed for task ${taskId}:`, reason);
    }
  }

  const updated = await implDAO.findById(implementation.id);

  return c.json({ implementation: updated || implementation, spec, pr: prInfo }, 201);
});

// Get implementation detail
providerRoutes.get('/api/projects/:projectId/implementations/:implId', auth, projectAccess, async (c) => {
  const container = c.get('container');
  const implDAO = container.get(ImplementationDAO);
  const { implId } = c.req.param();

  const impl = await implDAO.findById(implId);
  if (!impl || impl.project_id !== c.get('projectId')) {
    return c.json({ error: 'Not found' }, 404);
  }

  return c.json({ implementation: impl });
});

// Get provider state for a task
providerRoutes.get('/api/projects/:projectId/tasks/:taskId/provider-state', auth, projectAccess, async (c) => {
  const container = c.get('container');
  const providerDAO = container.get(TaskProviderDAO);
  const { taskId } = c.req.param();

  const states = await providerDAO.findByTask(taskId);
  return c.json({ providers: states });
});

// Measure impact for a task (core, not provider-specific)
providerRoutes.post('/api/projects/:projectId/tasks/:taskId/measure', auth, projectAccess, async (c) => {
  const container = c.get('container');
  const taskDAO = container.get(TaskDAO);
  const measurementDAO = container.get(TaskMeasurementDAO);
  const providerDAO = container.get(TaskProviderDAO);
  const { taskId } = c.req.param();
  const env = c.env as Env;

  const task = await taskDAO.findById(taskId);
  if (!task || task.project_id !== c.get('projectId')) {
    return c.json({ error: 'Task not found' }, 404);
  }

  // Check for deployment: look at provider state for a deployed_at timestamp
  const providers = await providerDAO.findByTask(taskId);
  const deployedProvider = providers.find(p => {
    if (p.external_status === 'merged') return true;
    if (p.metadata_json) {
      const meta = JSON.parse(p.metadata_json);
      if (meta.deployed_at || meta.merged_at) return true;
    }
    return false;
  });

  // Fall back to legacy deployed_at on the task itself
  const deployedAt = deployedProvider?.metadata_json
    ? (JSON.parse(deployedProvider.metadata_json).merged_at || JSON.parse(deployedProvider.metadata_json).deployed_at)
    : task.deployed_at;

  if (!deployedAt) {
    return c.json({ error: 'Task has not been deployed — no provider merge event found' }, 400);
  }

  const db = createDb(env.DB);
  const result = await measureImpact(db, taskId, task.project_id, deployedAt);

  // Store measurement in history table
  await measurementDAO.create({
    task_id: taskId,
    project_id: task.project_id,
    baseline_signal_rate: result.baselineRate,
    current_signal_rate: result.currentRate,
    impact_score: result.reductionPercent,
    sessions_analyzed: result.sessionsAnalyzed,
    measurement_window_days: result.measurementDays,
  });

  // Update core task status if impact is positive
  if (result.reductionPercent > 0) {
    await taskDAO.updateStatus(taskId, 'done');
  }

  return c.json({ impact: result });
});

// GitHub webhook endpoint for PR merge detection
providerRoutes.post('/api/webhooks/github', async (c) => {
  const event = c.req.header('X-GitHub-Event');

  if (event !== 'pull_request') {
    return c.json({ ignored: true });
  }

  const body = await c.req.json();

  const result = await githubProvider.handleWebhook(body);

  if (!result.taskId) {
    return c.json({ ignored: true, reason: 'Not a UserTests branch' });
  }

  const container = c.get('container');
  const implDAO = container.get(ImplementationDAO);
  const taskDAO = container.get(TaskDAO);
  const providerDAO = container.get(TaskProviderDAO);

  // Find implementation by PR number
  const implementations = await implDAO.findByTask(result.taskId);
  const prNumber = result.metadata?.pr_number;
  const impl = implementations.find(i => i.pr_number === prNumber);

  if (impl) {
    await implDAO.markPRMerged(impl.id);
  }

  // Update provider state
  const providerState = await providerDAO.findByTaskAndProvider(result.taskId, 'github');
  if (providerState) {
    await providerDAO.updateStatus(providerState.id, result.newStatus, result.metadata);
  }

  // Update core task status
  if (result.coreStatusUpdate) {
    await taskDAO.updateStatus(result.taskId, result.coreStatusUpdate);
  }

  return c.json({ success: true, taskId: result.taskId, action: result.newStatus });
});

export { providerRoutes };
