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

  it('runs upheld verify with multi-path upheld fixture successfully', async () => {
    const code = await runCli([
      'verify',
      '--strict',
      resolve(fixturesDir, 'claims-multipath-upheld.json'),
      '--cwd',
      resolve(__dirname, '..'),
      '--no-unclaimed',
      '--since',
      '0',
    ]);
    expect(code).toBe(0);
  });

  it('runs upheld verify with multi-path unmet fixture and returns code 1 under --strict', async () => {
    const code = await runCli([
      'verify',
      '--strict',
      resolve(fixturesDir, 'claims-multipath-unmet.json'),
      '--cwd',
      resolve(__dirname, '..'),
      '--no-unclaimed',
      '--since',
      '0',
    ]);
    expect(code).toBe(1);
  });

  it('supports --format sarif option', async () => {
    let output = '';
    const originalLog = console.log;
    console.log = (msg: string) => {
      output += msg + '\n';
    };

    try {
      const code = await runCli([
        'verify',
        '--format',
        'sarif',
        resolve(fixturesDir, 'claims-unmet.json'),
        '--cwd',
        resolve(__dirname, '..'),
        '--no-unclaimed',
        '--since',
        '0',
      ]);
      expect(code).toBe(0);
      const parsed = JSON.parse(output);
      expect(parsed.$schema).toContain('sarif');
      expect(parsed.runs[0].results.length).toBeGreaterThan(0);
    } finally {
      console.log = originalLog;
    }
  });

  it('supports --sarif shortcut flag', async () => {
    let output = '';
    const originalLog = console.log;
    console.log = (msg: string) => {
      output += msg + '\n';
    };

    try {
      const code = await runCli([
        'verify',
        '--sarif',
        resolve(fixturesDir, 'claims-unmet.json'),
        '--cwd',
        resolve(__dirname, '..'),
        '--no-unclaimed',
        '--since',
        '0',
      ]);
      expect(code).toBe(0);
      const parsed = JSON.parse(output);
      expect(parsed.version).toBe('2.1.0');
      expect(parsed.runs[0].tool.driver.name).toBe('upheld');
    } finally {
      console.log = originalLog;
    }
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

describe('Transcript Extraction CLI', () => {
  const fixturesDir = resolve(__dirname, '../examples/fixtures');

  it('runs upheld extract on transcript fixture and outputs valid claims json', async () => {
    const outPath = resolve(fixturesDir, 'temp-extracted.json');
    if (existsSync(outPath)) {
      unlinkSync(outPath);
    }

    const code = await runCli([
      'extract',
      resolve(fixturesDir, 'transcript-claude-honest.jsonl'),
      '--out',
      outPath,
    ]);
    expect(code).toBe(0);
    expect(existsSync(outPath)).toBe(true);

    // Verify the extracted claims file
    const verifyCode = await runCli([
      'verify',
      outPath,
      '--cwd',
      resolve(__dirname, '..'),
      '--no-unclaimed',
      '--since',
      '0',
    ]);
    expect(verifyCode).toBe(0);

    if (existsSync(outPath)) {
      unlinkSync(outPath);
    }
  });
});
