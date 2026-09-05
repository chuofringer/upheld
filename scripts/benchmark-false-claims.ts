#!/usr/bin/env node

import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';
import { readClaimsFromFile } from '../src/claims.js';
import { verifyClaims } from '../src/verifier.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface BenchmarkCaseResult {
  fixture: string;
  strategy: 'Trust Agent' | 'Upheld (Verified)';
  totalClaims: number;
  upheld: number;
  unmet: number;
  durationMs: number;
}

export interface BenchmarkSummary {
  cases: BenchmarkCaseResult[];
  totalFixtures: number;
  totalClaims: number;
  unmetDetectedByUpheld: number;
  unmetDetectedByTrust: number;
  totalDurationMs: number;
}

export async function runBenchmark(repoRoot?: string): Promise<BenchmarkSummary> {
  const root = repoRoot ?? resolve(__dirname, '..');
  const fixturesDir = resolve(root, 'examples/fixtures');

  const fixtureFiles = [
    { name: 'claims-upheld.json', label: 'Passing claims (upheld)' },
    { name: 'claims-unmet.json', label: 'Contradicted claims (unmet)' },
  ];

  const caseResults: BenchmarkCaseResult[] = [];
  const startTotal = performance.now();

  for (const item of fixtureFiles) {
    const filePath = resolve(fixturesDir, item.name);
    const claims = await readClaimsFromFile(filePath);
    const totalClaims = claims.length;

    // 1. Strategy: "Trust the Agent" (Agent claims everything passes / was written)
    const t0Trust = performance.now();
    // In "trust the agent", all claimed items are assumed upheld with 0 unmet, 0 verification effort
    const t1Trust = performance.now();
    caseResults.push({
      fixture: `${item.name} [Trust Agent]`,
      strategy: 'Trust Agent',
      totalClaims,
      upheld: totalClaims,
      unmet: 0,
      durationMs: Number((t1Trust - t0Trust).toFixed(2)),
    });

    // 2. Strategy: "Upheld" (Empirical re-run and file verification)
    const t0Upheld = performance.now();
    const report = await verifyClaims(claims, {
      cwd: root,
      detectUnclaimed: false,
    });
    const t1Upheld = performance.now();

    caseResults.push({
      fixture: `${item.name} [Upheld]`,
      strategy: 'Upheld (Verified)',
      totalClaims,
      upheld: report.summary.upheld,
      unmet: report.summary.unmet,
      durationMs: Number((t1Upheld - t0Upheld).toFixed(2)),
    });
  }

  const endTotal = performance.now();

  const totalClaimsCount = caseResults
    .filter((c) => c.strategy === 'Upheld (Verified)')
    .reduce((acc, c) => acc + c.totalClaims, 0);

  const unmetDetectedByUpheld = caseResults
    .filter((c) => c.strategy === 'Upheld (Verified)')
    .reduce((acc, c) => acc + c.unmet, 0);

  const unmetDetectedByTrust = caseResults
    .filter((c) => c.strategy === 'Trust Agent')
    .reduce((acc, c) => acc + c.unmet, 0);

  return {
    cases: caseResults,
    totalFixtures: fixtureFiles.length,
    totalClaims: totalClaimsCount,
    unmetDetectedByUpheld,
    unmetDetectedByTrust,
    totalDurationMs: Number((endTotal - startTotal).toFixed(2)),
  };
}

export function formatBenchmarkTable(summary: BenchmarkSummary): string {
  const lines: string[] = [];

  lines.push('Upheld — False-Claim Benchmark (Upheld vs. "Trust the Agent")');
  lines.push('================================================================================');
  lines.push('');

  const headers = ['Fixture / Strategy', 'Strategy', 'Claims', 'Upheld', 'Unmet', 'Time (ms)'];
  const rows: string[][] = summary.cases.map((c) => [
    c.fixture,
    c.strategy,
    String(c.totalClaims),
    String(c.upheld),
    String(c.unmet),
    `${c.durationMs.toFixed(1)} ms`,
  ]);

  const colWidths = headers.map((h, i) => {
    const maxRowLen = rows.reduce((max, row) => Math.max(max, (row[i] || '').length), 0);
    return Math.max(h.length, maxRowLen);
  });

  const formatRow = (cols: string[]) =>
    cols.map((col, i) => (col || '').padEnd(colWidths[i])).join('  |  ');

  const divider = colWidths.map((w) => '-'.repeat(w)).join('--+--');

  lines.push(formatRow(headers));
  lines.push(divider);
  for (const row of rows) {
    lines.push(formatRow(row));
  }

  lines.push('');
  lines.push('Benchmark Summary:');
  lines.push(`  Total Fixture Cases:          ${summary.totalFixtures}`);
  lines.push(`  Total Claims Evaluated:       ${summary.totalClaims}`);
  lines.push(`  Unmet Claims Caught (Upheld): ${summary.unmetDetectedByUpheld} / ${summary.totalClaims}`);
  lines.push(`  Unmet Claims Caught (Trust):  ${summary.unmetDetectedByTrust} / ${summary.totalClaims} (Blind acceptance)`);
  lines.push(`  Total Benchmark Duration:     ${summary.totalDurationMs.toFixed(1)} ms`);

  return lines.join('\n');
}

async function main() {
  try {
    const summary = await runBenchmark();
    console.log(formatBenchmarkTable(summary));
  } catch (err: unknown) {
    console.error('Benchmark failed:', err);
    process.exit(1);
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main();
}
