import { Hono } from 'hono';
import type { AppContext } from './types';
import { createAuthMiddleware } from '../middleware/auth-middleware';
import { ProjectDAO } from '../../dao/project-dao';

const projectRoutes = new Hono<AppContext>();
const auth = createAuthMiddleware();

// List user's projects
projectRoutes.get('/api/projects', auth, async (c) => {
  const userId = c.get('userId');
  const container = c.get('container');
  const projectDAO = container.get(ProjectDAO);

  const projects = await projectDAO.listByUser(userId);
  return c.json({ projects });
});

// Create project
projectRoutes.post('/api/projects', auth, async (c) => {
  const userId = c.get('userId');
  const container = c.get('container');
  const projectDAO = container.get(ProjectDAO);

  const body = await c.req.json<{ name: string; description?: string; github_repo_url?: string }>();

  if (!body.name || body.name.trim().length === 0) {
    return c.json({ error: 'Project name is required' }, 400);
  }

  const project = await projectDAO.create({
    name: body.name.trim(),
    description: body.description,
    owner_id: userId,
    github_repo_url: body.github_repo_url,
  });

  return c.json({ project }, 201);
});

// Get project by ID
projectRoutes.get('/api/projects/:id', auth, async (c) => {
  const userId = c.get('userId');
  const container = c.get('container');
  const projectDAO = container.get(ProjectDAO);
  const { id } = c.req.param();

  const isMember = await projectDAO.isMember(id, userId);
  if (!isMember) {
    return c.json({ error: 'Not found' }, 404);
  }

  const project = await projectDAO.findById(id);
  if (!project) {
    return c.json({ error: 'Not found' }, 404);
  }

  const members = await projectDAO.getMembers(id);
  return c.json({ project, members });
});

// Update project
projectRoutes.patch('/api/projects/:id', auth, async (c) => {
  const userId = c.get('userId');
  const container = c.get('container');
  const projectDAO = container.get(ProjectDAO);
  const { id } = c.req.param();

  const role = await projectDAO.getMemberRole(id, userId);
  if (!role || !['owner', 'admin'].includes(role)) {
    return c.json({ error: 'Forbidden' }, 403);
  }

  const body = await c.req.json<{ name?: string; description?: string; github_repo_url?: string; github_default_branch?: string }>();
  await projectDAO.update(id, body);

  const project = await projectDAO.findById(id);
  return c.json({ project });
});

// Delete project
projectRoutes.delete('/api/projects/:id', auth, async (c) => {
  const userId = c.get('userId');
  const container = c.get('container');
  const projectDAO = container.get(ProjectDAO);
  const { id } = c.req.param();

  const role = await projectDAO.getMemberRole(id, userId);
  if (role !== 'owner') {
    return c.json({ error: 'Only the owner can delete a project' }, 403);
  }

  await projectDAO.delete(id);
  return c.json({ success: true });
});

export { projectRoutes };
