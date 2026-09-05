import { describe, it, expect } from 'vitest';
import { formatTerminalTable, formatMarkdownSummary, formatGitHubJobSummary, formatGitHubAnnotations, formatSarif } from '../src/formatter.js';
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

  it('formats GitHub workflow annotations', () => {
    const annotations = formatGitHubAnnotations(sampleReport);
    expect(annotations).toContain('::error');
    expect(annotations).toContain('title=Unmet Claim%3A cmd%3A pytest%2C passed%3A 5');
    expect(annotations).toContain('::warning file=src/temp.ts,title=Unclaimed File Change');
  });

  it('formats file_written unmet claim with file attribute in annotation', () => {
    const fileUnmetReport: VerifyReport = {
      timestamp: '2026-09-05T00:00:00.000Z',
      cwd: '/workspace',
      results: [
        {
          id: 'claim-1',
          type: 'file_written',
          status: 'unmet',
          claim: { type: 'file_written', path: 'src/missing.ts' },
          claimSummary: 'path: src/missing.ts',
          evidenceSummary: 'does not exist',
          details: "File 'src/missing.ts' was not found",
        },
      ],
      summary: { total: 1, upheld: 0, unmet: 1, unclaimed: 0 },
      hasUnmet: true,
    };

    const annotations = formatGitHubAnnotations(fileUnmetReport);
    expect(annotations).toContain('::error file=src/missing.ts,title=Unmet Claim%3A path%3A src/missing.ts::File \'src/missing.ts\' was not found');
  });

  it('formats valid SARIF v2.1.0 output', () => {
    const sarifStr = formatSarif(sampleReport);
    const sarif = JSON.parse(sarifStr);
    expect(sarif.version).toBe('2.1.0');
    expect(sarif.runs).toHaveLength(1);
    expect(sarif.runs[0].tool.driver.name).toBe('upheld');
    expect(sarif.runs[0].results).toHaveLength(2); // 1 unmet + 1 unclaimed

    const unmetResult = sarif.runs[0].results.find((r: any) => r.ruleId === 'UPHELD001');
    expect(unmetResult).toBeDefined();
    expect(unmetResult.level).toBe('error');

    const unclaimedResult = sarif.runs[0].results.find((r: any) => r.ruleId === 'UPHELD002');
    expect(unclaimedResult).toBeDefined();
    expect(unclaimedResult.level).toBe('warning');
    expect(unclaimedResult.locations[0].physicalLocation.artifactLocation.uri).toBe('src/temp.ts');
  });
});
