import { describe, it, expect, vi } from 'vitest';
import { resolve } from 'node:path';
import { writeFileSync, unlinkSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
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

  it('fails if --watch is provided without a claims file', async () => {
    const code = await runCli(['verify', '--watch']);
    expect(code).toBe(1);
  });

  it('shows help with -h or --help', async () => {
    const code1 = await runCli(['--help']);
    expect(code1).toBe(0);
    const code2 = await runCli(['-h']);
    expect(code2).toBe(0);
  });

  it('shows version with -v or --version', async () => {
    const code1 = await runCli(['--version']);
    expect(code1).toBe(0);
    const code2 = await runCli(['-v']);
    expect(code2).toBe(0);
  });
});

describe('Pre-commit Hook Script', () => {
  const hookScript = resolve(__dirname, '../examples/pre-commit/pre-commit.sh');
  const tempClaims = resolve(__dirname, 'temp-pre-commit-claims.json');

  it('runs pre-commit.sh successfully when claims are valid', () => {
    writeFileSync(tempClaims, JSON.stringify({
      claims: [
        { type: 'file_written', path: 'package.json' }
      ]
    }), 'utf-8');

    try {
      const output = execSync(`UPHELD_FLAGS="--no-unclaimed --since 0" bash "${hookScript}" "${tempClaims}"`, {
        cwd: resolve(__dirname, '..'),
        encoding: 'utf-8',
      });
      expect(output).toContain('Verifying claims');
    } finally {
      if (existsSync(tempClaims)) unlinkSync(tempClaims);
    }
  });

  it('exits 0 gracefully when no claims file is found', () => {
    const output = execSync(`bash "${hookScript}" "non_existent_claims.json"`, {
      cwd: resolve(__dirname, '..'),
      encoding: 'utf-8',
    });
    expect(output).toBe('');
  });

  it('fails and exits non-zero when claims are unmet under pre-commit.sh', () => {
    writeFileSync(tempClaims, JSON.stringify({
      claims: [
        { type: 'file_written', path: 'non_existent_file_xyz_123.txt' }
      ]
    }), 'utf-8');

    try {
      expect(() => {
        execSync(`bash "${hookScript}" "${tempClaims}"`, {
          cwd: resolve(__dirname, '..'),
          encoding: 'utf-8',
          stdio: 'pipe',
        });
      }).toThrow();
    } finally {
      if (existsSync(tempClaims)) unlinkSync(tempClaims);
    }
  });
});
