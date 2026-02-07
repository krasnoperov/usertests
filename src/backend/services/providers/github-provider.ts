/**
 * GitHub Provider (PRD-06)
 *
 * Pushes tasks as GitHub Issues + PRs, tracks PR state via webhooks.
 * Extracts and reuses existing functions from harness/github-client.ts.
 */

import type { Task, TaskProviderState } from '../../../db/types';
import type { PiTaskSpec } from '../harness/spec-generator';
import { buildImplementationPrompt } from '../harness/spec-generator';
import {
  parseRepoUrl,
  createBranch,
  createPR,
  getPRStatus,
  buildPRBody,
  extractTaskIdFromBranch,
  type GitHubConfig,
} from '../harness/github-client';
import type {
  TaskProvider,
  ProviderConfig,
  ProviderPushResult,
  ProviderWebhookResult,
} from './types';

export interface GitHubProviderConfig extends ProviderConfig {
  token: string;
  repoUrl: string;
  defaultBranch: string;
}

export class GitHubProvider implements TaskProvider {
  name = 'github';

  async pushTask(task: Task, spec: PiTaskSpec, config: ProviderConfig): Promise<ProviderPushResult> {
    const ghConfig = config as GitHubProviderConfig;
    const parsed = parseRepoUrl(ghConfig.repoUrl);
    if (!parsed) {
      throw new Error(`Invalid GitHub repo URL: ${ghConfig.repoUrl}`);
    }

    const apiConfig: GitHubConfig = {
      token: ghConfig.token,
      owner: parsed.owner,
      repo: parsed.repo,
      defaultBranch: ghConfig.defaultBranch || 'main',
    };

    // Build branch name: usertests/<taskId>-<slug>
    const slug = task.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 40);
    const branchName = `usertests/${task.id}-${slug}`;

    // Create branch
    await createBranch(apiConfig, branchName);

    // Build PR body with user evidence
    const prBody = buildPRBody(
      task.title,
      task.id,
      spec.userQuotes,
      spec.acceptanceCriteria,
      buildImplementationPrompt(spec),
    );

    // Create PR
    const pr = await createPR(apiConfig, {
      title: `[UserTests] ${task.title}`,
      body: prBody,
      head: branchName,
      base: apiConfig.defaultBranch,
      labels: ['usertests', task.task_type],
    });

    return {
      externalId: String(pr.number),
      externalUrl: pr.url,
      externalStatus: 'pr_open',
      metadata: {
        branch: branchName,
        pr_number: pr.number,
      },
    };
  }

  async handleWebhook(event: unknown): Promise<ProviderWebhookResult> {
    const body = event as {
      action: string;
      pull_request: {
        number: number;
        merged: boolean;
        head: { ref: string };
      };
    };

    if (body.action !== 'closed' || !body.pull_request.merged) {
      return { taskId: null, newStatus: 'ignored' };
    }

    const branchName = body.pull_request.head.ref;
    const taskId = extractTaskIdFromBranch(branchName);

    if (!taskId) {
      return { taskId: null, newStatus: 'ignored' };
    }

    return {
      taskId,
      newStatus: 'merged',
      coreStatusUpdate: 'done',
      metadata: {
        pr_number: body.pull_request.number,
        merged_at: new Date().toISOString(),
      },
    };
  }

  async getExternalState(providerState: TaskProviderState, config: ProviderConfig): Promise<string> {
    const ghConfig = config as GitHubProviderConfig;
    const parsed = parseRepoUrl(ghConfig.repoUrl);
    if (!parsed) return 'unknown';

    const metadata = providerState.metadata_json ? JSON.parse(providerState.metadata_json) : {};
    const prNumber = metadata.pr_number;
    if (!prNumber) return providerState.external_status || 'unknown';

    const apiConfig: GitHubConfig = {
      token: ghConfig.token,
      owner: parsed.owner,
      repo: parsed.repo,
      defaultBranch: ghConfig.defaultBranch || 'main',
    };

    const pr = await getPRStatus(apiConfig, prNumber);
    if (pr.merged) return 'merged';
    return pr.state === 'closed' ? 'closed' : 'pr_open';
  }
}
