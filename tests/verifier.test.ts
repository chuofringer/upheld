import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { verifyClaims } from '../src/verifier.js';
import { readClaimsFromFile } from '../src/claims.js';

describe('Verifier Engine', () => {
  const fixturesDir = resolve(__dirname, '../examples/fixtures');

  it('verifies passing/upheld claims fixture with sinceTimestamp', async () => {
    const claims = await readClaimsFromFile(resolve(fixturesDir, 'claims-upheld.json'));
    const report = await verifyClaims(claims, {
      cwd: resolve(__dirname, '..'),
      detectUnclaimed: false,
      sinceTimestamp: 0,
    });

    expect(report.hasUnmet).toBe(false);
    expect(report.summary.upheld).toBe(2);
    expect(report.summary.unmet).toBe(0);
    expect(report.results.every((r) => r.status === 'upheld')).toBe(true);
  });

  it('verifies fixture with deliberate false claims showing UNMET', async () => {
    const claims = await readClaimsFromFile(resolve(fixturesDir, 'claims-unmet.json'));
    const report = await verifyClaims(claims, {
      cwd: resolve(__dirname, '..'),
      detectUnclaimed: false,
      sinceTimestamp: 0,
    });

    expect(report.hasUnmet).toBe(true);
    expect(report.summary.unmet).toBe(2);
    expect(report.summary.upheld).toBe(0);

    const fileClaim = report.results.find((r) => r.type === 'file_written');
    expect(fileClaim?.status).toBe('unmet');
    expect(fileClaim?.details).toContain('not found');

    const testClaim = report.results.find((r) => r.type === 'tests_pass');
    expect(testClaim?.status).toBe('unmet');
    expect(testClaim?.details?.toLowerCase()).toContain('claimed 5 passed but observed 2');
  });

  it('marks pre-existing unchanged files as unmet without recent write evidence', async () => {
    const claims = [
      {
        type: 'file_written' as const,
        path: 'LICENSE',
      },
    ];

    // since timestamp in the distant future -> file mtime will be before this, and git has LICENSE unmodified
    const report = await verifyClaims(claims, {
      cwd: resolve(__dirname, '..'),
      detectUnclaimed: false,
      sinceTimestamp: Date.now() + 100_000_000,
    });

    expect(report.hasUnmet).toBe(true);
    expect(report.results[0].status).toBe('unmet');
    expect(report.results[0].details).toContain('no evidence of write or change this run');
  });

  it('flags discrepancies when claimed metrics mismatch observed metrics', async () => {
    const claims = [
      {
        type: 'tests_pass' as const,
        cmd: 'npx vitest run --config examples/sample-project/vitest.config.ts',
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

  it('marks tests_pass as unmet when counts are claimed but parser cannot extract them', async () => {
    const claims = [
      {
        type: 'tests_pass' as const,
        cmd: 'echo "Tests completed successfully with 0 errors"',
        passed: 5,
        total: 5,
      },
    ];

    const report = await verifyClaims(claims, {
      cwd: resolve(__dirname, '..'),
      detectUnclaimed: false,
    });

    expect(report.hasUnmet).toBe(true);
    expect(report.results[0].status).toBe('unmet');
    expect(report.results[0].details).toContain('parser could not extract them from command output');
  });

  it('flags discrepancies when claimed skipped mismatch observed skipped', async () => {
    const claims = [
      {
        type: 'tests_pass' as const,
        cmd: "node -e 'console.log(\"Tests 1 failed | 2 passed | 3 skipped (6)\"); process.exit(1);'",
        passed: 2,
        failed: 1,
        skipped: 5, // Claimed 5 skipped, but actually 3
        total: 6,
      },
    ];

    const report = await verifyClaims(claims, {
      cwd: resolve(__dirname, '..'),
      detectUnclaimed: false,
    });

    expect(report.hasUnmet).toBe(true);
    expect(report.results[0].status).toBe('unmet');
    expect(report.results[0].details?.toLowerCase()).toContain('claimed 5 skipped but observed 3');
  });
});
