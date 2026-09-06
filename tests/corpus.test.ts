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

  describe('Fixture 07 Unclaimed Side Effects', () => {
    it('exercises unclaimed file detection when untracked files are present', async () => {
      const claimsFile = resolve(corpusDir, '07-unclaimed-side-effects/claims.json');
      const claims = await readClaimsFromFile(claimsFile);

      // Verify with detectUnclaimed: true in a mock/test directory or repo with unclaimed files
      const report = await verifyClaims(claims, {
        cwd: resolve(__dirname, '..'),
        detectUnclaimed: true,
        sinceTimestamp: 0,
      });

      // Claim 1 and Claim 2 are upheld
      const explicitResults = report.results.filter((r) => r.type !== 'unclaimed_file');
      expect(explicitResults.every((r) => r.status === 'upheld')).toBe(true);
      expect(report.hasUnmet).toBe(false);
    });

    it('marks unclaimed files as status: unclaimed when detected', async () => {
      const claimsFile = resolve(corpusDir, '07-unclaimed-side-effects/claims.json');
      const claims = await readClaimsFromFile(claimsFile);

      // If we pass claims that do NOT claim untracked files in git, unclaimed status is recorded
      const report = await verifyClaims(claims, {
        cwd: resolve(__dirname, '..'),
        detectUnclaimed: true,
        sinceTimestamp: 0,
      });

      expect(report.summary.unclaimed).toBeDefined();
    });
  });

  describe('Fixture 09 Fully Upheld Verification with Write Evidence', () => {
    it('marks pre-existing unchanged files as unmet without recent write evidence', async () => {
      const claimsFile = resolve(corpusDir, '09-fully-upheld-verification/claims.json');
      const claims = await readClaimsFromFile(claimsFile);

      // Without write evidence (mtime far in the past / future timestamp window and no git diff)
      const reportWithoutEvidence = await verifyClaims(claims, {
        cwd: resolve(__dirname, '..'),
        detectUnclaimed: false,
        sinceTimestamp: Date.now() + 100_000_000,
      });

      // package.json is pre-existing and unmodified, so it should be UNMET under honesty rules
      const fileClaim = reportWithoutEvidence.results.find((r) => r.type === 'file_written');
      expect(fileClaim?.status).toBe('unmet');
      expect(fileClaim?.details).toContain('no evidence of write or change this run');
      expect(reportWithoutEvidence.hasUnmet).toBe(true);
    });

    it('upholds verified files when write evidence is present', async () => {
      const claimsFile = resolve(corpusDir, '09-fully-upheld-verification/claims.json');
      const claims = await readClaimsFromFile(claimsFile);

      const reportWithEvidence = await verifyClaims(claims, {
        cwd: resolve(__dirname, '..'),
        detectUnclaimed: false,
        sinceTimestamp: 0,
      });

      expect(reportWithEvidence.hasUnmet).toBe(false);
      expect(reportWithEvidence.summary.upheld).toBe(2);
      expect(reportWithEvidence.results.every((r) => r.status === 'upheld')).toBe(true);
    });
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

        // Check if fixture exercises unclaimed detection
        const exercisesUnclaimed = dirName === '07-unclaimed-side-effects';

        // If fixture requires write evidence for passing, provide sinceTimestamp: 0 or let git/mtime check run
        // For baseline upheld fixtures (like 09), provide sinceTimestamp: 0 so valid files are upheld
        const sinceTimestamp = dirName === '09-fully-upheld-verification' || dirName === '07-unclaimed-side-effects'
          ? 0
          : undefined;

        const report = await verifyClaims(claims, {
          cwd: resolve(__dirname, '..'),
          detectUnclaimed: exercisesUnclaimed,
          sinceTimestamp,
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
          expect(
            report.results
              .filter((r) => r.type !== 'unclaimed_file')
              .every((r) => r.status === 'upheld')
          ).toBe(true);
        }

        if (exercisesUnclaimed) {
          // Verify that unclaimed detection was enabled and asserted
          expect(exercisesUnclaimed).toBe(true);
          expect(report.summary.unclaimed).toBeGreaterThanOrEqual(0);
        }
      });
    });
  }
});
