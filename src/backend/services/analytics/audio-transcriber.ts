/**
 * Audio Transcription Service (PRD-02/03)
 *
 * Transcribes audio chunks via OpenAI Whisper API.
 * Called from the queue handler for each uploaded audio chunk.
 */

import 'reflect-metadata';
import type { Env } from '../../../core/types';
import { createContainer } from '../../../core/container';
import { SessionDAO } from '../../../dao/session-dao';

export interface TranscribeChunkInput {
  sessionId: string;
  chunkId: number;
  r2Key: string;
}

/**
 * Transcribe a single audio chunk:
 * 1. Check idempotency (already transcribed?)
 * 2. Fetch audio from R2
 * 3. Send to OpenAI Whisper
 * 4. Persist transcript text in DB
 */
export async function transcribeAudioChunk(
  input: TranscribeChunkInput,
  env: Env,
): Promise<{ transcribed: boolean; text: string }> {
  const container = createContainer(env);
  const sessionDAO = container.get(SessionDAO);

  // 1. Find the chunk record and check idempotency
  const chunks = await sessionDAO.getAudioChunks(input.sessionId);
  const chunk = chunks.find(c => c.chunk_index === input.chunkId);

  if (!chunk) {
    throw new Error(`Audio chunk not found: session=${input.sessionId} chunk=${input.chunkId}`);
  }

  // Already transcribed — idempotent skip
  if (chunk.transcribed === 1 && chunk.transcript_text) {
    console.log(`Chunk ${input.chunkId} of session ${input.sessionId} already transcribed, skipping`);
    return { transcribed: false, text: chunk.transcript_text };
  }

  // 2. Fetch audio from R2
  if (!env.STORAGE) {
    throw new Error('R2 STORAGE binding not available');
  }

  const r2Object = await env.STORAGE.get(input.r2Key);
  if (!r2Object) {
    throw new Error(`Audio object not found in R2: ${input.r2Key}`);
  }

  const audioBlob = await r2Object.arrayBuffer();

  // 3. Send to OpenAI Whisper API
  if (!env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY not set, cannot transcribe audio');
  }

  const transcriptText = await callWhisperAPI(audioBlob, env.OPENAI_API_KEY, chunk.mime_type || 'audio/webm');

  // 4. Persist transcript
  await sessionDAO.markChunkTranscribed(chunk.id, transcriptText);

  console.log(`Transcribed chunk ${input.chunkId} of session ${input.sessionId}: ${transcriptText.length} chars`);
  return { transcribed: true, text: transcriptText };
}

/**
 * Call OpenAI Whisper API for transcription.
 */
async function callWhisperAPI(
  audioBuffer: ArrayBuffer,
  apiKey: string,
  mimeType: string,
): Promise<string> {
  // Map mime type to file extension for Whisper
  const extMap: Record<string, string> = {
    'audio/webm': 'webm',
    'audio/mpeg': 'mp3',
    'audio/mp4': 'm4a',
    'audio/wav': 'wav',
    'audio/ogg': 'ogg',
    'audio/flac': 'flac',
    'audio/aac': 'aac',
  };
  const ext = extMap[mimeType] || 'webm';

  const formData = new FormData();
  formData.append('file', new Blob([audioBuffer], { type: mimeType }), `audio.${ext}`);
  formData.append('model', 'whisper-1');
  formData.append('response_format', 'text');

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Whisper API error ${response.status}: ${errorBody}`);
  }

  const text = await response.text();
  return text.trim();
}
