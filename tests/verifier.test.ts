import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
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
    expect(report.summary.upheld).toBe(3);
    expect(report.summary.unmet).toBe(0);
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
});
