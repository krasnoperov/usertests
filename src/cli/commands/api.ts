import type { ParsedArgs } from '../lib/types';
import {
  assertNoExtraPositionals,
  getBooleanOption,
  getOptionValues,
  hasHelpFlag,
  parseEnvironment,
  parseHeaderPairs,
  parseJsonOrFile,
  requirePositional,
} from '../lib/args';
import { fail } from '../lib/errors';
import { requestRaw } from '../lib/http';
import { printOutput } from '../lib/output';

const ALLOWED_METHODS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']);

export async function handleApiCommand(parsed: ParsedArgs): Promise<void> {
  if (hasHelpFlag(parsed) || parsed.positionals[0] === 'help') {
    printApiHelp();
    return;
  }

  const method = requirePositional(parsed, 0, '<METHOD>').toUpperCase();
  const path = requirePositional(parsed, 1, '<PATH>');
  assertNoExtraPositionals(parsed, 2);

  if (!ALLOWED_METHODS.has(method)) {
    fail(`Unsupported METHOD "${method}".`);
  }

  const env = parseEnvironment(parsed);
  const headers = parseHeaderPairs(getOptionValues(parsed, 'header'));

  const key = parsed.options.key && parsed.options.key !== 'true'
    ? parsed.options.key
    : undefined;

  const dataValue = parsed.options.data;
  const body = dataValue && dataValue !== 'true'
    ? await parseJsonOrFile(dataValue, '--data')
    : undefined;

  const authMode = getBooleanOption(parsed, 'no-auth')
    ? 'none'
    : 'optional';

  const response = await requestRaw({
    env,
    method,
    path,
    body,
    headers,
    authMode,
    projectKey: key,
  });

  const raw = getBooleanOption(parsed, 'raw');
  if (raw) {
    if (response.text.length > 0) {
      console.log(response.text);
    }

    if (!response.ok) {
      fail(`HTTP ${response.status}: ${extractApiError(response.json, response.text)}`);
    }
    return;
  }

  if (!response.ok) {
    fail(`HTTP ${response.status}: ${extractApiError(response.json, response.text)}`);
  }

  if (response.json !== null) {
    printOutput(response.json, parsed);
    return;
  }

  if (response.text.length > 0) {
    console.log(response.text);
  }
}

export function printApiHelp(): void {
  console.log(`
Usage:
  npm run cli api <METHOD> <PATH> [options]

Options:
  --data <json|@file>         Request JSON body
  --header <k:v>              Extra header (repeatable)
  --key <projectKey>          Adds X-Project-Key header (SDK endpoints)
  --env <env>                 stage | production | local
  --raw                       Print raw response body
  --json                      Print JSON response body
  --no-auth                   Do not inject bearer token

Examples:
  npm run cli api GET /api/projects
  npm run cli api POST /api/projects --data '{"name":"Demo"}'
  npm run cli api POST /api/sdk/interview/ses_123/start --key pk_live_xxx --raw
`);
}

function extractApiError(json: unknown, text: string): string {
  if (json && typeof json === 'object') {
    const error = (json as Record<string, unknown>).error;
    if (typeof error === 'string' && error.length > 0) {
      return error;
    }

    const message = (json as Record<string, unknown>).message;
    if (typeof message === 'string' && message.length > 0) {
      return message;
    }
  }

  return text.trim() || 'Request failed';
}
