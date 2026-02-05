/**
 * Queue message handler for async processing.
 * Dispatches messages to appropriate processors.
 */
import type { Env, QueueMessage } from '../core/types';
import { processSession } from './services/analytics/session-processor';

export async function handleQueue(batch: MessageBatch<QueueMessage>, env: Env): Promise<void> {
  for (const message of batch.messages) {
    try {
      const msg = message.body;

      switch (msg.type) {
        case 'session.completed': {
          await processSession(
            { sessionId: msg.sessionId, projectId: msg.projectId },
            env
          );
          message.ack();
          break;
        }

        case 'audio.transcribe': {
          // TODO: Implement audio transcription via Whisper
          console.log(`Audio transcription requested for chunk ${msg.chunkId}`);
          message.ack();
          break;
        }

        case 'signals.extract': {
          // Re-run signal extraction for a session
          await processSession(
            { sessionId: msg.sessionId, projectId: msg.projectId },
            env
          );
          message.ack();
          break;
        }

        case 'impact.measure': {
          // TODO: Implement impact measurement
          console.log(`Impact measurement requested for task ${msg.taskId}`);
          message.ack();
          break;
        }

        default: {
          console.error('Unknown message type:', (msg as { type: string }).type);
          message.ack(); // Don't retry unknown messages
        }
      }
    } catch (error) {
      console.error('Queue processing error:', error);
      message.retry({ delaySeconds: 60 });
    }
  }
}
