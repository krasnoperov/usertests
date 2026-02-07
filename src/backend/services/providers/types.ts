/**
 * Task Provider Interface (PRD-06)
 *
 * Defines the contract for external task sync providers (GitHub, Jira, Linear, etc.).
 */

import type { Task, TaskProviderState } from '../../../db/types';
import type { PiTaskSpec } from '../harness/spec-generator';

export interface TaskProvider {
  /** Provider name identifier (e.g. 'github', 'jira', 'linear') */
  name: string;

  /** Push a task to the external system */
  pushTask(task: Task, spec: PiTaskSpec, config: ProviderConfig): Promise<ProviderPushResult>;

  /** Handle incoming webhook from external system */
  handleWebhook(event: unknown): Promise<ProviderWebhookResult>;

  /** Check current state of a task in external system */
  getExternalState(providerState: TaskProviderState, config: ProviderConfig): Promise<string>;
}

export interface ProviderConfig {
  token: string;
  [key: string]: unknown;
}

export interface ProviderPushResult {
  externalId: string;
  externalUrl: string;
  externalStatus: string;
  metadata: Record<string, unknown>;
}

export interface ProviderWebhookResult {
  taskId: string | null;
  newStatus: string;
  coreStatusUpdate?: string;
  metadata?: Record<string, unknown>;
}
