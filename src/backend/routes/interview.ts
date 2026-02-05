import { Hono } from 'hono';
import type { AppContext } from './types';
import { createSDKAuthMiddleware } from '../middleware/project-middleware';
import { SessionDAO } from '../../dao/session-dao';
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
interviewRoutes.post('/api/sdk/interview/:sessionId/message', sdkAuth, async (c) => {
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
    const fallback = "Thank you for sharing that. Could you tell me more about your experience?";
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
    await sessionDAO.update(sessionId, {
      status: 'completed',
      completed_at: new Date().toISOString(),
      duration_seconds: session.started_at
        ? Math.floor((Date.now() - new Date(session.started_at).getTime()) / 1000)
        : null,
    });

    // Queue session processing
    if (env.PROCESSING_QUEUE) {
      await env.PROCESSING_QUEUE.send({
        type: 'session.completed',
        sessionId,
        projectId: session.project_id,
      });
    }

    sessionStates.delete(sessionId);
  } else {
    sessionStates.set(sessionId, newState);
  }

  return c.json({
    message: response,
    phase,
    is_complete: isComplete,
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

  await sessionDAO.update(sessionId, {
    status: 'completed',
    completed_at: new Date().toISOString(),
    duration_seconds: session.started_at
      ? Math.floor((Date.now() - new Date(session.started_at).getTime()) / 1000)
      : null,
  });

  // Queue session processing
  if (env.PROCESSING_QUEUE) {
    await env.PROCESSING_QUEUE.send({
      type: 'session.completed',
      sessionId,
      projectId: session.project_id,
    });
  }

  sessionStates.delete(sessionId);

  return c.json({ success: true });
});

export { interviewRoutes };
