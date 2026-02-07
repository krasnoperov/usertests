import { Hono } from 'hono';
import type { AppContext } from './types';
import { createSDKAuthMiddleware } from '../middleware/project-middleware';
import { ipRateLimit, sessionRateLimit } from '../middleware/rate-limit';
import { SessionDAO } from '../../dao/session-dao';
import { ScreenerDAO } from '../../dao/screener-dao';
import {
  createInitialState,
  processUserMessage,
  generateOpeningMessage,
  type AgentState,
} from '../services/interview/agent';
import type { Env } from '../../core/types';

const interviewRoutes = new Hono<AppContext>();
const sdkAuth = createSDKAuthMiddleware();

// In-memory state cache for active interviews (per-worker)
// In production, this would use Durable Objects for persistence across workers
const sessionStates = new Map<string, AgentState>();

async function completeSession(
  sessionDAO: SessionDAO,
  env: Env,
  session: Awaited<ReturnType<SessionDAO['findById']>>,
  sessionId: string,
): Promise<{ alreadyCompleted: boolean; queued: boolean }> {
  if (!session) {
    throw new Error('Session not found');
  }

  if (session.status === 'completed') {
    sessionStates.delete(sessionId);
    return { alreadyCompleted: true, queued: false };
  }

  await sessionDAO.update(sessionId, {
    status: 'completed',
    completed_at: new Date().toISOString(),
    duration_seconds: session.started_at
      ? Math.floor((Date.now() - new Date(session.started_at).getTime()) / 1000)
      : null,
  });

  let queued = false;
  if (env.PROCESSING_QUEUE) {
    await env.PROCESSING_QUEUE.send({
      type: 'session.completed',
      sessionId,
      projectId: session.project_id,
    });
    queued = true;
  }

  sessionStates.delete(sessionId);
  return { alreadyCompleted: false, queued };
}

/**
 * Public participant bootstrap/read endpoint.
 */
interviewRoutes.get('/api/sdk/interview/:sessionId', sdkAuth, async (c) => {
  const container = c.get('container');
  const sessionDAO = container.get(SessionDAO);
  const screenerDAO = container.get(ScreenerDAO);
  const { sessionId } = c.req.param();

  const session = await sessionDAO.findById(sessionId);
  if (!session || session.project_id !== c.get('projectId')) {
    return c.json({ error: 'Session not found' }, 404);
  }

  const messages = await sessionDAO.getMessages(sessionId);
  const audioChunks = await sessionDAO.getAudioChunks(sessionId);

  let nextStepMessage: string | null = null;
  if (session.screener_id) {
    const screener = await screenerDAO.findById(session.screener_id);
    if (screener && screener.project_id === session.project_id) {
      nextStepMessage = screener.thank_you_message;
    }
  }

  const hasProcessedMarker = await sessionDAO.hasEvent(sessionId, 'session.processed');
  const hasFailedMarker = await sessionDAO.hasEvent(sessionId, 'session.processing_failed');

  let processingStatus: string;
  if (session.status !== 'completed') {
    processingStatus = 'in_progress';
  } else if (hasProcessedMarker) {
    processingStatus = 'processed';
  } else if (hasFailedMarker) {
    processingStatus = 'failed';
  } else {
    processingStatus = 'processing';
  }

  return c.json({
    session: {
      id: session.id,
      status: session.status,
      current_phase: session.current_phase,
      participant_name: session.participant_name,
      participant_email: session.participant_email,
      started_at: session.started_at,
      completed_at: session.completed_at,
      signal_count: session.signal_count,
      summary: session.summary,
      processing_status: processingStatus,
      next_step_message: nextStepMessage,
    },
    messages: messages.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      timestamp_ms: m.timestamp_ms,
    })),
    recording: {
      audio_chunk_count: audioChunks.length,
      last_audio_chunk_index: audioChunks.length > 0
        ? audioChunks[audioChunks.length - 1].chunk_index
        : null,
    },
  });
});

/**
 * Update participant fallback profile details.
 */
interviewRoutes.patch('/api/sdk/interview/:sessionId/participant', sdkAuth, async (c) => {
  const container = c.get('container');
  const sessionDAO = container.get(SessionDAO);
  const { sessionId } = c.req.param();

  const session = await sessionDAO.findById(sessionId);
  if (!session || session.project_id !== c.get('projectId')) {
    return c.json({ error: 'Session not found' }, 404);
  }

  const body = await c.req.json<{
    participant_name?: string;
    participant_email?: string;
  }>();

  const updatePayload: {
    participant_name?: string;
    participant_email?: string;
  } = {};

  if (typeof body.participant_name === 'string') {
    updatePayload.participant_name = body.participant_name.trim();
  }

  if (typeof body.participant_email === 'string') {
    updatePayload.participant_email = body.participant_email.trim();
  }

  if (!updatePayload.participant_name && !updatePayload.participant_email) {
    return c.json({ error: 'No participant fields provided' }, 400);
  }

  await sessionDAO.update(sessionId, updatePayload);
  const updated = await sessionDAO.findById(sessionId);

  return c.json({
    success: true,
    participant_name: updated?.participant_name ?? null,
    participant_email: updated?.participant_email ?? null,
  });
});

/**
 * Start a new interview session.
 * Called after screener qualification or directly.
 */
