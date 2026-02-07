/**
 * Queue message handler for async processing.
 * Dispatches messages to appropriate processors.
 *
 * Retry policy (A4):
 *   attempt 1 → retry after 60s
 *   attempt 2 → retry after 300s
 *   attempt 3 → retry after 900s
 *   attempt 4+ → write session.processing_failed, ack (terminal)
 *
 * impact.measure is intentionally synchronous API-only for MVP (A3).
 */
import type { Env, QueueMessage } from '../core/types';
import { processSession } from './services/analytics/session-processor';
import { transcribeAudioChunk } from './services/analytics/audio-transcriber';

/** Backoff schedule in seconds, indexed by attempt number (0-based). */
const RETRY_DELAYS = [60, 300, 900];
const MAX_ATTEMPTS = 3;

export async function handleQueue(batch: MessageBatch<QueueMessage>, env: Env): Promise<void> {
  for (const message of batch.messages) {
    try {
      const msg = message.body;

      switch (msg.type) {
        case 'session.completed': {
          await processSession(
            { sessionId: msg.sessionId, projectId: msg.projectId },
            env,
          );
          message.ack();
          break;
        }

        case 'audio.transcribe': {
          await transcribeAudioChunk(
            { sessionId: msg.sessionId, chunkId: msg.chunkId, r2Key: msg.r2Key },
            env,
          );
          message.ack();
          break;
        }

        case 'signals.extract': {
          // Re-run signal extraction for a session
          await processSession(
            { sessionId: msg.sessionId, projectId: msg.projectId },
            env,
          );
          message.ack();
          break;
        }

        default: {
          console.error('Unknown queue message type:', (msg as { type: string }).type);
          message.ack(); // Don't retry unknown messages
        }
      }
    } catch (error) {
      const attempts = message.attempts ?? 1;
      const reason = error instanceof Error ? error.message : String(error);
      console.error(`Queue processing error (attempt ${attempts}/${MAX_ATTEMPTS}):`, reason);

      if (attempts >= MAX_ATTEMPTS) {
        // Terminal failure — ack to stop retries.
        // session.processing_failed event is already written by processSession's catch block.
        console.error(`Max retries reached for message type=${message.body.type}, acking as terminal failure`);
        message.ack();
      } else {
        const delay = RETRY_DELAYS[attempts - 1] ?? RETRY_DELAYS[RETRY_DELAYS.length - 1];
        console.log(`Retrying in ${delay}s (attempt ${attempts})`);
        message.retry({ delaySeconds: delay });
      }
    }
  }
}
