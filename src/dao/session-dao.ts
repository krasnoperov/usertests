import { injectable, inject } from 'inversify';
import type { Kysely } from 'kysely';
import type { Database, Session, NewSession, SessionUpdate, SessionMessage, NewSessionMessage, SessionEvent, NewSessionEvent, AudioChunk, NewAudioChunk } from '../db/types';
import { TYPES } from '../core/di-types';
import { generateId } from '../shared/id';

export interface CreateSessionInput {
  project_id: string;
  screener_id?: string;
  screener_response_id?: string;
  participant_name?: string;
  participant_email?: string;
  interview_mode?: string;
}

export interface ListSessionsOptions {
  project_id: string;
  status?: string;
  limit?: number;
  offset?: number;
}

@injectable()
export class SessionDAO {
  constructor(@inject(TYPES.Database) private db: Kysely<Database>) {}

  async create(input: CreateSessionInput): Promise<Session> {
    const now = new Date().toISOString();
    const id = generateId();

    const session: NewSession = {
      id,
      project_id: input.project_id,
      screener_id: input.screener_id ?? null,
      screener_response_id: input.screener_response_id ?? null,
      participant_name: input.participant_name ?? null,
      participant_email: input.participant_email ?? null,
      status: 'pending',
      interview_mode: input.interview_mode ?? 'voice',
      current_phase: 'rapport',
      phase_started_at: null,
      started_at: null,
      completed_at: null,
      duration_seconds: null,
      transcript_key: null,
      timeline_key: null,
      signals_key: null,
      summary: null,
      signal_count: 0,
      talk_ratio: null,
      quality_score: null,
      consent_recording: 0,
      consent_analytics: 0,
      consent_followup: 0,
      cost_audio_cents: 0,
      cost_transcription_cents: 0,
      cost_analysis_cents: 0,
      created_at: now,
      updated_at: now,
    };

    await this.db.insertInto('sessions').values(session).execute();
    return session as Session;
  }

  async findById(id: string): Promise<Session | undefined> {
    return await this.db
      .selectFrom('sessions')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();
  }

  async list(options: ListSessionsOptions): Promise<Session[]> {
    let query = this.db
      .selectFrom('sessions')
      .selectAll()
      .where('project_id', '=', options.project_id)
      .orderBy('created_at', 'desc');

    if (options.status) {
      query = query.where('status', '=', options.status);
    }
    if (options.limit) {
      query = query.limit(options.limit);
    }
    if (options.offset) {
      query = query.offset(options.offset);
    }

    return await query.execute();
  }

  async countByProject(projectId: string, status?: string): Promise<number> {
    let query = this.db
      .selectFrom('sessions')
      .select(({ fn }) => fn.countAll<number>().as('count'))
      .where('project_id', '=', projectId);

    if (status) {
      query = query.where('status', '=', status);
    }

    const result = await query.executeTakeFirst();
    return result?.count ?? 0;
  }

  async update(id: string, data: Partial<SessionUpdate>): Promise<void> {
    await this.db
      .updateTable('sessions')
      .set({ ...data, updated_at: new Date().toISOString() })
      .where('id', '=', id)
      .execute();
  }

  async delete(id: string): Promise<void> {
    await this.db.deleteFrom('sessions').where('id', '=', id).execute();
  }

  // --- Messages ---

  async addMessage(sessionId: string, role: string, content: string, timestampMs: number, audioChunkKey?: string): Promise<SessionMessage> {
    const id = generateId();
    const now = new Date().toISOString();

    const message: NewSessionMessage = {
      id,
      session_id: sessionId,
      role,
      content,
      timestamp_ms: timestampMs,
      sentiment: null,
      audio_chunk_key: audioChunkKey ?? null,
      created_at: now,
    };

    await this.db.insertInto('session_messages').values(message).execute();
    return message as SessionMessage;
  }

  async getMessages(sessionId: string): Promise<SessionMessage[]> {
    return await this.db
      .selectFrom('session_messages')
      .selectAll()
      .where('session_id', '=', sessionId)
      .orderBy('timestamp_ms', 'asc')
      .execute();
  }

  // --- Events ---

  async addEvent(sessionId: string, eventType: string, timestampMs: number, data: Record<string, unknown> = {}): Promise<void> {
    const event: NewSessionEvent = {
      session_id: sessionId,
      event_type: eventType,
      timestamp_ms: timestampMs,
      data_json: JSON.stringify(data),
      target_selector: (data.target_selector as string) ?? null,
      target_text: (data.target_text as string) ?? null,
      url: (data.url as string) ?? null,
      page_title: (data.page_title as string) ?? null,
    };

    await this.db.insertInto('session_events').values(event).execute();
  }

  async getEvents(sessionId: string, eventType?: string): Promise<SessionEvent[]> {
    let query = this.db
      .selectFrom('session_events')
      .selectAll()
      .where('session_id', '=', sessionId)
      .orderBy('timestamp_ms', 'asc');

    if (eventType) {
      query = query.where('event_type', '=', eventType);
    }

    return await query.execute();
  }

  // --- Audio Chunks ---

  async addAudioChunk(sessionId: string, chunkIndex: number, r2Key: string, durationMs?: number, sizeBytes?: number): Promise<AudioChunk> {
    const now = new Date().toISOString();

    const chunk: NewAudioChunk = {
      session_id: sessionId,
      chunk_index: chunkIndex,
      r2_key: r2Key,
      duration_ms: durationMs ?? null,
      size_bytes: sizeBytes ?? null,
      mime_type: 'audio/webm',
      transcribed: 0,
      transcript_text: null,
      created_at: now,
    };

    await this.db.insertInto('audio_chunks').values(chunk).execute();
    return chunk as AudioChunk;
  }

  async getAudioChunks(sessionId: string): Promise<AudioChunk[]> {
    return await this.db
      .selectFrom('audio_chunks')
      .selectAll()
      .where('session_id', '=', sessionId)
      .orderBy('chunk_index', 'asc')
      .execute();
  }

  async markChunkTranscribed(id: number, transcriptText: string): Promise<void> {
    await this.db
      .updateTable('audio_chunks')
      .set({ transcribed: 1, transcript_text: transcriptText })
      .where('id', '=', id)
      .execute();
  }
}
