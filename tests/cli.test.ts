import { describe, it, expect, vi } from 'vitest';
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
      '--since',
      '0',
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
      '--since',
      '0',
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
      '--since',
      '0',
    ]);
    expect(code).toBe(1);
  });

  it('outputs JSON format when --format json or --json is passed', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runCli([
        'verify',
        '--format',
        'json',
        resolve(fixturesDir, 'claims-upheld.json'),
        '--cwd',
        resolve(__dirname, '..'),
        '--no-unclaimed',
        '--since',
        '0',
      ]);
      expect(code).toBe(0);
      expect(logSpy).toHaveBeenCalled();
      const output = logSpy.mock.calls[0][0];
      const parsed = JSON.parse(output);
      expect(parsed).toHaveProperty('results');
      expect(parsed).toHaveProperty('summary');
      expect(parsed.summary.upheld).toBe(2);
    } finally {
      logSpy.mockRestore();
    }
  });

  it('outputs markdown format when --format markdown or --markdown is passed', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runCli([
        'verify',
        '--markdown',
        resolve(fixturesDir, 'claims-upheld.json'),
        '--cwd',
        resolve(__dirname, '..'),
        '--no-unclaimed',
        '--since',
        '0',
      ]);
      expect(code).toBe(0);
      expect(logSpy).toHaveBeenCalled();
      const output = logSpy.mock.calls[0][0];
      expect(output).toContain('### Upheld — Claims vs Evidence');
    } finally {
      logSpy.mockRestore();
    }
  });

  it('handles --github-check flag gracefully when running locally without tokens', async () => {
    const code = await runCli([
      'verify',
      '--github-check',
      resolve(fixturesDir, 'claims-upheld.json'),
      '--cwd',
      resolve(__dirname, '..'),
      '--no-unclaimed',
      '--since',
      '0',
    ]);
    expect(code).toBe(0);
  });
});
