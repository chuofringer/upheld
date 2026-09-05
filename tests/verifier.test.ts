import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execSync } from 'node:child_process';
import { verifyClaims } from '../src/verifier.js';
import { readClaimsFromFile } from '../src/claims.js';

describe('Verifier Engine', () => {
  const fixturesDir = resolve(__dirname, '../examples/fixtures');

  it('verifies passing/upheld claims fixture', async () => {
    const claims = await readClaimsFromFile(resolve(fixturesDir, 'claims-upheld.json'));
    const report = await verifyClaims(claims, {
      cwd: resolve(__dirname, '..'),
      detectUnclaimed: false,
    });

    expect(report.hasUnmet).toBe(false);
    expect(report.hasUnclaimed).toBe(false);
    expect(report.summary.upheld).toBe(3);
    expect(report.summary.unmet).toBe(0);
    expect(report.summary.unclaimed).toBe(0);
    expect(report.results.every((r) => r.status === 'upheld')).toBe(true);
  });

  it('verifies fixture with deliberate false claims showing UNMET', async () => {
    const claims = await readClaimsFromFile(resolve(fixturesDir, 'claims-unmet.json'));
    const report = await verifyClaims(claims, {
      cwd: resolve(__dirname, '..'),
      detectUnclaimed: false,
    });

    expect(report.hasUnmet).toBe(true);
    expect(report.summary.unmet).toBe(2);
    expect(report.summary.upheld).toBe(0);

    const fileClaim = report.results.find((r) => r.type === 'file_written');
    expect(fileClaim?.status).toBe('unmet');
    expect(fileClaim?.details).toContain('not found');

    const testClaim = report.results.find((r) => r.type === 'tests_pass');
    expect(testClaim?.status).toBe('unmet');
    expect(testClaim?.details).toContain('exited with non-zero code');
  });

  it('flags discrepancies when claimed metrics mismatch observed metrics', async () => {
    const claims = [
      {
        type: 'tests_pass' as const,
        cmd: "node -e 'console.log(\"Tests 2 passed (2)\"); process.exit(0);'",
        passed: 10, // Claimed 10 passed, but actually only 2
        total: 10,
      },
    ];

    const report = await verifyClaims(claims, {
      cwd: resolve(__dirname, '..'),
      detectUnclaimed: false,
    });

    expect(report.hasUnmet).toBe(true);
    expect(report.results[0].status).toBe('unmet');
    expect(report.results[0].details?.toLowerCase()).toContain('claimed 10 passed but observed 2');
  });

  describe('Unclaimed git working-tree changes detection', () => {
    let testRepoDir: string;

    const setupGitRepo = () => {
      const dir = mkdtempSync(join(tmpdir(), 'upheld-git-test-'));
      execSync('git init', { cwd: dir });
      execSync('git config user.email "test@example.com"', { cwd: dir });
      execSync('git config user.name "Test Runner"', { cwd: dir });
      writeFileSync(join(dir, 'initial.txt'), 'initial content\n');
      execSync('git add initial.txt && git commit -m "initial commit"', { cwd: dir });
      return dir;
    };

    it('identifies unclaimed modified and untracked files', async () => {
      testRepoDir = setupGitRepo();
      try {
        // Create modified tracked file and untracked file
        writeFileSync(join(testRepoDir, 'initial.txt'), 'modified content\n');
        writeFileSync(join(testRepoDir, 'untracked.ts'), 'export const x = 1;\n');
        writeFileSync(join(testRepoDir, 'claimed.ts'), 'export const y = 2;\n');

        const claims = [
          {
            type: 'file_written' as const,
            path: 'claimed.ts',
          },
        ];

        const report = await verifyClaims(claims, {
          cwd: testRepoDir,
          detectUnclaimed: true,
        });

        expect(report.hasUnmet).toBe(false);
        expect(report.hasUnclaimed).toBe(true);
        expect(report.summary.upheld).toBe(1);
        expect(report.summary.unclaimed).toBe(2);

        const unclaimedResults = report.results.filter((r) => r.status === 'unclaimed');
        expect(unclaimedResults).toHaveLength(2);

        const unclaimedSummaries = unclaimedResults.map((r) => r.evidenceSummary);
        expect(unclaimedSummaries).toContain('unclaimed file written/modified: initial.txt');
        expect(unclaimedSummaries).toContain('unclaimed file written/modified: untracked.ts');
        expect(unclaimedSummaries).not.toContain('unclaimed file written/modified: claimed.ts');
      } finally {
        rmSync(testRepoDir, { recursive: true, force: true });
      }
    });

    it('marks all changes upheld when all git changes are claimed', async () => {
      testRepoDir = setupGitRepo();
      try {
        writeFileSync(join(testRepoDir, 'newfile.ts'), 'export const z = 3;\n');

        const claims = [
          {
            type: 'file_written' as const,
            path: 'newfile.ts',
          },
        ];

        const report = await verifyClaims(claims, {
          cwd: testRepoDir,
          detectUnclaimed: true,
        });

        expect(report.hasUnmet).toBe(false);
        expect(report.hasUnclaimed).toBe(false);
        expect(report.summary.upheld).toBe(1);
        expect(report.summary.unclaimed).toBe(0);
      } finally {
        rmSync(testRepoDir, { recursive: true, force: true });
      }
    });
  });
});
