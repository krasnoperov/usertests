import type { CliEnvironment, ParsedArgs } from '../lib/types';
import { DEFAULT_ENVIRONMENT, loadStoredConfig } from '../lib/config';
import { getBooleanOption, hasHelpFlag, parseEnvironment } from '../lib/args';
import { fail } from '../lib/errors';
import { requestRaw } from '../lib/http';
import { handleLogin } from './login';
import { handleLogout } from './logout';

export async function handleAuthCommand(subcommand: string | undefined, parsed: ParsedArgs): Promise<void> {
  if (!subcommand || hasHelpFlag(parsed) || subcommand === 'help' || subcommand === '--help' || subcommand === '-h') {
    printAuthHelp();
    return;
  }

  switch (subcommand) {
    case 'login':
      await handleLogin(parsed);
      return;
    case 'logout':
      await handleLogout(parsed);
      return;
    case 'whoami':
      await handleWhoami(parsed);
      return;
    default:
      fail(`Unknown auth command: ${subcommand}`);
  }
}

export function printAuthHelp(): void {
  console.log(`
Usage:
  npm run cli auth <command> [options]

Commands:
  login [--env <env>]        Authenticate and store bearer token
  logout [--env <env>]       Remove credentials (or all envs if omitted)
  whoami [--env <env>]       Show current authenticated user/profile

Options:
  --env <env>                stage | production | local (default: ${DEFAULT_ENVIRONMENT})
  --local                    Shortcut for --env local
  --json                     JSON output (whoami only)
  --no-verify                Skip server-side token verification (whoami)

Examples:
  npm run cli auth login --env stage
  npm run cli auth logout --env production
  npm run cli auth whoami --env stage
`);
}

async function handleWhoami(parsed: ParsedArgs): Promise<void> {
  const env = parseEnvironment(parsed);
  const config = await loadStoredConfig(env);

  if (!config) {
    fail(`Not authenticated for environment "${env}". Run "npm run cli auth login --env ${env}" first.`);
  }

  if (config.token.expiresAt <= Date.now()) {
    fail(`Stored token for environment "${env}" is expired. Run "npm run cli auth login --env ${env}" again.`);
  }

  const shouldVerify = !getBooleanOption(parsed, 'no-verify');
  const verified = shouldVerify ? await verifyToken(env) : null;

  if (parsed.options.json === 'true') {
    console.log(JSON.stringify({ ...config, verified }, null, 2));
    return;
  }

  const user = asRecord(config.user);
  const name = typeof user?.name === 'string' ? user.name : 'unknown';
  const email = typeof user?.email === 'string' ? user.email : 'unknown';

  console.log(`environment: ${env}`);
  console.log(`base_url: ${config.baseUrl}`);
  console.log(`name: ${name}`);
  console.log(`email: ${email}`);
  console.log(`token_expires_at: ${new Date(config.token.expiresAt).toISOString()}`);
  if (verified !== null) {
    console.log(`verified: ${verified ? 'yes' : 'no'}`);
  }
}

async function verifyToken(env: CliEnvironment): Promise<boolean> {
  const response = await requestRaw({
    env,
    method: 'GET',
    path: '/api/projects',
    authMode: 'required',
  });

  if (!response.ok) {
    const message = response.text.trim() || 'Token validation failed';
    fail(`Unable to verify token with server (${response.status}): ${message}`);
  }

  return true;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}
