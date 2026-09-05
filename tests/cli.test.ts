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

  it('runs upheld lint-diff on clean diff in report mode (code 0)', async () => {
    const code = await runCli([
      'lint-diff',
      '--patch',
      resolve(fixturesDir, 'diff-clean.diff'),
    ]);
    expect(code).toBe(0);
  });

  it('runs upheld lint-diff on tampered diff in report mode (code 0)', async () => {
    const code = await runCli([
      'lint-diff',
      '--patch',
      resolve(fixturesDir, 'diff-tampering-only-skip.diff'),
    ]);
    expect(code).toBe(0);
  });

  it('runs upheld lint-diff --strict on tampered diff and exits non-zero (code 1)', async () => {
    const code = await runCli([
      'lint-diff',
      '--strict',
      '--patch',
      resolve(fixturesDir, 'diff-tampering-weakened-deleted.diff'),
    ]);
    expect(code).toBe(1);
  });

  it('runs upheld verify --lint-diff with patch option and flags tampering as UNMET in strict mode', async () => {
    const code = await runCli([
      'verify',
      '--strict',
      resolve(fixturesDir, 'claims-upheld.json'),
      '--lint-diff',
      '--patch',
      resolve(fixturesDir, 'diff-tampering-only-skip.diff'),
      '--cwd',
      resolve(__dirname, '..'),
      '--no-unclaimed',
    ]);
    expect(code).toBe(1);
  });
});
