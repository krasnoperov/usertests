/**
 * Impact Tracker (PRD-06)
 *
 * Measures signal reduction after task deployment.
 */

import type { Kysely } from 'kysely';
import type { Database } from '../../../db/types';

export interface ImpactResult {
  taskId: string;
  baselineRate: number;
  currentRate: number;
  reductionPercent: number;
  sessionsAnalyzed: number;
  measurementDays: number;
}

/**
 * Calculate baseline signal rate for a task.
 * Looks at signal frequency in sessions before deployment.
 */
export async function calculateBaseline(
  db: Kysely<Database>,
  taskId: string,
  projectId: string,
): Promise<number> {
  // Get the task's signal types
  const taskSignals = await db
    .selectFrom('signals')
    .innerJoin('task_signals', 'task_signals.signal_id', 'signals.id')
    .select(['signals.signal_type'])
    .where('task_signals.task_id', '=', taskId)
    .execute();

  const signalTypes = [...new Set(taskSignals.map(s => s.signal_type))];
  if (signalTypes.length === 0) return 0;

  // Count total sessions
  const totalSessions = await db
    .selectFrom('sessions')
    .select(({ fn }) => fn.countAll<number>().as('count'))
    .where('project_id', '=', projectId)
    .where('status', '=', 'completed')
    .executeTakeFirst();

  const sessionCount = totalSessions?.count ?? 0;
  if (sessionCount === 0) return 0;

  // Count sessions that have these signal types
  const affectedSessions = await db
    .selectFrom('signals')
    .select(({ fn }) => fn.count<number>('session_id').distinct().as('count'))
    .where('project_id', '=', projectId)
    .where('signal_type', 'in', signalTypes)
    .executeTakeFirst();

  const affected = affectedSessions?.count ?? 0;

  return affected / sessionCount; // rate of sessions affected
}

/**
 * Measure impact after deployment.
 * Compares signal rates before vs after deployment date.
 */
export async function measureImpact(
  db: Kysely<Database>,
  taskId: string,
  projectId: string,
  deployedAt: string,
  measurementDays: number = 7,
): Promise<ImpactResult> {
  // Get the task's signal types
  const taskSignals = await db
    .selectFrom('signals')
    .innerJoin('task_signals', 'task_signals.signal_id', 'signals.id')
    .select(['signals.signal_type'])
    .where('task_signals.task_id', '=', taskId)
    .execute();

  const signalTypes = [...new Set(taskSignals.map(s => s.signal_type))];

  // Baseline: sessions completed BEFORE deployment
  const preSessions = await db
    .selectFrom('sessions')
    .select(({ fn }) => fn.countAll<number>().as('count'))
    .where('project_id', '=', projectId)
    .where('status', '=', 'completed')
    .where('completed_at', '<', deployedAt)
    .executeTakeFirst();

  const preSignals = signalTypes.length > 0 ? await db
    .selectFrom('signals')
    .select(({ fn }) => fn.countAll<number>().as('count'))
    .where('project_id', '=', projectId)
    .where('signal_type', 'in', signalTypes)
    .where('created_at', '<', deployedAt)
    .executeTakeFirst() : { count: 0 };

  const preSessionCount = preSessions?.count ?? 0;
  const preSignalCount = preSignals?.count ?? 0;
  const baselineRate = preSessionCount > 0 ? preSignalCount / preSessionCount : 0;

  // Current: sessions completed AFTER deployment
  const postSessions = await db
    .selectFrom('sessions')
    .select(({ fn }) => fn.countAll<number>().as('count'))
    .where('project_id', '=', projectId)
    .where('status', '=', 'completed')
    .where('completed_at', '>=', deployedAt)
    .executeTakeFirst();

  const postSignals = signalTypes.length > 0 ? await db
    .selectFrom('signals')
    .select(({ fn }) => fn.countAll<number>().as('count'))
    .where('project_id', '=', projectId)
    .where('signal_type', 'in', signalTypes)
    .where('created_at', '>=', deployedAt)
    .executeTakeFirst() : { count: 0 };

  const postSessionCount = postSessions?.count ?? 0;
  const postSignalCount = postSignals?.count ?? 0;
  const currentRate = postSessionCount > 0 ? postSignalCount / postSessionCount : 0;

  // Calculate reduction
  const reductionPercent = baselineRate > 0
    ? ((baselineRate - currentRate) / baselineRate) * 100
    : 0;

  return {
    taskId,
    baselineRate,
    currentRate,
    reductionPercent,
    sessionsAnalyzed: preSessionCount + postSessionCount,
    measurementDays,
  };
}
