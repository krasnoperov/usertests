import type { Context, Next } from 'hono';
import type { Container } from 'inversify';
import type { Env } from '../../core/types';
import { ProjectDAO } from '../../dao/project-dao';

/**
 * Middleware that validates the user has access to the project specified in the route.
 * Must be used after auth middleware. Expects :projectId in route params.
 * Sets 'projectId' in context variables.
 */
export function createProjectMiddleware() {
  return async (c: Context<{ Bindings: Env; Variables: { userId: number; projectId: string; container: Container } }>, next: Next) => {
    const userId = c.get('userId');
    const container = c.get('container');
    const projectDAO = container.get(ProjectDAO);

    const projectId = c.req.param('projectId');
    if (!projectId) {
      return c.json({ error: 'Project ID required' }, 400);
    }

    const isMember = await projectDAO.isMember(projectId, userId);
    if (!isMember) {
      return c.json({ error: 'Not found' }, 404);
    }

    c.set('projectId', projectId);
    await next();
  };
}

/**
 * Middleware for SDK-authenticated requests (using project public/secret keys).
 * Used by the recording SDK and screener pages.
 * Checks X-Project-Key header or query param.
 */
export function createSDKAuthMiddleware() {
  return async (c: Context<{ Bindings: Env; Variables: { projectId: string; container: Container } }>, next: Next) => {
    const container = c.get('container');
    const projectDAO = container.get(ProjectDAO);

    // Check header first, then query param
    const key = c.req.header('X-Project-Key') || c.req.query('key');

    if (!key) {
      return c.json({ error: 'Project key required' }, 401);
    }

    // Try public key first (for read-only SDK operations)
    let project = await projectDAO.findByPublicKey(key);
    if (!project) {
      // Try secret key (for write operations)
      project = await projectDAO.findBySecretKey(key);
    }

    if (!project) {
      return c.json({ error: 'Invalid project key' }, 401);
    }

    c.set('projectId', project.id);
    await next();
  };
}
