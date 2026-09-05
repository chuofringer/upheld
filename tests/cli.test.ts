import { describe, it, expect } from 'vitest';
import { resolve, join } from 'node:path';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
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

  describe('--strict-unclaimed flag with temp git repo', () => {
    const setupGitRepo = () => {
      const dir = mkdtempSync(join(tmpdir(), 'upheld-cli-git-test-'));
      execSync('git init', { cwd: dir });
      execSync('git config user.email "test@example.com"', { cwd: dir });
      execSync('git config user.name "Test Runner"', { cwd: dir });
      writeFileSync(join(dir, 'README.md'), '# Test\n');
      execSync('git add README.md && git commit -m "initial commit"', { cwd: dir });
      return dir;
    };

    it('exits 0 by default when unclaimed changes exist in report mode', async () => {
      const testRepoDir = setupGitRepo();
      try {
        writeFileSync(join(testRepoDir, 'unclaimed.txt'), 'hello world\n');
        const claimsPath = join(testRepoDir, 'claims.json');
        writeFileSync(claimsPath, JSON.stringify([{ type: 'file_written', path: 'README.md' }]));

        const code = await runCli([
          'verify',
          claimsPath,
          '--cwd',
          testRepoDir,
        ]);
        expect(code).toBe(0);
      } finally {
        rmSync(testRepoDir, { recursive: true, force: true });
      }
    });

    it('exits 1 with --strict-unclaimed when unclaimed changes exist', async () => {
      const testRepoDir = setupGitRepo();
      try {
        writeFileSync(join(testRepoDir, 'unclaimed.txt'), 'hello world\n');
        const claimsPath = join(testRepoDir, 'claims.json');
        writeFileSync(claimsPath, JSON.stringify([{ type: 'file_written', path: 'README.md' }]));

        const code = await runCli([
          'verify',
          '--strict-unclaimed',
          claimsPath,
          '--cwd',
          testRepoDir,
        ]);
        expect(code).toBe(1);
      } finally {
        rmSync(testRepoDir, { recursive: true, force: true });
      }
    });

    it('exits 0 with --strict-unclaimed when all changes are claimed', async () => {
      const testRepoDir = setupGitRepo();
      try {
        writeFileSync(join(testRepoDir, 'claimed.txt'), 'hello world\n');
        const claimsPath = join(testRepoDir, 'claims.json');
        writeFileSync(claimsPath, JSON.stringify([
          { type: 'file_written', path: 'README.md' },
          { type: 'file_written', path: 'claimed.txt' },
          { type: 'file_written', path: 'claims.json' },
        ]));

        const code = await runCli([
          'verify',
          '--strict-unclaimed',
          claimsPath,
          '--cwd',
          testRepoDir,
        ]);
        expect(code).toBe(0);
      } finally {
        rmSync(testRepoDir, { recursive: true, force: true });
      }
    });
  });
});
