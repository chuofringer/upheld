import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { runBenchmark, formatBenchmarkTable } from '../scripts/benchmark-false-claims.js';

describe('False Claims Benchmark Script', () => {
  it('runs benchmark on fixtures and returns structured summary', async () => {
    const summary = await runBenchmark(resolve(__dirname, '..'));

    expect(summary.totalFixtures).toBe(2);
    expect(summary.totalClaims).toBe(5);
    expect(summary.unmetDetectedByUpheld).toBe(2);
    expect(summary.unmetDetectedByTrust).toBe(0);

    const trustCases = summary.cases.filter((c) => c.strategy === 'Trust Agent');
    const verifiedCases = summary.cases.filter((c) => c.strategy === 'Upheld (Verified)');

    expect(trustCases.length).toBe(2);
    expect(verifiedCases.length).toBe(2);

    // Verify Upheld caught the unmet claims in claims-unmet.json
    const unmetVerified = verifiedCases.find((c) => c.fixture.includes('claims-unmet.json'));
    expect(unmetVerified?.unmet).toBe(2);
    expect(unmetVerified?.upheld).toBe(0);

    // Verify Upheld confirmed all claims in claims-upheld.json
    const upheldVerified = verifiedCases.find((c) => c.fixture.includes('claims-upheld.json'));
    expect(upheldVerified?.unmet).toBe(0);
    expect(upheldVerified?.upheld).toBe(3);
  });

  it('formats benchmark table with expected columns and metrics', async () => {
    const summary = await runBenchmark(resolve(__dirname, '..'));
    const table = formatBenchmarkTable(summary);

    expect(table).toContain('Upheld — False-Claim Benchmark (Upheld vs. "Trust the Agent")');
    expect(table).toContain('Fixture / Strategy');
    expect(table).toContain('Claims');
    expect(table).toContain('Upheld');
    expect(table).toContain('Unmet');
    expect(table).toContain('Time (ms)');
    expect(table).toContain('Benchmark Summary:');
    expect(table).toContain('Unmet Claims Caught (Upheld): 2 / 5');
    expect(table).toContain('Unmet Claims Caught (Trust):  0 / 5');
  });
});
