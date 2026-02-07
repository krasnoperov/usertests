import { injectable, inject } from 'inversify';
import type { Kysely } from 'kysely';
import type { Database, TaskMeasurement, NewTaskMeasurement } from '../db/types';
import { TYPES } from '../core/di-types';
import { generateId } from '../shared/id';

@injectable()
export class TaskMeasurementDAO {
  constructor(@inject(TYPES.Database) private db: Kysely<Database>) {}

  async create(input: {
    task_id: string;
    project_id: string;
    baseline_signal_rate: number;
    current_signal_rate: number;
    impact_score: number;
    sessions_analyzed: number;
    measurement_window_days: number;
  }): Promise<TaskMeasurement> {
    const now = new Date().toISOString();
    const row: NewTaskMeasurement = {
      id: generateId(),
      task_id: input.task_id,
      project_id: input.project_id,
      measured_at: now,
      baseline_signal_rate: input.baseline_signal_rate,
      current_signal_rate: input.current_signal_rate,
      impact_score: input.impact_score,
      sessions_analyzed: input.sessions_analyzed,
      measurement_window_days: input.measurement_window_days,
      created_at: now,
    };

    await this.db.insertInto('task_measurements').values(row).execute();
    return row as TaskMeasurement;
  }

  async findByTask(taskId: string): Promise<TaskMeasurement[]> {
    return await this.db
      .selectFrom('task_measurements')
      .selectAll()
      .where('task_id', '=', taskId)
      .orderBy('measured_at', 'desc')
      .execute();
  }

  async latest(taskId: string): Promise<TaskMeasurement | undefined> {
    return await this.db
      .selectFrom('task_measurements')
      .selectAll()
      .where('task_id', '=', taskId)
      .orderBy('measured_at', 'desc')
      .limit(1)
      .executeTakeFirst();
  }
}
