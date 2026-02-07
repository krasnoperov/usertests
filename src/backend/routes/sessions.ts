import { Hono } from 'hono';
import type { AppContext } from './types';
import { createAuthMiddleware } from '../middleware/auth-middleware';
import { createProjectMiddleware } from '../middleware/project-middleware';
import { SessionDAO } from '../../dao/session-dao';
import type { Env } from '../../core/types';

const sessionRoutes = new Hono<AppContext>();
const auth = createAuthMiddleware();
const projectAccess = createProjectMiddleware();

// List sessions for a project
sessionRoutes.get('/api/projects/:projectId/sessions', auth, projectAccess, async (c) => {
  const projectId = c.get('projectId');
  const container = c.get('container');
  const sessionDAO = container.get(SessionDAO);

  const status = c.req.query('status');
  const limit = parseInt(c.req.query('limit') || '50');
  const offset = parseInt(c.req.query('offset') || '0');

  const sessions = await sessionDAO.list({ project_id: projectId, status: status || undefined, limit, offset });
  const total = await sessionDAO.countByProject(projectId, status || undefined);

  return c.json({ sessions, total, limit, offset });
});

// Create a new session
sessionRoutes.post('/api/projects/:projectId/sessions', auth, projectAccess, async (c) => {
  const projectId = c.get('projectId');
  const container = c.get('container');
  const sessionDAO = container.get(SessionDAO);

  const body = await c.req.json<{
    participant_name?: string;
    participant_email?: string;
    interview_mode?: string;
    screener_id?: string;
    screener_response_id?: string;
  }>();

  const session = await sessionDAO.create({
    project_id: projectId,
    participant_name: body.participant_name,
    participant_email: body.participant_email,
    interview_mode: body.interview_mode,
    screener_id: body.screener_id,
    screener_response_id: body.screener_response_id,
  });

  return c.json({ session }, 201);
});

// Get session detail
sessionRoutes.get('/api/projects/:projectId/sessions/:sessionId', auth, projectAccess, async (c) => {
  const container = c.get('container');
  const sessionDAO = container.get(SessionDAO);
  const { sessionId } = c.req.param();

  const session = await sessionDAO.findById(sessionId);
  if (!session || session.project_id !== c.get('projectId')) {
    return c.json({ error: 'Not found' }, 404);
  }

  const messages = await sessionDAO.getMessages(sessionId);
  const events = await sessionDAO.getEvents(sessionId);

  return c.json({ session, messages, events });
});

// Update session (status, phase, consent, etc.)
sessionRoutes.patch('/api/projects/:projectId/sessions/:sessionId', auth, projectAccess, async (c) => {
  const container = c.get('container');
  const sessionDAO = container.get(SessionDAO);
  const { sessionId } = c.req.param();

  const session = await sessionDAO.findById(sessionId);
  if (!session || session.project_id !== c.get('projectId')) {
    return c.json({ error: 'Not found' }, 404);
  }

  const body = await c.req.json<{
    status?: string;
    current_phase?: string;
    summary?: string;
    consent_recording?: number;
    consent_analytics?: number;
    consent_followup?: number;
  }>();

  // Handle status transitions
  if (body.status === 'active' && session.status === 'pending') {
    await sessionDAO.update(sessionId, {
      ...body,
      started_at: new Date().toISOString(),
      phase_started_at: new Date().toISOString(),
    });
  } else if (body.status === 'completed' && session.status === 'active') {
    const startedAt = session.started_at ? new Date(session.started_at).getTime() : Date.now();
    const duration = Math.floor((Date.now() - startedAt) / 1000);
    await sessionDAO.update(sessionId, {
      ...body,
      completed_at: new Date().toISOString(),
      duration_seconds: duration,
    });
  } else {
    await sessionDAO.update(sessionId, body);
  }

  const updated = await sessionDAO.findById(sessionId);
  return c.json({ session: updated });
});

// Add a message to a session
sessionRoutes.post('/api/projects/:projectId/sessions/:sessionId/messages', auth, projectAccess, async (c) => {
  const container = c.get('container');
  const sessionDAO = container.get(SessionDAO);
  const { sessionId } = c.req.param();

  const session = await sessionDAO.findById(sessionId);
  if (!session || session.project_id !== c.get('projectId')) {
    return c.json({ error: 'Not found' }, 404);
  }

  const body = await c.req.json<{
    role: string;
    content: string;
    timestamp_ms: number;
    audio_chunk_key?: string;
  }>();

  if (!body.role || !body.content) {
    return c.json({ error: 'role and content are required' }, 400);
  }

  const message = await sessionDAO.addMessage(
    sessionId,
    body.role,
    body.content,
    body.timestamp_ms || 0,
    body.audio_chunk_key,
  );

  return c.json({ message }, 201);
});

// Add an event to a session
sessionRoutes.post('/api/projects/:projectId/sessions/:sessionId/events', auth, projectAccess, async (c) => {
  const container = c.get('container');
  const sessionDAO = container.get(SessionDAO);
  const { sessionId } = c.req.param();

  const session = await sessionDAO.findById(sessionId);
  if (!session || session.project_id !== c.get('projectId')) {
    return c.json({ error: 'Not found' }, 404);
  }

  const body = await c.req.json<{
    event_type: string;
    timestamp_ms: number;
    data?: Record<string, unknown>;
  }>();

  await sessionDAO.addEvent(sessionId, body.event_type, body.timestamp_ms, body.data);
  return c.json({ success: true }, 201);
});

// Reprocess a completed session (A4)
// Clears failed markers and re-queues for processing.
sessionRoutes.post('/api/projects/:projectId/sessions/:sessionId/reprocess', auth, projectAccess, async (c) => {
  const container = c.get('container');
  const sessionDAO = container.get(SessionDAO);
  const env = c.env as Env;
  const { sessionId } = c.req.param();

  const session = await sessionDAO.findById(sessionId);
  if (!session || session.project_id !== c.get('projectId')) {
    return c.json({ error: 'Not found' }, 404);
  }

  if (session.status !== 'completed') {
    return c.json({ error: 'Only completed sessions can be reprocessed' }, 400);
  }

  // Clear previous processing markers so processSession can run again
  // We delete failed and processed events to allow a fresh run
  await sessionDAO.deleteEvents(sessionId, 'session.processing_failed');
  await sessionDAO.deleteEvents(sessionId, 'session.processing_started');
  await sessionDAO.deleteEvents(sessionId, 'session.processed');

  // Re-queue for processing
  if (!env.PROCESSING_QUEUE) {
    return c.json({ error: 'Processing queue not available' }, 503);
  }

  await env.PROCESSING_QUEUE.send({
    type: 'session.completed',
    sessionId,
    projectId: session.project_id,
  });

  return c.json({ success: true, message: 'Session queued for reprocessing' });
});

// Delete session
sessionRoutes.delete('/api/projects/:projectId/sessions/:sessionId', auth, projectAccess, async (c) => {
  const container = c.get('container');
  const sessionDAO = container.get(SessionDAO);
  const { sessionId } = c.req.param();

  const session = await sessionDAO.findById(sessionId);
  if (!session || session.project_id !== c.get('projectId')) {
    return c.json({ error: 'Not found' }, 404);
  }

  await sessionDAO.delete(sessionId);
  return c.json({ success: true });
});

export { sessionRoutes };
