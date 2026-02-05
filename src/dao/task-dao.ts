import { injectable, inject } from 'inversify';
import type { Kysely } from 'kysely';
import type { Database, Task, NewTask, TaskUpdate } from '../db/types';
import { TYPES } from '../core/di-types';
import { generateId } from '../shared/id';

export interface CreateTaskInput {
  project_id: string;
  title: string;
  description?: string;
  task_type?: string;
  priority_score?: number;
  effort_estimate?: string;
}

export interface ListTasksOptions {
  project_id: string;
  status?: string;
  task_type?: string;
  min_priority?: number;
  limit?: number;
  offset?: number;
}

@injectable()
export class TaskDAO {
  constructor(@inject(TYPES.Database) private db: Kysely<Database>) {}

  async create(input: CreateTaskInput): Promise<Task> {
    const now = new Date().toISOString();
    const id = generateId();
    const score = input.priority_score ?? 0;

    const task: NewTask = {
      id,
      project_id: input.project_id,
      title: input.title,
      description: input.description ?? null,
      task_type: input.task_type ?? 'improvement',
      status: 'backlog',
      priority_score: score,
      priority_label: score >= 80 ? 'critical' : score >= 60 ? 'high' : score >= 40 ? 'medium' : 'low',
      effort_estimate: input.effort_estimate ?? null,
      signal_count: 0,
      session_count: 0,
      implementation_branch: null,
      implementation_pr_url: null,
      implementation_pr_number: null,
      deployed_at: null,
      baseline_signal_rate: null,
      current_signal_rate: null,
      impact_score: null,
      measurement_started_at: null,
      measurement_completed_at: null,
      created_at: now,
      updated_at: now,
    };

    await this.db.insertInto('tasks').values(task).execute();
    return task as Task;
  }

  async findById(id: string): Promise<Task | undefined> {
    return await this.db
      .selectFrom('tasks')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();
  }

  async list(options: ListTasksOptions): Promise<Task[]> {
    let query = this.db
      .selectFrom('tasks')
      .selectAll()
      .where('project_id', '=', options.project_id)
      .orderBy('priority_score', 'desc');

    if (options.status) {
      query = query.where('status', '=', options.status);
    }
    if (options.task_type) {
      query = query.where('task_type', '=', options.task_type);
    }
    if (options.min_priority !== undefined) {
      query = query.where('priority_score', '>=', options.min_priority);
    }
    if (options.limit) {
      query = query.limit(options.limit);
    }
    if (options.offset) {
      query = query.offset(options.offset);
    }

    return await query.execute();
  }

  async listReady(projectId: string, limit: number = 10): Promise<Task[]> {
    return await this.db
      .selectFrom('tasks')
      .selectAll()
      .where('project_id', '=', projectId)
      .where('status', '=', 'ready')
      .orderBy('priority_score', 'desc')
      .limit(limit)
      .execute();
  }

  async countByProject(projectId: string, status?: string): Promise<number> {
    let query = this.db
      .selectFrom('tasks')
      .select(({ fn }) => fn.countAll<number>().as('count'))
      .where('project_id', '=', projectId);

    if (status) {
      query = query.where('status', '=', status);
    }

    const result = await query.executeTakeFirst();
    return result?.count ?? 0;
  }

  async update(id: string, data: Partial<TaskUpdate>): Promise<void> {
    await this.db
      .updateTable('tasks')
      .set({ ...data, updated_at: new Date().toISOString() })
      .where('id', '=', id)
      .execute();
  }

  async updateStatus(id: string, status: string): Promise<void> {
    const updates: Partial<TaskUpdate> = { status };
    if (status === 'deployed') {
      updates.deployed_at = new Date().toISOString();
    }
    await this.update(id, updates);
  }

  async recalculateEvidence(taskId: string): Promise<void> {
    // Count linked signals
    const signalResult = await this.db
      .selectFrom('task_signals')
      .select(({ fn }) => fn.countAll<number>().as('count'))
      .where('task_id', '=', taskId)
      .executeTakeFirst();

    // Count distinct sessions
    const sessionResult = await this.db
      .selectFrom('signals')
      .innerJoin('task_signals', 'task_signals.signal_id', 'signals.id')
      .select(({ fn }) => fn.count<number>('signals.session_id').distinct().as('count'))
      .where('task_signals.task_id', '=', taskId)
      .executeTakeFirst();

    await this.db
      .updateTable('tasks')
      .set({
        signal_count: signalResult?.count ?? 0,
        session_count: sessionResult?.count ?? 0,
        updated_at: new Date().toISOString(),
      })
      .where('id', '=', taskId)
      .execute();
  }

  async delete(id: string): Promise<void> {
    await this.db.deleteFrom('tasks').where('id', '=', id).execute();
  }
}
