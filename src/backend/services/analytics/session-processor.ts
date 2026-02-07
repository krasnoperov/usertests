/**
 * Session Processor (PRD-03)
 *
 * Processes completed sessions: transcription, timeline merge, signal extraction.
 * Triggered by queue messages when sessions complete.
 */

import 'reflect-metadata';
import type { Env } from '../../../core/types';
import { createContainer } from '../../../core/container';
import { SignalDAO } from '../../../dao/signal-dao';
import { SessionDAO } from '../../../dao/session-dao';
import { TaskDAO } from '../../../dao/task-dao';
import { extractSignals, suggestTasks, buildTranscript, buildTimeline } from './signal-extractor';

export interface ProcessSessionInput {
  sessionId: string;
  projectId: string;
}

/**
 * Full session processing pipeline:
 * 1. Fetch messages and events
 * 2. Build transcript and timeline
 * 3. Store transcript in R2
 * 4. Extract JTBD signals
 * 5. Store signals in D1
 * 6. Suggest tasks
 * 7. Update session metadata
 */
export async function processSession(
  input: ProcessSessionInput,
  env: Env
): Promise<{ signalCount: number; tasksSuggested: number }> {
  const container = createContainer(env);
  const sessionDAO = container.get(SessionDAO);
  const signalDAO = container.get(SignalDAO);
  const taskDAO = container.get(TaskDAO);

  const session = await sessionDAO.findById(input.sessionId);
  if (!session) {
    throw new Error(`Session not found: ${input.sessionId}`);
  }

  const nowTimestampMs = session.started_at
    ? Math.max(0, Date.now() - new Date(session.started_at).getTime())
    : 0;

  // --- Canonical status markers (A2) ---
  // Idempotency: skip if already processed
  const alreadyProcessed = await sessionDAO.hasEvent(input.sessionId, 'session.processed');
  if (alreadyProcessed) {
    console.log(`Session ${input.sessionId} already processed, skipping`);
    return { signalCount: session.signal_count ?? 0, tasksSuggested: 0 };
  }

  // Mark processing started
  await sessionDAO.addEvent(input.sessionId, 'session.processing_started', nowTimestampMs, {
    attempt_at: new Date().toISOString(),
  });

  try {
    return await _processSessionInner(input, env, session, sessionDAO, signalDAO, taskDAO, nowTimestampMs);
  } catch (error) {
    // Mark processing failed — terminal marker
    const reason = error instanceof Error ? error.message : String(error);
    await sessionDAO.addEvent(input.sessionId, 'session.processing_failed', nowTimestampMs, {
      reason,
      failed_at: new Date().toISOString(),
    });
    console.error(`Processing failed for session ${input.sessionId}:`, reason);
    throw error; // Re-throw so queue handler can decide retry vs ack
  }
}

/**
 * Inner processing logic, separated so the outer function handles
 * the canonical status markers and error boundaries cleanly.
 */
async function _processSessionInner(
  input: ProcessSessionInput,
  env: Env,
  session: NonNullable<Awaited<ReturnType<SessionDAO['findById']>>>,
  sessionDAO: SessionDAO,
  signalDAO: SignalDAO,
  taskDAO: TaskDAO,
  nowTimestampMs: number,
): Promise<{ signalCount: number; tasksSuggested: number }> {
  const markProcessed = async (status: string, data?: Record<string, unknown>) => {
    await sessionDAO.addEvent(
      input.sessionId,
      'session.processed',
      nowTimestampMs,
      { status, ...(data || {}) },
    );
  };

  // 1. Fetch messages and events
  const messages = await sessionDAO.getMessages(input.sessionId);
  const events = await sessionDAO.getEvents(input.sessionId);

  if (messages.length === 0) {
    console.log(`Session ${input.sessionId} has no messages, skipping`);
    await markProcessed('skipped_no_messages');
    return { signalCount: 0, tasksSuggested: 0 };
  }

  // 2. Build transcript
  const transcript = buildTranscript(messages);
  const timeline = buildTimeline(messages, events);

  // 3. Store in R2 (if available)
  if (env.STORAGE) {
    const transcriptKey = `sessions/${input.sessionId}/transcript.txt`;
    const timelineKey = `sessions/${input.sessionId}/timeline.json`;

    await env.STORAGE.put(transcriptKey, transcript);
    await env.STORAGE.put(timelineKey, JSON.stringify(timeline));

    await sessionDAO.update(input.sessionId, {
      transcript_key: transcriptKey,
      timeline_key: timelineKey,
    });
  }

  // 4. Extract signals
  if (!env.ANTHROPIC_API_KEY) {
    console.warn('ANTHROPIC_API_KEY not set, skipping signal extraction');
    await markProcessed('skipped_no_anthropic_key');
    return { signalCount: 0, tasksSuggested: 0 };
  }

  const extractedSignals = await extractSignals(transcript, env.ANTHROPIC_API_KEY);

  // 5. Store signals
  const signals = await signalDAO.createMany(
    extractedSignals.map(s => ({
      project_id: input.projectId,
      session_id: input.sessionId,
      signal_type: s.signal_type,
      confidence: s.confidence,
      intensity: s.intensity,
      quote: s.quote,
      context: s.context,
      analysis: s.analysis,
      timestamp_ms: s.timestamp_ms,
    }))
  );

  // Store signals JSON in R2
  if (env.STORAGE) {
    const signalsKey = `sessions/${input.sessionId}/signals.json`;
    await env.STORAGE.put(signalsKey, JSON.stringify(signals));
    await sessionDAO.update(input.sessionId, { signals_key: signalsKey });
  }

  // 6. Suggest tasks
  let tasksSuggested = 0;
  if (extractedSignals.length > 0) {
    const suggested = await suggestTasks(extractedSignals, env.ANTHROPIC_API_KEY);
    for (const suggestion of suggested) {
      await taskDAO.create({
        project_id: input.projectId,
        title: suggestion.title,
        description: suggestion.description,
        task_type: suggestion.task_type,
        effort_estimate: suggestion.effort_estimate,
      });
      tasksSuggested++;
    }
  }

  // 7. Update session
  await sessionDAO.update(input.sessionId, {
    signal_count: signals.length,
  });

  await markProcessed('processed', {
    signal_count: signals.length,
    tasks_suggested: tasksSuggested,
  });

  console.log(`Processed session ${input.sessionId}: ${signals.length} signals, ${tasksSuggested} tasks suggested`);
  return { signalCount: signals.length, tasksSuggested };
}
