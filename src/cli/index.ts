#!/usr/bin/env node
import process from 'node:process';
import { parseArgs } from './lib/args';
import { CliError } from './lib/errors';
import { DEFAULT_ENVIRONMENT } from './lib/config';
import { handleAuthCommand, printAuthHelp } from './commands/auth';
import { handleProjectCommand, printProjectHelp } from './commands/project';
import { handleSessionCommand, printSessionHelp } from './commands/session';
import { handleSignalCommand, printSignalHelp } from './commands/signal';
import { handleTaskCommand, printTaskHelp } from './commands/task';
import { handleScreenerCommand, printScreenerHelp } from './commands/screener';
import { handleImplementationCommand, printImplementationHelp } from './commands/implementation';
import { handleApiCommand, printApiHelp } from './commands/api';
import { handleLogin } from './commands/login';
import { handleLogout } from './commands/logout';

async function main() {
  const [, , command, ...rest] = process.argv;

  if (!command || command === 'help' || command === '--help' || command === '-h') {
    printRootHelp();
    return;
  }

  try {
    await dispatch(command, rest);
  } catch (error) {
    if (error instanceof CliError) {
      console.error(`Error: ${error.message}`);
      process.exitCode = error.exitCode;
      return;
    }

    if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
      process.exitCode = 1;
      return;
    }

    console.error('Error: Unexpected failure');
    process.exitCode = 1;
  }
}

async function dispatch(command: string, argv: string[]): Promise<void> {
  switch (command) {
    case 'auth': {
      const [subcommand, ...rest] = argv;
      const parsed = parseArgs(rest);
      await handleAuthCommand(subcommand, parsed);
      return;
    }

    case 'project': {
      const [subcommand, ...rest] = argv;
      const parsed = parseArgs(rest);
      await handleProjectCommand(subcommand, parsed);
      return;
    }

    case 'session': {
      const [subcommand, ...rest] = argv;
      const parsed = parseArgs(rest);
      await handleSessionCommand(subcommand, parsed);
      return;
    }

    case 'signal': {
      const [subcommand, ...rest] = argv;
      const parsed = parseArgs(rest);
      await handleSignalCommand(subcommand, parsed);
      return;
    }

    case 'task': {
      const [subcommand, ...rest] = argv;
      const parsed = parseArgs(rest);
      await handleTaskCommand(subcommand, parsed);
      return;
    }

    case 'screener': {
      const [subcommand, ...rest] = argv;
      const parsed = parseArgs(rest);
      await handleScreenerCommand(subcommand, parsed);
      return;
    }

    case 'implementation': {
      const [subcommand, ...rest] = argv;
      const parsed = parseArgs(rest);
      await handleImplementationCommand(subcommand, parsed);
      return;
    }

    case 'api': {
      const parsed = parseArgs(argv);
      await handleApiCommand(parsed);
      return;
    }

    // backward compatibility
    case 'login': {
      const parsed = parseArgs(argv);
      await handleLogin(parsed);
      return;
    }

    case 'logout': {
      const parsed = parseArgs(argv);
      await handleLogout(parsed);
      return;
    }

    case 'help': {
      printRootHelp();
      return;
    }

    default:
      printRootHelp();
      throw new CliError(`Unknown command: ${command}`);
  }
}

function printRootHelp() {
  console.log(`
UserTests CLI

Usage:
  npm run cli <group> <command> [options]

Command groups:
  auth              login/logout/whoami
  project           list/create/get/update projects
  session           list/create/start/send/end/get sessions
  signal            list/link signals
  task              list/get/update-status/spec/implement/measure tasks
  screener          list/create/get/respond screeners
  implementation    list/get implementation attempts
  api               generic HTTP passthrough command

Environment options:
  --env <env>       stage | production | local (default: ${DEFAULT_ENVIRONMENT})
  --local           shortcut for --env local

Examples:
  npm run cli auth login --env stage
  npm run cli project create --name "Demo"
  npm run cli session send ses_123 --key pk_live_xxx --message "Hello"
  npm run cli api GET /api/projects --json

Group help:
  npm run cli auth --help
  npm run cli project --help
  npm run cli session --help
  npm run cli signal --help
  npm run cli task --help
  npm run cli screener --help
  npm run cli implementation --help
  npm run cli api --help

Backward compatible aliases:
  npm run cli login
  npm run cli logout
`);
}

void main();

export {
  printRootHelp,
  printAuthHelp,
  printProjectHelp,
  printSessionHelp,
  printSignalHelp,
  printTaskHelp,
  printScreenerHelp,
  printImplementationHelp,
  printApiHelp,
};
