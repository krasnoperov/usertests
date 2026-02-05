import { Hono } from 'hono';
import type { Env } from '../core/types';
import { createContainer } from '../core/container';
import { registerRoutes } from './routes';
import { uploadSecurityMiddleware } from './middleware/upload-security';
import { handleQueue as processQueue } from './queue-handler';
import type { AppContext } from './routes/types';

export type Bindings = Env;

const app = new Hono<AppContext>();

// Middleware to set up container
app.use('*', async (c, next) => {
  const container = createContainer(c.env);
  c.set('container', container);
  await next();
});

// Apply upload security middleware to upload routes
app.use('/api/upload/*', uploadSecurityMiddleware());

// Register all routes
registerRoutes(app);

// Queue handler
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleQueue(batch: MessageBatch<any>, env: Env): Promise<void> {
  await processQueue(batch, env);
}

export default {
  fetch: app.fetch,
  queue: handleQueue,
};

export { app, handleQueue };
