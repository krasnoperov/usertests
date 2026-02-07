import type { ParsedArgs } from '../lib/types';
import {
  assertNoExtraPositionals,
  hasHelpFlag,
  parseEnvironment,
  requirePositional,
} from '../lib/args';
import { fail } from '../lib/errors';
import { requestJson } from '../lib/http';
import { printOutput } from '../lib/output';

export async function handleSignalCommand(subcommand: string | undefined, parsed: ParsedArgs): Promise<void> {
  if (!subcommand || hasHelpFlag(parsed) || subcommand === 'help' || subcommand === '--help' || subcommand === '-h') {
    printSignalHelp();
    return;
  }

  const env = parseEnvironment(parsed);

  switch (subcommand) {
    case 'list': {
      const projectId = requirePositional(parsed, 0, '<projectId>');
      assertNoExtraPositionals(parsed, 1);

      const query = buildSignalQuery(parsed);
      const data = await requestJson({
        env,
        method: 'GET',
        path: `/api/projects/${encodeURIComponent(projectId)}/signals${query}`,
      });
      printOutput(data, parsed);
      return;
    }

    case 'link': {
      const projectId = requirePositional(parsed, 0, '<projectId>');
      const signalId = requirePositional(parsed, 1, '<signalId>');
      const taskId = requirePositional(parsed, 2, '<taskId>');
      assertNoExtraPositionals(parsed, 3);

      const data = await requestJson({
        env,
        method: 'POST',
        path: `/api/projects/${encodeURIComponent(projectId)}/signals/${encodeURIComponent(signalId)}/link`,
        body: {
          task_id: taskId,
        },
      });
      printOutput(data, parsed);
      return;
    }

    default:
      fail(`Unknown signal command: ${subcommand}`);
  }
}

export function printSignalHelp(): void {
  console.log(`
Usage:
  npm run cli signal <command> [options]

Commands:
  list <projectId> [--type <type>] [--session <sessionId>] [--task <taskId>]
  link <projectId> <signalId> <taskId>

Options:
  --env <env>                stage | production | local
  --json                     JSON output

Examples:
  npm run cli signal list proj_123 --type friction
  npm run cli signal list proj_123 --session ses_123
  npm run cli signal link proj_123 sig_123 task_456
`);
}

function buildSignalQuery(parsed: ParsedArgs): string {
  const params = new URLSearchParams();

  if (parsed.options.type && parsed.options.type !== 'true') {
    params.set('type', parsed.options.type);
  }
  if (parsed.options.session && parsed.options.session !== 'true') {
    params.set('session_id', parsed.options.session);
  }
  if (parsed.options.task && parsed.options.task !== 'true') {
    params.set('task_id', parsed.options.task);
  }

  const query = params.toString();
  return query ? `?${query}` : '';
}
