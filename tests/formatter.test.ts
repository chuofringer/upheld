import { describe, it, expect } from 'vitest';
import { formatTerminalTable, formatMarkdownSummary, formatGitHubJobSummary, formatSarifReport } from '../src/formatter.js';
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
        claim: {
          type: 'file_written',
          path: 'README.md',
        },
        claimSummary: 'path: README.md',
        evidenceSummary: 'exists (size: 100 B)',
      },
      {
        id: 'claim-2',
        type: 'tests_pass',
        status: 'unmet',
        claim: {
          type: 'tests_pass',
          cmd: 'pytest',
          passed: 5,
        },
        claimSummary: 'cmd: pytest, passed: 5',
        evidenceSummary: 'exit: 1, passed: 3, failed: 2',
        details: 'Command exited with non-zero code 1; claimed 5 passed but observed 3',
      },
      {
        id: 'claim-3',
        type: 'file_written',
        status: 'unmet',
        claim: {
          type: 'file_written',
          path: 'src/missing.ts',
        },
        claimSummary: 'path: src/missing.ts',
        evidenceSummary: 'does not exist',
        details: "File 'src/missing.ts' was not found",
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
      total: 4,
      upheld: 1,
      unmet: 2,
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
    expect(table).toContain('Unmet:     2');
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

  describe('formatSarifReport', () => {
    it('generates valid SARIF 2.1.0 schema structure mapping unmet claims', () => {
      const sarifJson = formatSarifReport(sampleReport);
      const sarif = JSON.parse(sarifJson);

      expect(sarif.$schema).toBe('https://json.schemastore.org/sarif-2.1.0.json');
      expect(sarif.version).toBe('2.1.0');
      expect(Array.isArray(sarif.runs)).toBe(true);
      expect(sarif.runs).toHaveLength(1);

      const run = sarif.runs[0];
      expect(run.tool.driver.name).toBe('upheld');
      expect(run.tool.driver.rules).toBeDefined();

      // Check schema sanity for rules
      for (const rule of run.tool.driver.rules) {
        expect(typeof rule.id).toBe('string');
        expect(typeof rule.name).toBe('string');
        expect(typeof rule.shortDescription?.text).toBe('string');
      }

      // Rules should include claim types that had unmet claims
      const ruleIds = run.tool.driver.rules.map((r: { id: string }) => r.id);
      expect(ruleIds).toContain('tests_pass');
      expect(ruleIds).toContain('file_written');

      // Results should only contain unmet claims (2 unmet in sampleReport)
      expect(Array.isArray(run.results)).toBe(true);
      expect(run.results).toHaveLength(2);

      const testResult = run.results.find((r: { ruleId: string }) => r.ruleId === 'tests_pass');
      expect(testResult).toBeDefined();
      expect(testResult.level).toBe('error');
      expect(testResult.message.text).toContain('Command exited with non-zero code 1');
      // No file location for tests_pass
      expect(testResult.locations).toBeUndefined();

      const fileResult = run.results.find((r: { ruleId: string }) => r.ruleId === 'file_written');
      expect(fileResult).toBeDefined();
      expect(fileResult.level).toBe('error');
      expect(fileResult.message.text).toContain("File 'src/missing.ts' was not found");
      expect(fileResult.locations).toHaveLength(1);
      expect(fileResult.locations[0].physicalLocation.artifactLocation.uri).toBe('src/missing.ts');
      expect(fileResult.locations[0].physicalLocation.artifactLocation.uriBaseId).toBe('%SRCROOT%');
      expect(fileResult.locations[0].physicalLocation.region.startLine).toBe(1);
      expect(fileResult.locations[0].physicalLocation.region.startColumn).toBe(1);
    });

    it('returns empty results array when no claims are unmet', () => {
      const cleanReport: VerifyReport = {
        timestamp: '2026-09-05T00:00:00.000Z',
        cwd: '/workspace',
        results: [
          {
            id: 'claim-1',
            type: 'file_written',
            status: 'upheld',
            claim: { type: 'file_written', path: 'README.md' },
            claimSummary: 'path: README.md',
            evidenceSummary: 'exists (size: 100 B)',
          },
        ],
        summary: { total: 1, upheld: 1, unmet: 0, unclaimed: 0 },
        hasUnmet: false,
      };

      const sarif = JSON.parse(formatSarifReport(cleanReport));
      expect(sarif.runs[0].results).toHaveLength(0);
    });
  });
});
