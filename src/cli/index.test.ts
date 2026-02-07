import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';

const runCli = (args: string[], cwd: string): Promise<{ stdout: string; stderr: string; code: number | null }> => {
  return new Promise((resolve, reject) => {
    const child = spawn(
      'node',
      ['--import', '@swc-node/register/esm-register', 'src/cli/index.ts', ...args],
      { cwd },
    );

    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr?.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', reject);
    child.on('close', (code) => {
      resolve({ stdout, stderr, code });
    });
  });
};

test('help command displays command groups and legacy aliases', async () => {
  const cwd = process.cwd();
  const result = await runCli(['help'], cwd);

  assert.equal(result.code, 0, `CLI exited with code ${result.code}; stderr: ${result.stderr}`);

  const expected = [
    'auth',
    'project',
    'session',
    'signal',
    'task',
    'screener',
    'implementation',
    'api',
    'login',
    'logout',
  ];

  for (const token of expected) {
    assert.ok(result.stdout.includes(token), `Root help should include "${token}"`);
  }
});

test('all group helps expose expected commands', async () => {
  const cwd = process.cwd();

  const cases: Array<{ args: string[]; tokens: string[] }> = [
    { args: ['auth', '--help'], tokens: ['login', 'logout', 'whoami'] },
    { args: ['project', '--help'], tokens: ['list', 'create', 'get', 'update'] },
    { args: ['session', '--help'], tokens: ['list', 'create', 'start', 'send', 'end', 'get'] },
    { args: ['signal', '--help'], tokens: ['list', 'link'] },
    { args: ['task', '--help'], tokens: ['list', 'get', 'update-status', 'spec', 'implement', 'measure'] },
    { args: ['screener', '--help'], tokens: ['list', 'create', 'get', 'respond'] },
    { args: ['implementation', '--help'], tokens: ['list', 'get'] },
    { args: ['api', '--help'], tokens: ['<METHOD>', '<PATH>', '--data', '--header', '--raw', '--json'] },
  ];

  for (const testCase of cases) {
    const result = await runCli(testCase.args, cwd);
    assert.equal(result.code, 0, `CLI exited with code ${result.code} for ${testCase.args.join(' ')}; stderr: ${result.stderr}`);

    for (const token of testCase.tokens) {
      assert.ok(result.stdout.includes(token), `Help for ${testCase.args[0]} should include "${token}"`);
    }
  }
});
