import type { ParsedArgs } from '../lib/types';
import {
  assertNoExtraPositionals,
  hasHelpFlag,
  parseEnvironment,
  requireOption,
  requirePositional,
} from '../lib/args';
import { fail } from '../lib/errors';
import { requestJson } from '../lib/http';
import { printOutput } from '../lib/output';

export async function handleSessionCommand(subcommand: string | undefined, parsed: ParsedArgs): Promise<void> {
  if (!subcommand || hasHelpFlag(parsed) || subcommand === 'help' || subcommand === '--help' || subcommand === '-h') {
    printSessionHelp();
    return;
  }

  const env = parseEnvironment(parsed);

  switch (subcommand) {
    case 'list': {
      const projectId = requirePositional(parsed, 0, '<projectId>');
      assertNoExtraPositionals(parsed, 1);
      const status = parsed.options.status;
      const query = status && status !== 'true' ? `?status=${encodeURIComponent(status)}` : '';

      const data = await requestJson({
        env,
        method: 'GET',
        path: `/api/projects/${encodeURIComponent(projectId)}/sessions${query}`,
      });
      printOutput(data, parsed);
      return;
    }

    case 'create': {
      const projectId = requirePositional(parsed, 0, '<projectId>');
      assertNoExtraPositionals(parsed, 1);

      const body: Record<string, unknown> = {};
      if (parsed.options.name && parsed.options.name !== 'true') {
        body.participant_name = parsed.options.name;
      }
      if (parsed.options.email && parsed.options.email !== 'true') {
        body.participant_email = parsed.options.email;
      }
      if (parsed.options.mode && parsed.options.mode !== 'true') {
        body.interview_mode = parsed.options.mode;
      }

      const data = await requestJson({
        env,
        method: 'POST',
        path: `/api/projects/${encodeURIComponent(projectId)}/sessions`,
        body,
      });
      printOutput(data, parsed);
      return;
    }

    case 'start': {
      const sessionId = requirePositional(parsed, 0, '<sessionId>');
      assertNoExtraPositionals(parsed, 1);
      const key = requireOption(parsed, 'key');

      const data = await requestJson({
        env,
        method: 'POST',
        path: `/api/sdk/interview/${encodeURIComponent(sessionId)}/start`,
        authMode: 'none',
        projectKey: key,
      });
      printOutput(data, parsed);
      return;
    }

    case 'send': {
      const sessionId = requirePositional(parsed, 0, '<sessionId>');
      assertNoExtraPositionals(parsed, 1);
      const key = requireOption(parsed, 'key');
      const message = requireOption(parsed, 'message');

      const data = await requestJson({
        env,
        method: 'POST',
        path: `/api/sdk/interview/${encodeURIComponent(sessionId)}/message`,
        authMode: 'none',
        projectKey: key,
        body: {
          content: message,
        },
      });
      printOutput(data, parsed);
      return;
    }

    case 'end': {
      const sessionId = requirePositional(parsed, 0, '<sessionId>');
      assertNoExtraPositionals(parsed, 1);
      const key = requireOption(parsed, 'key');

      const data = await requestJson({
        env,
        method: 'POST',
        path: `/api/sdk/interview/${encodeURIComponent(sessionId)}/end`,
        authMode: 'none',
        projectKey: key,
      });
      printOutput(data, parsed);
      return;
    }

    case 'get': {
      const projectId = requirePositional(parsed, 0, '<projectId>');
      const sessionId = requirePositional(parsed, 1, '<sessionId>');
      assertNoExtraPositionals(parsed, 2);

      const data = await requestJson({
        env,
        method: 'GET',
        path: `/api/projects/${encodeURIComponent(projectId)}/sessions/${encodeURIComponent(sessionId)}`,
      });
      printOutput(data, parsed);
      return;
    }

    case 'reprocess': {
      const projectId = requirePositional(parsed, 0, '<projectId>');
      const sessionId = requirePositional(parsed, 1, '<sessionId>');
      assertNoExtraPositionals(parsed, 2);

      const data = await requestJson({
        env,
        method: 'POST',
        path: `/api/projects/${encodeURIComponent(projectId)}/sessions/${encodeURIComponent(sessionId)}/reprocess`,
      });
      printOutput(data, parsed);
      return;
    }

    default:
      fail(`Unknown session command: ${subcommand}`);
  }
}

export function printSessionHelp(): void {
  console.log(`
Usage:
  npm run cli session <command> [options]

Commands:
  list <projectId> [--status <status>]
  create <projectId> [--name <participant>] [--email <email>] [--mode <voice|chat>]
  start <sessionId> --key <projectPublicOrSecretKey>
  send <sessionId> --key <projectPublicOrSecretKey> --message "..."
  end <sessionId> --key <projectPublicOrSecretKey>
  get <projectId> <sessionId>
  reprocess <projectId> <sessionId>

Options:
  --env <env>                stage | production | local
  --json                     JSON output

Examples:
  npm run cli session create proj_123 --name Alice
  npm run cli session start ses_123 --key pk_live_xxx
  npm run cli session send ses_123 --key pk_live_xxx --message "I can’t find checkout"
  npm run cli session list proj_123 --status active
`);
}
