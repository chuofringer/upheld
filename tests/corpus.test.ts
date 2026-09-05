import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { readdirSync, existsSync, readFileSync } from 'node:fs';
import { verifyClaims } from '../src/verifier.js';
import { readClaimsFromFile } from '../src/claims.js';

describe('False-Completion Fixture Corpus', () => {
  const corpusDir = resolve(__dirname, '../examples/corpus');
  const fixtureDirs = readdirSync(corpusDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  it('contains expected number of fixtures (8 to 12 fixtures)', () => {
    expect(fixtureDirs.length).toBeGreaterThanOrEqual(8);
    expect(fixtureDirs.length).toBeLessThanOrEqual(12);
  });

  for (const dirName of fixtureDirs) {
    describe(`Corpus Fixture: ${dirName}`, () => {
      const dirPath = resolve(corpusDir, dirName);
      const claimsFile = resolve(dirPath, 'claims.json');
      const expectedFile = resolve(dirPath, 'expected.md');

      it('has claims.json and expected.md', () => {
        expect(existsSync(claimsFile)).toBe(true);
        expect(existsSync(expectedFile)).toBe(true);
      });

      it('matches expected verification outcome', async () => {
        const claims = await readClaimsFromFile(claimsFile);
        const expectedContent = readFileSync(expectedFile, 'utf-8');

        const report = await verifyClaims(claims, {
          cwd: resolve(__dirname, '..'),
          detectUnclaimed: false,
        });

        // Determine if expected.md specifies Upheld or Unmet
        const isExpectedUnmet = /status\s*:\s*unmet/i.test(expectedContent);
        const isExpectedUpheld = /status\s*:\s*upheld/i.test(expectedContent);

        if (isExpectedUnmet) {
          expect(report.hasUnmet).toBe(true);
          expect(report.summary.unmet).toBeGreaterThan(0);
        } else if (isExpectedUpheld) {
          expect(report.hasUnmet).toBe(false);
          expect(report.summary.unmet).toBe(0);
          expect(report.results.every((r) => r.status === 'upheld')).toBe(true);
        }
      });
    });
  }
});
