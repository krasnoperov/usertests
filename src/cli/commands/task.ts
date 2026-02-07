import type { ParsedArgs } from '../lib/types';
import {
  assertNoExtraPositionals,
  getBooleanOption,
  hasHelpFlag,
  parseEnvironment,
  requirePositional,
} from '../lib/args';
import { fail } from '../lib/errors';
import { requestJson } from '../lib/http';
import { printOutput } from '../lib/output';

export async function handleTaskCommand(subcommand: string | undefined, parsed: ParsedArgs): Promise<void> {
  if (!subcommand || hasHelpFlag(parsed) || subcommand === 'help' || subcommand === '--help' || subcommand === '-h') {
    printTaskHelp();
    return;
  }

  const env = parseEnvironment(parsed);

  switch (subcommand) {
    case 'list': {
      const projectId = requirePositional(parsed, 0, '<projectId>');
      assertNoExtraPositionals(parsed, 1);

      const params = new URLSearchParams();
      if (parsed.options.status && parsed.options.status !== 'true') {
        params.set('status', parsed.options.status);
      }

      const query = params.toString();
      const data = await requestJson({
        env,
        method: 'GET',
        path: `/api/projects/${encodeURIComponent(projectId)}/tasks${query ? `?${query}` : ''}`,
      });
      printOutput(data, parsed);
      return;
    }

    case 'get': {
      const projectId = requirePositional(parsed, 0, '<projectId>');
      const taskId = requirePositional(parsed, 1, '<taskId>');
      assertNoExtraPositionals(parsed, 2);

      const data = await requestJson({
        env,
        method: 'GET',
        path: `/api/projects/${encodeURIComponent(projectId)}/tasks/${encodeURIComponent(taskId)}`,
      });
      printOutput(data, parsed);
      return;
    }

    case 'update-status': {
      const projectId = requirePositional(parsed, 0, '<projectId>');
      const taskId = requirePositional(parsed, 1, '<taskId>');
      const status = requirePositional(parsed, 2, '<status>');
      assertNoExtraPositionals(parsed, 3);

      const data = await requestJson({
        env,
        method: 'PATCH',
        path: `/api/projects/${encodeURIComponent(projectId)}/tasks/${encodeURIComponent(taskId)}`,
        body: { status },
      });
      printOutput(data, parsed);
      return;
    }

    case 'spec': {
      const projectId = requirePositional(parsed, 0, '<projectId>');
      const taskId = requirePositional(parsed, 1, '<taskId>');
      assertNoExtraPositionals(parsed, 2);

      const data = await requestJson({
        env,
        method: 'POST',
        path: `/api/projects/${encodeURIComponent(projectId)}/tasks/${encodeURIComponent(taskId)}/spec`,
      });
      printOutput(data, parsed);
      return;
    }

    case 'implement': {
      const projectId = requirePositional(parsed, 0, '<projectId>');
      const taskId = requirePositional(parsed, 1, '<taskId>');
      assertNoExtraPositionals(parsed, 2);

      const dryRun = getBooleanOption(parsed, 'dry-run');
      const data = await requestJson({
        env,
        method: 'POST',
        path: `/api/projects/${encodeURIComponent(projectId)}/tasks/${encodeURIComponent(taskId)}/implement`,
        body: {
          dry_run: dryRun,
        },
      });
      printOutput(data, parsed);
      return;
    }

    case 'measure': {
      const projectId = requirePositional(parsed, 0, '<projectId>');
      const taskId = requirePositional(parsed, 1, '<taskId>');
      assertNoExtraPositionals(parsed, 2);

      const data = await requestJson({
        env,
        method: 'POST',
        path: `/api/projects/${encodeURIComponent(projectId)}/tasks/${encodeURIComponent(taskId)}/measure`,
      });
      printOutput(data, parsed);
      return;
    }

    default:
      fail(`Unknown task command: ${subcommand}`);
  }
}

export function printTaskHelp(): void {
  console.log(`
Usage:
  npm run cli task <command> [options]

Commands:
  list <projectId> [--status <status>]
  get <projectId> <taskId>
  update-status <projectId> <taskId> <status>
  spec <projectId> <taskId>
  implement <projectId> <taskId> [--dry-run]
  measure <projectId> <taskId>

Options:
  --env <env>                stage | production | local
  --json                     JSON output

Examples:
  npm run cli task list proj_123 --status open
  npm run cli task update-status proj_123 task_456 in_progress
  npm run cli task implement proj_123 task_456 --dry-run
  npm run cli task measure proj_123 task_456
`);
}
