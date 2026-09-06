import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { verifyClaims } from '../src/verifier.js';
import { readClaimsFromFile } from '../src/claims.js';
import { VerifyReport, VerificationResult } from '../src/types.js';

describe('JSON Output & Schema Stability', () => {
  const fixturesDir = resolve(__dirname, '../examples/fixtures');

  it('produces VerifyReport adhering to stable JSON schema structure', async () => {
    const claims = await readClaimsFromFile(resolve(fixturesDir, 'claims-upheld.json'));
    const report: VerifyReport = await verifyClaims(claims, {
      cwd: resolve(__dirname, '..'),
      detectUnclaimed: false,
    });

    // Verify top-level structure
    expect(report).toHaveProperty('timestamp');
    expect(typeof report.timestamp).toBe('string');
    expect(isNaN(Date.parse(report.timestamp))).toBe(false);

    expect(report).toHaveProperty('cwd');
    expect(typeof report.cwd).toBe('string');

    expect(report).toHaveProperty('results');
    expect(Array.isArray(report.results)).toBe(true);

    expect(report).toHaveProperty('summary');
    expect(typeof report.summary.total).toBe('number');
    expect(typeof report.summary.upheld).toBe('number');
    expect(typeof report.summary.unmet).toBe('number');
    expect(typeof report.summary.unclaimed).toBe('number');

    expect(report).toHaveProperty('hasUnmet');
    expect(typeof report.hasUnmet).toBe('boolean');

    // Verify individual result schema
    for (const result of report.results) {
      expect(result).toHaveProperty('id');
      expect(typeof result.id).toBe('string');

      expect(result).toHaveProperty('type');
      expect(['tests_pass', 'file_written', 'unclaimed_file']).toContain(result.type);

      expect(result).toHaveProperty('status');
      expect(['upheld', 'unmet', 'unclaimed']).toContain(result.status);

      expect(result).toHaveProperty('claimSummary');
      expect(typeof result.claimSummary).toBe('string');

      expect(result).toHaveProperty('evidenceSummary');
      expect(typeof result.evidenceSummary).toBe('string');

      if (result.details !== undefined) {
        expect(typeof result.details).toBe('string');
      }

      if (result.claim !== undefined) {
        expect(typeof result.claim).toBe('object');
      }
    }

    // JSON serialization round-trip stability
    const serialized = JSON.stringify(report);
    const deserialized = JSON.parse(serialized);
    expect(deserialized).toEqual(report);
  });

  it('preserves schema stability when unmet claims and unclaimed files are present', async () => {
    const claims = await readClaimsFromFile(resolve(fixturesDir, 'claims-unmet.json'));
    const report: VerifyReport = await verifyClaims(claims, {
      cwd: resolve(__dirname, '..'),
      detectUnclaimed: true,
    });

    expect(report.hasUnmet).toBe(true);
    expect(report.summary.unmet).toBeGreaterThan(0);
    expect(report.summary.total).toBe(
      report.summary.upheld + report.summary.unmet + report.summary.unclaimed
    );

    const unmetResult = report.results.find((r) => r.status === 'unmet');
    expect(unmetResult).toBeDefined();
    expect(unmetResult?.details).toBeDefined();
    expect(typeof unmetResult?.details).toBe('string');
  });
});
