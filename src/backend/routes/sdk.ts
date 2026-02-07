import { Hono } from 'hono';
import type { AppContext } from './types';
import { createSDKAuthMiddleware } from '../middleware/project-middleware';
import { sessionRateLimit } from '../middleware/rate-limit';
import { SessionDAO } from '../../dao/session-dao';
import type { Env } from '../../core/types';

// B4: payload size limits
const MAX_AUDIO_CHUNK_BYTES = 10 * 1024 * 1024;  // 10 MB
const MAX_SCREEN_CHUNK_BYTES = 25 * 1024 * 1024;  // 25 MB
const MAX_EVENTS_PAYLOAD_BYTES = 256 * 1024;       // 256 KB

const sdkRoutes = new Hono<AppContext>();
const sdkAuth = createSDKAuthMiddleware();

function getSessionElapsedMs(startedAt: string | null): number {
  if (!startedAt) return 0;
  return Math.max(0, Date.now() - new Date(startedAt).getTime());
}

// Create a new session via SDK (for recording without pre-created session)
sdkRoutes.post('/api/sdk/sessions', sdkAuth, async (c) => {
  const container = c.get('container');
  const sessionDAO = container.get(SessionDAO);
  const projectId = c.get('projectId');

  const body = await c.req.json<{
    participant_name?: string;
    participant_email?: string;
    interview_mode?: string;
  }>();

  const session = await sessionDAO.create({
    project_id: projectId,
    participant_name: body.participant_name,
    participant_email: body.participant_email,
    interview_mode: body.interview_mode || 'voice',
  });

  return c.json({ session_id: session.id }, 201);
});

// Upload audio chunk
// B4: 30 req/min per session
sdkRoutes.post('/api/sdk/audio/upload', sessionRateLimit(30), sdkAuth, async (c) => {
  const container = c.get('container');
  const sessionDAO = container.get(SessionDAO);
  const env = c.env as Env;
  const projectId = c.get('projectId');

  const formData = await c.req.formData();
  const audioFile = formData.get('audio') as File | null;
  const chunkIndexRaw = formData.get('chunk_index');
  const sessionId = formData.get('session_id') as string | null;
  const chunkIndex = parseInt((chunkIndexRaw as string) || '0', 10);

  if (!audioFile || !sessionId) {
    return c.json({ error: 'audio and session_id are required' }, 400);
  }

  if (Number.isNaN(chunkIndex) || chunkIndex < 0) {
    return c.json({ error: 'chunk_index must be a non-negative integer' }, 400);
  }

  // B4: audio chunk max 10 MB
  if (audioFile.size > MAX_AUDIO_CHUNK_BYTES) {
    return c.json({ error: `Audio chunk exceeds maximum size of ${MAX_AUDIO_CHUNK_BYTES / (1024 * 1024)}MB` }, 400);
  }

  // Validate session belongs to project
  const session = await sessionDAO.findById(sessionId);
  if (!session || session.project_id !== projectId) {
    return c.json({ error: 'Session not found' }, 404);
  }

  // Upload to R2
  const r2Key = `audio/${sessionId}/chunk-${chunkIndex.toString().padStart(4, '0')}.webm`;

  if (env.STORAGE) {
    const arrayBuffer = await audioFile.arrayBuffer();
    await env.STORAGE.put(r2Key, arrayBuffer, {
      httpMetadata: {
        contentType: audioFile.type || 'audio/webm',
      },
    });
  }

  // Record in DB
  await sessionDAO.addAudioChunk(
    sessionId,
    chunkIndex,
    r2Key,
    undefined,
    audioFile.size,
  );

  // Queue transcription
  if (env.PROCESSING_QUEUE) {
    await env.PROCESSING_QUEUE.send({
      type: 'audio.transcribe',
      sessionId,
      chunkId: chunkIndex,
      r2Key,
    });
  }

  return c.json({ success: true, r2_key: r2Key });
});

