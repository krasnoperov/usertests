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

export async function handleImplementationCommand(subcommand: string | undefined, parsed: ParsedArgs): Promise<void> {
  if (!subcommand || hasHelpFlag(parsed) || subcommand === 'help' || subcommand === '--help' || subcommand === '-h') {
    printImplementationHelp();
    return;
  }

  const env = parseEnvironment(parsed);

  switch (subcommand) {
    case 'list': {
      const projectId = requirePositional(parsed, 0, '<projectId>');
      assertNoExtraPositionals(parsed, 1);

      const data = await requestJson({
        env,
        method: 'GET',
        path: `/api/projects/${encodeURIComponent(projectId)}/implementations`,
      });
      printOutput(data, parsed);
      return;
    }

    case 'get': {
      const projectId = requirePositional(parsed, 0, '<projectId>');
      const implementationId = requirePositional(parsed, 1, '<implementationId>');
      assertNoExtraPositionals(parsed, 2);

      const data = await requestJson({
        env,
        method: 'GET',
        path: `/api/projects/${encodeURIComponent(projectId)}/implementations/${encodeURIComponent(implementationId)}`,
      });
      printOutput(data, parsed);
      return;
    }

    default:
      fail(`Unknown implementation command: ${subcommand}`);
  }
}

export function printImplementationHelp(): void {
  console.log(`
Usage:
  npm run cli implementation <command> [options]

Commands:
  list <projectId>
  get <projectId> <implementationId>

Options:
  --env <env>                stage | production | local
  --json                     JSON output

Examples:
  npm run cli implementation list proj_123
  npm run cli implementation get proj_123 impl_456
`);
}
