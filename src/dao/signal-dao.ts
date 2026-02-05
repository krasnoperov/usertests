import { injectable, inject } from 'inversify';
import type { Kysely } from 'kysely';
import type { Database, Signal, NewSignal } from '../db/types';
import { TYPES } from '../core/di-types';
import { generateId } from '../shared/id';

export interface CreateSignalInput {
  project_id: string;
  session_id: string;
  signal_type: string;
  confidence: number;
  intensity?: number;
  quote: string;
  context?: string;
  analysis?: string;
  timestamp_ms?: number;
  task_id?: string;
}

export interface ListSignalsOptions {
  project_id: string;
  session_id?: string;
  signal_type?: string;
  task_id?: string;
  min_confidence?: number;
  limit?: number;
  offset?: number;
}

@injectable()
export class SignalDAO {
  constructor(@inject(TYPES.Database) private db: Kysely<Database>) {}

  async create(input: CreateSignalInput): Promise<Signal> {
    const id = generateId();
    const now = new Date().toISOString();

    const signal: NewSignal = {
      id,
      project_id: input.project_id,
      session_id: input.session_id,
      signal_type: input.signal_type,
      confidence: input.confidence,
      intensity: input.intensity ?? null,
      quote: input.quote,
      context: input.context ?? null,
      analysis: input.analysis ?? null,
      timestamp_ms: input.timestamp_ms ?? null,
      task_id: input.task_id ?? null,
      created_at: now,
    };

    await this.db.insertInto('signals').values(signal).execute();
    return signal as Signal;
  }

  async createMany(inputs: CreateSignalInput[]): Promise<Signal[]> {
    const now = new Date().toISOString();
    const signals: NewSignal[] = inputs.map(input => ({
      id: generateId(),
      project_id: input.project_id,
      session_id: input.session_id,
      signal_type: input.signal_type,
      confidence: input.confidence,
      intensity: input.intensity ?? null,
      quote: input.quote,
      context: input.context ?? null,
      analysis: input.analysis ?? null,
      timestamp_ms: input.timestamp_ms ?? null,
      task_id: input.task_id ?? null,
      created_at: now,
    }));

    if (signals.length > 0) {
      await this.db.insertInto('signals').values(signals).execute();
    }

    return signals as Signal[];
  }

  async findById(id: string): Promise<Signal | undefined> {
    return await this.db
      .selectFrom('signals')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();
  }

  async list(options: ListSignalsOptions): Promise<Signal[]> {
    let query = this.db
      .selectFrom('signals')
      .selectAll()
      .where('project_id', '=', options.project_id)
      .orderBy('created_at', 'desc');

    if (options.session_id) {
      query = query.where('session_id', '=', options.session_id);
    }
    if (options.signal_type) {
      query = query.where('signal_type', '=', options.signal_type);
    }
    if (options.task_id) {
      query = query.where('task_id', '=', options.task_id);
    }
    if (options.min_confidence !== undefined) {
      query = query.where('confidence', '>=', options.min_confidence);
    }
    if (options.limit) {
      query = query.limit(options.limit);
    }
    if (options.offset) {
      query = query.offset(options.offset);
    }

    return await query.execute();
  }

  async countByProject(projectId: string, signalType?: string): Promise<number> {
    let query = this.db
      .selectFrom('signals')
      .select(({ fn }) => fn.countAll<number>().as('count'))
      .where('project_id', '=', projectId);

    if (signalType) {
      query = query.where('signal_type', '=', signalType);
    }

    const result = await query.executeTakeFirst();
    return result?.count ?? 0;
  }

  async linkToTask(signalId: string, taskId: string): Promise<void> {
    // Update the signal's task_id
    await this.db
      .updateTable('signals')
      .set({ task_id: taskId })
      .where('id', '=', signalId)
      .execute();

    // Add to junction table
    await this.db
      .insertInto('task_signals')
      .values({ task_id: taskId, signal_id: signalId })
      .execute();
  }

  async unlinkFromTask(signalId: string, taskId: string): Promise<void> {
    await this.db
      .updateTable('signals')
      .set({ task_id: null })
      .where('id', '=', signalId)
      .execute();

    await this.db
      .deleteFrom('task_signals')
      .where('task_id', '=', taskId)
      .where('signal_id', '=', signalId)
      .execute();
  }

  async getSignalsByTask(taskId: string): Promise<Signal[]> {
    return await this.db
      .selectFrom('signals')
      .innerJoin('task_signals', 'task_signals.signal_id', 'signals.id')
      .selectAll('signals')
      .where('task_signals.task_id', '=', taskId)
      .orderBy('signals.created_at', 'desc')
      .execute();
  }

  async delete(id: string): Promise<void> {
    await this.db.deleteFrom('signals').where('id', '=', id).execute();
  }
}