interviewRoutes.post('/api/sdk/interview/:sessionId/start', sdkAuth, async (c) => {
  const container = c.get('container');
  const sessionDAO = container.get(SessionDAO);
  const env = c.env as Env;
  const { sessionId } = c.req.param();

  const session = await sessionDAO.findById(sessionId);
  if (!session || session.project_id !== c.get('projectId')) {
    return c.json({ error: 'Session not found' }, 404);
  }

  if (session.status !== 'pending') {
    return c.json({ error: 'Session already started' }, 400);
  }

  // Initialize agent state
  const state = createInitialState();
  sessionStates.set(sessionId, state);

  // Generate opening message
  let openingMessage = "Hi there! Thanks for taking the time to chat. I'd love to hear about your experience. Could you start by telling me a little about yourself?";

  if (env.ANTHROPIC_API_KEY) {
    try {
      openingMessage = await generateOpeningMessage(env.ANTHROPIC_API_KEY, {
        participantName: session.participant_name || undefined,
      });
    } catch (e) {
      console.error('Failed to generate opening message:', e);
    }
  }

  // Update session status
  await sessionDAO.update(sessionId, {
    status: 'active',
    started_at: new Date().toISOString(),
    phase_started_at: new Date().toISOString(),
  });

  // Store opening message
  await sessionDAO.addMessage(sessionId, 'interviewer', openingMessage, 0);

  // Update state with opening message
  state.messages.push({ role: 'interviewer', content: openingMessage });
  sessionStates.set(sessionId, state);

  return c.json({
    message: openingMessage,
    phase: state.phase,
    session_id: sessionId,
  });
});

/**
 * Send a message in an active interview.
 */
// B4: 30 req/min per IP + 60 req/min per session
interviewRoutes.post('/api/sdk/interview/:sessionId/message', ipRateLimit(30), sessionRateLimit(60), sdkAuth, async (c) => {
  const container = c.get('container');
  const sessionDAO = container.get(SessionDAO);
  const env = c.env as Env;
  const { sessionId } = c.req.param();

  const session = await sessionDAO.findById(sessionId);
  if (!session || session.project_id !== c.get('projectId')) {
    return c.json({ error: 'Session not found' }, 404);
  }

  if (session.status !== 'active') {
    return c.json({ error: 'Session is not active' }, 400);
  }

  const body = await c.req.json<{ content: string; timestamp_ms?: number }>();
  if (!body.content || body.content.trim().length === 0) {
    return c.json({ error: 'Message content is required' }, 400);
  }

  // B4: payload limit — max 4000 chars
  if (body.content.length > 4000) {
    return c.json({ error: 'Message content exceeds maximum length of 4000 characters' }, 400);
  }

  const timestampMs = body.timestamp_ms || (session.started_at
    ? Date.now() - new Date(session.started_at).getTime()
    : 0);

  // Store user message
  await sessionDAO.addMessage(sessionId, 'user', body.content, timestampMs);

  // Get or rebuild agent state
  let state = sessionStates.get(sessionId);
  if (!state) {
    // Rebuild state from messages
    const messages = await sessionDAO.getMessages(sessionId);
    state = createInitialState();
    state.messages = messages.map(m => ({
      role: m.role as 'user' | 'interviewer' | 'system',
      content: m.content,
    }));
    state.totalExchangeCount = messages.filter(m => m.role === 'user').length;
  }

  if (!env.ANTHROPIC_API_KEY) {
    // Fallback: echo back without AI
    const fallback = 'Thank you for sharing that. Could you tell me more about your experience?';
    await sessionDAO.addMessage(sessionId, 'interviewer', fallback, timestampMs + 1000);
    return c.json({ message: fallback, phase: state.phase });
  }

  // Process with agent
  const { response, newState, phase } = await processUserMessage(
    state,
    body.content,
    env.ANTHROPIC_API_KEY,
  );

  // Store response
  await sessionDAO.addMessage(sessionId, 'interviewer', response, timestampMs + 2000);

  // Update phase if changed
  if (phase !== session.current_phase) {
    await sessionDAO.update(sessionId, {
      current_phase: phase,
      phase_started_at: new Date().toISOString(),
    });
  }

  // Check if interview should end
  const isComplete = phase === 'wrap_up' && newState.phaseExchangeCount >= 2;

  if (isComplete) {
    const completion = await completeSession(sessionDAO, env, session, sessionId);

    return c.json({
      message: response,
      phase,
      is_complete: true,
      queued: completion.queued,
    });
  }

  sessionStates.set(sessionId, newState);

  return c.json({
    message: response,
    phase,
    is_complete: false,
  });
});

/**
 * End an interview manually.
 */
interviewRoutes.post('/api/sdk/interview/:sessionId/end', sdkAuth, async (c) => {
  const container = c.get('container');
  const sessionDAO = container.get(SessionDAO);
  const env = c.env as Env;
  const { sessionId } = c.req.param();

  const session = await sessionDAO.findById(sessionId);
  if (!session || session.project_id !== c.get('projectId')) {
    return c.json({ error: 'Session not found' }, 404);
  }

  const completion = await completeSession(sessionDAO, env, session, sessionId);

  return c.json({
    success: true,
    already_completed: completion.alreadyCompleted,
    queued: completion.queued,
  });
});

export { interviewRoutes };
