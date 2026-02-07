import { injectable, inject } from 'inversify';
import type { Kysely } from 'kysely';
import type { Database, TaskProviderState, TaskProviderStateUpdate } from '../db/types';
import { TYPES } from '../core/di-types';
import { generateId } from '../shared/id';

@injectable()
export class TaskProviderDAO {
  constructor(@inject(TYPES.Database) private db: Kysely<Database>) {}

  async upsert(
    taskId: string,
    projectId: string,
    provider: string,
    data: Partial<TaskProviderStateUpdate>,
  ): Promise<TaskProviderState> {
    const existing = await this.findByTaskAndProvider(taskId, provider);
    const now = new Date().toISOString();

    if (existing) {
      await this.db
        .updateTable('task_provider_state')
        .set({ ...data, updated_at: now })
        .where('id', '=', existing.id)
        .execute();
      return { ...existing, ...data, updated_at: now } as TaskProviderState;
    }

    const id = generateId();
    const row = {
      id,
      task_id: taskId,
      project_id: projectId,
      provider,
      external_id: data.external_id ?? null,
      external_url: data.external_url ?? null,
      external_status: data.external_status ?? null,
      metadata_json: data.metadata_json ?? null,
      synced_at: data.synced_at ?? null,
      created_at: now,
      updated_at: now,
    };

    await this.db.insertInto('task_provider_state').values(row).execute();
    return row as TaskProviderState;
  }

  async findByTask(taskId: string): Promise<TaskProviderState[]> {
    return await this.db
      .selectFrom('task_provider_state')
      .selectAll()
      .where('task_id', '=', taskId)
      .execute();
  }

  async findByTaskAndProvider(taskId: string, provider: string): Promise<TaskProviderState | undefined> {
    return await this.db
      .selectFrom('task_provider_state')
      .selectAll()
      .where('task_id', '=', taskId)
      .where('provider', '=', provider)
      .executeTakeFirst();
  }

  async findByExternalId(provider: string, externalId: string): Promise<TaskProviderState | undefined> {
    return await this.db
      .selectFrom('task_provider_state')
      .selectAll()
      .where('provider', '=', provider)
      .where('external_id', '=', externalId)
      .executeTakeFirst();
  }

  async updateStatus(id: string, status: string, metadata?: Record<string, unknown>): Promise<void> {
    const updates: Partial<TaskProviderStateUpdate> = {
      external_status: status,
      synced_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    if (metadata) {
      updates.metadata_json = JSON.stringify(metadata);
    }
    await this.db
      .updateTable('task_provider_state')
      .set(updates)
      .where('id', '=', id)
      .execute();
  }
}
