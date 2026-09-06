import { describe, it, expect } from 'vitest';
import { formatTerminalTable, formatMarkdownSummary, formatGitHubJobSummary } from '../src/formatter.js';
import { VerifyReport } from '../src/types.js';

describe('Formatters', () => {
  const sampleReport: VerifyReport = {
    timestamp: '2026-09-05T00:00:00.000Z',
    cwd: '/workspace',
    results: [
      {
        id: 'claim-1',
        type: 'file_written',
        status: 'upheld',
        claimSummary: 'path: README.md',
        evidenceSummary: 'exists (size: 100 B)',
      },
      {
        id: 'claim-2',
        type: 'tests_pass',
        status: 'unmet',
        claimSummary: 'cmd: pytest, passed: 5',
        evidenceSummary: 'exit: 1, passed: 3, failed: 2',
        details: 'Command exited with non-zero code 1',
      },
      {
        id: 'unclaimed-1',
        type: 'unclaimed_file',
        status: 'unclaimed',
        claimSummary: '(none)',
        evidenceSummary: 'unclaimed file written/modified: src/temp.ts',
        details: "File 'src/temp.ts' was modified or created in git status but not claimed",
      },
    ],
    summary: {
      total: 3,
      upheld: 1,
      unmet: 1,
      unclaimed: 1,
    },
    hasUnmet: true,
  };

  it('formats terminal table output for multi-path claims', () => {
    const multiPathReport: VerifyReport = {
      timestamp: '2026-09-05T00:00:00.000Z',
      cwd: '/workspace',
      results: [
        {
          id: 'claim-1',
          type: 'file_written',
          status: 'unmet',
          claimSummary: 'paths: [src/a.ts, src/b.ts]',
          evidenceSummary: '1/2 paths upheld (src/a.ts: upheld, src/b.ts: unmet)',
          details: "File 'src/b.ts' was not found",
          paths: [
            { path: 'src/a.ts', status: 'upheld', exists: true, modifiedThisRun: true },
            { path: 'src/b.ts', status: 'unmet', exists: false, details: "File 'src/b.ts' was not found" },
          ],
        },
      ],
      summary: { total: 1, upheld: 0, unmet: 1, unclaimed: 0 },
      hasUnmet: true,
    };
    const table = formatTerminalTable(multiPathReport);
    expect(table).toContain('paths: [src/a.ts, src/b.ts]');
    expect(table).toContain('1/2 paths upheld');
    expect(table).toContain("File 'src/b.ts' was not found");
  });

  it('formats terminal table output', () => {
    const table = formatTerminalTable(sampleReport);
    expect(table).toContain('Upheld — Claims vs Evidence');
    expect(table).toContain('UPHELD');
    expect(table).toContain('UNMET');
    expect(table).toContain('UNCLAIMED');
    expect(table).toContain('Upheld:    1');
    expect(table).toContain('Unmet:     1');
  });

  it('formats markdown summary output', () => {
    const markdown = formatMarkdownSummary(sampleReport);
    expect(markdown).toContain('### Upheld — Claims vs Evidence');
    expect(markdown).toContain('✅ **Upheld**');
    expect(markdown).toContain('❌ **Unmet**');
    expect(markdown).toContain('⚠️ **Unclaimed**');
  });

  it('formats GitHub Action job summary', () => {
    const summary = formatGitHubJobSummary(sampleReport);
    expect(summary).toContain('## Upheld — Claims vs evidence');
    expect(summary).toContain('✅ **Upheld**');
    expect(summary).toContain('❌ **Unmet**');
  });
});