// Upload screen chunk (public participant interview flow)
// B4: 30 req/min per session
sdkRoutes.post('/api/sdk/screen/upload', sessionRateLimit(30), sdkAuth, async (c) => {
  const container = c.get('container');
  const sessionDAO = container.get(SessionDAO);
  const env = c.env as Env;
  const projectId = c.get('projectId');

  const formData = await c.req.formData();
  const screenFile = formData.get('screen') as File | null;
  const chunkIndexRaw = formData.get('chunk_index');
  const sessionId = formData.get('session_id') as string | null;
  const chunkIndex = parseInt((chunkIndexRaw as string) || '0', 10);

  if (!screenFile || !sessionId) {
    return c.json({ error: 'screen and session_id are required' }, 400);
  }

  if (Number.isNaN(chunkIndex) || chunkIndex < 0) {
    return c.json({ error: 'chunk_index must be a non-negative integer' }, 400);
  }

  // B4: screen chunk max 25 MB
  if (screenFile.size > MAX_SCREEN_CHUNK_BYTES) {
    return c.json({ error: `Screen chunk exceeds maximum size of ${MAX_SCREEN_CHUNK_BYTES / (1024 * 1024)}MB` }, 400);
  }

  const session = await sessionDAO.findById(sessionId);
  if (!session || session.project_id !== projectId) {
    return c.json({ error: 'Session not found' }, 404);
  }

  const r2Key = `screen/${sessionId}/chunk-${chunkIndex.toString().padStart(4, '0')}.webm`;

  if (env.STORAGE) {
    const arrayBuffer = await screenFile.arrayBuffer();
    await env.STORAGE.put(r2Key, arrayBuffer, {
      httpMetadata: {
        contentType: screenFile.type || 'video/webm',
      },
    });
  }

  await sessionDAO.addEvent(
    sessionId,
    'screen_chunk_uploaded',
    getSessionElapsedMs(session.started_at),
    {
      chunk_index: chunkIndex,
      r2_key: r2Key,
      size_bytes: screenFile.size,
      mime_type: screenFile.type || 'video/webm',
    },
  );

  return c.json({ success: true, r2_key: r2Key });
});

// Batch event ingestion from SDK (canonical)
// B4: events payload max 256 KB
sdkRoutes.post('/api/sdk/events', sdkAuth, async (c) => {
  const container = c.get('container');
  const sessionDAO = container.get(SessionDAO);
  const projectId = c.get('projectId');

  // B4: check content-length before parsing
  const contentLength = parseInt(c.req.header('content-length') || '0', 10);
  if (contentLength > MAX_EVENTS_PAYLOAD_BYTES) {
    return c.json({ error: `Events payload exceeds maximum size of ${MAX_EVENTS_PAYLOAD_BYTES / 1024}KB` }, 400);
  }

  const body = await c.req.json<{
    session_id: string;
    events: Array<{
      type: string;
      timestamp_ms: number;
      data?: Record<string, unknown>;
    }>;
  }>();

  if (!body.session_id || !Array.isArray(body.events)) {
    return c.json({ error: 'session_id and events are required' }, 400);
  }

  const session = await sessionDAO.findById(body.session_id);
  if (!session || session.project_id !== projectId) {
    return c.json({ error: 'Session not found' }, 404);
  }

  for (const event of body.events) {
    await sessionDAO.addEvent(
      body.session_id,
      event.type,
      event.timestamp_ms,
      event.data,
    );
  }

  return c.json({ success: true, count: body.events.length });
});

// Compatibility endpoint for older SDK clients using per-event interview path
sdkRoutes.post('/api/sdk/interview/:sessionId/events', sdkAuth, async (c) => {
  const container = c.get('container');
  const sessionDAO = container.get(SessionDAO);
  const projectId = c.get('projectId');
  const { sessionId } = c.req.param();

  const session = await sessionDAO.findById(sessionId);
  if (!session || session.project_id !== projectId) {
    return c.json({ error: 'Session not found' }, 404);
  }

  const body = await c.req.json<{
    type: string;
    timestamp_ms?: number;
    data?: Record<string, unknown>;
  }>();

  if (!body.type) {
    return c.json({ error: 'type is required' }, 400);
  }

  const timestampMs = body.timestamp_ms ?? getSessionElapsedMs(session.started_at);

  await sessionDAO.addEvent(sessionId, body.type, timestampMs, body.data);

  return c.json({ success: true, count: 1 });
});

export { sdkRoutes };
