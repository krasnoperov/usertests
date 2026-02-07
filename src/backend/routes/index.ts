/**
 * Central route registration file
 */
import type { Hono } from 'hono';
import type { AppContext } from './types';

// Import route modules
import { healthRoutes } from './health';
import { oauthRoutes } from './oauth';
import { authRoutes } from './auth';
import { userRoutes } from './user';
import { projectRoutes } from './projects';
import { sessionRoutes } from './sessions';
import { signalRoutes } from './signals';
import { taskRoutes } from './tasks';
import { screenerRoutes } from './screeners';
import { overviewRoutes } from './overview';
import { interviewRoutes } from './interview';
import { providerRoutes } from './providers';
import { sdkRoutes } from './sdk';

/**
 * Register all routes with the main app
 */
export function registerRoutes(app: Hono<AppContext>) {
  // Health check
  app.route('/', healthRoutes);

  // OAuth/OIDC
  app.route('/', oauthRoutes);

  // Authentication
  app.route('/', authRoutes);

  // User profile
  app.route('/', userRoutes);

  // Projects (PRD-00)
  app.route('/', projectRoutes);

  // Sessions (PRD-01/02)
  app.route('/', sessionRoutes);

  // Signals (PRD-03)
  app.route('/', signalRoutes);

  // Tasks (PRD-05)
  app.route('/', taskRoutes);

  // Screeners (PRD-07)
  app.route('/', screenerRoutes);

  // Dashboard overview (PRD-08)
  app.route('/', overviewRoutes);

  // Interview SDK (PRD-01/04)
  app.route('/', interviewRoutes);

  // Task providers & webhooks (PRD-06)
  app.route('/', providerRoutes);

  // SDK routes (PRD-02 — recording, events, audio upload)
  app.route('/', sdkRoutes);
}
