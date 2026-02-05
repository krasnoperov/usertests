import { injectable, inject } from 'inversify';
import type { Kysely } from 'kysely';
import type { Database, Implementation, NewImplementation, ImplementationUpdate } from '../db/types';
import { TYPES } from '../core/di-types';
import { generateId } from '../shared/id';

export interface CreateImplementationInput {
  task_id: string;
  project_id: string;
  spec_json?: string;
  relevant_files?: string[];
  is_dry_run?: boolean;
}

@injectable()
export class ImplementationDAO {
  constructor(@inject(TYPES.Database) private db: Kysely<Database>) {}

  async create(input: CreateImplementationInput): Promise<Implementation> {
    const now = new Date().toISOString();
    const id = generateId();

    // Determine attempt number
    const prevAttempts = await this.db
      .selectFrom('implementations')
      .select(({ fn }) => fn.countAll<number>().as('count'))
      .where('task_id', '=', input.task_id)
      .executeTakeFirst();

    const impl: NewImplementation = {
      id,
      task_id: input.task_id,
      project_id: input.project_id,
      spec_json: input.spec_json ?? null,
      relevant_files_json: input.relevant_files ? JSON.stringify(input.relevant_files) : null,
      status: 'pending',
      attempt_number: (prevAttempts?.count ?? 0) + 1,
      branch_name: null,
      commit_sha: null,
      pr_url: null,
      pr_number: null,
      pr_state: null,
      pr_merged_at: null,
      started_at: null,
      completed_at: null,
      error_message: null,
      changes_summary: null,
      files_changed_json: null,
      is_dry_run: input.is_dry_run ? 1 : 0,
      created_at: now,
      updated_at: now,
    };

    await this.db.insertInto('implementations').values(impl).execute();
    return impl as Implementation;
  }

  async findById(id: string): Promise<Implementation | undefined> {
    return await this.db
      .selectFrom('implementations')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();
  }

  async findByTask(taskId: string): Promise<Implementation[]> {
    return await this.db
      .selectFrom('implementations')
      .selectAll()
      .where('task_id', '=', taskId)
      .orderBy('attempt_number', 'desc')
      .execute();
  }

  async findLatestByTask(taskId: string): Promise<Implementation | undefined> {
    return await this.db
      .selectFrom('implementations')
      .selectAll()
      .where('task_id', '=', taskId)
      .orderBy('attempt_number', 'desc')
      .limit(1)
      .executeTakeFirst();
  }

  async listByProject(projectId: string, status?: string): Promise<Implementation[]> {
    let query = this.db
      .selectFrom('implementations')
      .selectAll()
      .where('project_id', '=', projectId)
      .orderBy('created_at', 'desc');

    if (status) {
      query = query.where('status', '=', status);
    }

    return await query.execute();
  }

  async update(id: string, data: Partial<ImplementationUpdate>): Promise<void> {
    await this.db
      .updateTable('implementations')
      .set({ ...data, updated_at: new Date().toISOString() })
      .where('id', '=', id)
      .execute();
  }

  async markStarted(id: string): Promise<void> {
    await this.update(id, {
      status: 'running',
      started_at: new Date().toISOString(),
    });
  }

  async markSuccess(id: string, summary: string, filesChanged: string[]): Promise<void> {
    await this.update(id, {
      status: 'success',
      completed_at: new Date().toISOString(),
      changes_summary: summary,
      files_changed_json: JSON.stringify(filesChanged),
    });
  }

  async markFailed(id: string, error: string): Promise<void> {
    await this.update(id, {
      status: 'failed',
      completed_at: new Date().toISOString(),
      error_message: error,
    });
  }

  async setPRInfo(id: string, prUrl: string, prNumber: number, branchName: string): Promise<void> {
    await this.update(id, {
      pr_url: prUrl,
      pr_number: prNumber,
      branch_name: branchName,
      pr_state: 'open',
    });
  }

  async markPRMerged(id: string): Promise<void> {
    await this.update(id, {
      pr_state: 'merged',
      pr_merged_at: new Date().toISOString(),
    });
  }

  async delete(id: string): Promise<void> {
    await this.db.deleteFrom('implementations').where('id', '=', id).execute();
  }
}
