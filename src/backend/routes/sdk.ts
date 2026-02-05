import { Hono } from 'hono';
import type { AppContext } from './types';
import { createSDKAuthMiddleware } from '../middleware/project-middleware';
import { SessionDAO } from '../../dao/session-dao';
import type { Env } from '../../core/types';

const sdkRoutes = new Hono<AppContext>();
const sdkAuth = createSDKAuthMiddleware();

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
sdkRoutes.post('/api/sdk/audio/upload', sdkAuth, async (c) => {
  const container = c.get('container');
  const sessionDAO = container.get(SessionDAO);
  const env = c.env as Env;
  const projectId = c.get('projectId');

  const formData = await c.req.formData();
  const audioFile = formData.get('audio') as File;
  const chunkIndex = parseInt(formData.get('chunk_index') as string || '0');
  const sessionId = formData.get('session_id') as string;

  if (!audioFile || !sessionId) {
    return c.json({ error: 'audio and session_id are required' }, 400);
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
    undefined, // duration_ms determined after transcription
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

// Batch event ingestion from SDK
sdkRoutes.post('/api/sdk/events', sdkAuth, async (c) => {
  const container = c.get('container');
  const sessionDAO = container.get(SessionDAO);
  const projectId = c.get('projectId');

  const body = await c.req.json<{
    session_id: string;
    events: Array<{
      type: string;
      timestamp_ms: number;
      data?: Record<string, unknown>;
    }>;
  }>();

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

export { sdkRoutes };
