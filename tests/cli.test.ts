import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { runCli } from '../src/cli.js';

describe('CLI Integration', () => {
  const fixturesDir = resolve(__dirname, '../examples/fixtures');

  it('runs upheld verify in report mode on upheld fixture with exit code 0', async () => {
    const code = await runCli([
      'verify',
      resolve(fixturesDir, 'claims-upheld.json'),
      '--cwd',
      resolve(__dirname, '..'),
      '--no-unclaimed',
    ]);
    expect(code).toBe(0);
  });

  it('runs upheld verify in report mode on unmet fixture with exit code 0 (report mode)', async () => {
    const code = await runCli([
      'verify',
      resolve(fixturesDir, 'claims-unmet.json'),
      '--cwd',
      resolve(__dirname, '..'),
      '--no-unclaimed',
    ]);
    expect(code).toBe(0);
  });

  it('runs upheld verify with --strict on unmet fixture and exits non-zero (code 1)', async () => {
    const code = await runCli([
      'verify',
      '--strict',
      resolve(fixturesDir, 'claims-unmet.json'),
      '--cwd',
      resolve(__dirname, '..'),
      '--no-unclaimed',
    ]);
    expect(code).toBe(1);
  });

  it('runs upheld verify with --format annotations', async () => {
    const code = await runCli([
      'verify',
      '--format',
      'annotations',
      resolve(fixturesDir, 'claims-unmet.json'),
      '--cwd',
      resolve(__dirname, '..'),
      '--no-unclaimed',
    ]);
    expect(code).toBe(0);
  });

  it('runs upheld verify with --annotations shortcut', async () => {
    const code = await runCli([
      'verify',
      '--annotations',
      resolve(fixturesDir, 'claims-unmet.json'),
      '--cwd',
      resolve(__dirname, '..'),
      '--no-unclaimed',
    ]);
    expect(code).toBe(0);
  });

  it('runs upheld verify with --format sarif', async () => {
    const code = await runCli([
      'verify',
      '--format',
      'sarif',
      resolve(fixturesDir, 'claims-unmet.json'),
      '--cwd',
      resolve(__dirname, '..'),
      '--no-unclaimed',
    ]);
    expect(code).toBe(0);
  });

  it('runs upheld verify with --sarif shortcut', async () => {
    const code = await runCli([
      'verify',
      '--sarif',
      resolve(fixturesDir, 'claims-unmet.json'),
      '--cwd',
      resolve(__dirname, '..'),
      '--no-unclaimed',
    ]);
    expect(code).toBe(0);
  });
});
