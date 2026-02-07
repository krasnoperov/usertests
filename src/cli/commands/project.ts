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

export async function handleProjectCommand(subcommand: string | undefined, parsed: ParsedArgs): Promise<void> {
  if (!subcommand || hasHelpFlag(parsed) || subcommand === 'help' || subcommand === '--help' || subcommand === '-h') {
    printProjectHelp();
    return;
  }

  const env = parseEnvironment(parsed);

  switch (subcommand) {
    case 'list': {
      assertNoExtraPositionals(parsed, 0);
      const data = await requestJson({ env, method: 'GET', path: '/api/projects' });
      printOutput(data, parsed);
      return;
    }

    case 'create': {
      assertNoExtraPositionals(parsed, 0);
      const name = requireOption(parsed, 'name');
      const body: Record<string, unknown> = {
        name,
      };

      if (parsed.options.description && parsed.options.description !== 'true') {
        body.description = parsed.options.description;
      }
      if (parsed.options.repo && parsed.options.repo !== 'true') {
        body.github_repo_url = parsed.options.repo;
      }

      const data = await requestJson({
        env,
        method: 'POST',
        path: '/api/projects',
        body,
      });
      printOutput(data, parsed);
      return;
    }

    case 'get': {
      const projectId = requirePositional(parsed, 0, '<projectId>');
      assertNoExtraPositionals(parsed, 1);
      const data = await requestJson({
        env,
        method: 'GET',
        path: `/api/projects/${encodeURIComponent(projectId)}`,
      });
      printOutput(data, parsed);
      return;
    }

    case 'update': {
      const projectId = requirePositional(parsed, 0, '<projectId>');
      assertNoExtraPositionals(parsed, 1);

      const body: Record<string, unknown> = {};
      if (parsed.options.name && parsed.options.name !== 'true') {
        body.name = parsed.options.name;
      }
      if (parsed.options.description && parsed.options.description !== 'true') {
        body.description = parsed.options.description;
      }
      if (parsed.options.repo && parsed.options.repo !== 'true') {
        body.github_repo_url = parsed.options.repo;
      }
      if (parsed.options.branch && parsed.options.branch !== 'true') {
        body.github_default_branch = parsed.options.branch;
      }

      if (Object.keys(body).length === 0) {
        fail('No fields to update. Provide at least one of: --name, --description, --repo, --branch');
      }

      const data = await requestJson({
        env,
        method: 'PATCH',
        path: `/api/projects/${encodeURIComponent(projectId)}`,
        body,
      });
      printOutput(data, parsed);
      return;
    }

    default:
      fail(`Unknown project command: ${subcommand}`);
  }
}

export function printProjectHelp(): void {
  console.log(`
Usage:
  npm run cli project <command> [options]

Commands:
  list
  create --name <name> [--description <text>] [--repo <url>]
  get <projectId>
  update <projectId> [--name <name>] [--description <text>] [--repo <url>] [--branch <name>]

Options:
  --env <env>                stage | production | local
  --json                     JSON output

Examples:
  npm run cli project list --env stage
  npm run cli project create --name "Demo" --description "Smoke test"
  npm run cli project update proj_123 --repo https://github.com/acme/app --branch main
`);
}
