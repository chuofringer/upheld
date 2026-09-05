import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { lintDiffString, parseUnifiedDiff, isTestFile } from '../src/linter.js';

describe('Diff Linter Engine & Patterns', () => {
  const fixturesDir = resolve(__dirname, '../examples/fixtures');

  it('detects isTestFile accurately', () => {
    expect(isTestFile('tests/foo.test.ts')).toBe(true);
    expect(isTestFile('src/__tests__/bar.spec.js')).toBe(true);
    expect(isTestFile('test_model.py')).toBe(true);
    expect(isTestFile('src/utils.ts')).toBe(false);
    expect(isTestFile('src/app.py')).toBe(false);
  });

  it('parses unified diff hunks correctly', () => {
    const diffContent = readFileSync(resolve(fixturesDir, 'diff-clean.diff'), 'utf-8');
    const files = parseUnifiedDiff(diffContent);
    expect(files).toHaveLength(2);
    expect(files[0].newPath).toBe('src/utils.ts');
    expect(files[1].newPath).toBe('tests/utils.test.ts');
  });

  it('upholds clean diff with no tampering', () => {
    const diffContent = readFileSync(resolve(fixturesDir, 'diff-clean.diff'), 'utf-8');
    const result = lintDiffString(diffContent);
    expect(result.tampered).toBe(false);
    expect(result.findings).toHaveLength(0);
    expect(result.diffSummary.filesScanned).toBe(2);
  });

  // Pattern 1: .only / .skip / xit / xdescribe added
  it('detects Pattern 1: .only, .skip, and xit/xdescribe additions', () => {
    const diffContent = readFileSync(resolve(fixturesDir, 'diff-tampering-only-skip.diff'), 'utf-8');
    const result = lintDiffString(diffContent);
    expect(result.tampered).toBe(true);
    expect(result.findings.length).toBeGreaterThanOrEqual(2);

    const onlyFinding = result.findings.find((f) => f.snippet?.includes('it.only'));
    expect(onlyFinding).toBeDefined();
    expect(onlyFinding?.ruleId).toBe('focused-or-skipped-tests');
    expect(onlyFinding?.reason).toContain('.only or .skip');

    const xitFinding = result.findings.find((f) => f.snippet?.includes('xit'));
    expect(xitFinding).toBeDefined();
    expect(xitFinding?.ruleId).toBe('focused-or-skipped-tests');
  });

  // Pattern 2: Weakened assertions and deleted assertions
  it('detects Pattern 2: assert True and deleted assertions', () => {
    const diffContent = readFileSync(resolve(fixturesDir, 'diff-tampering-weakened-deleted.diff'), 'utf-8');
    const result = lintDiffString(diffContent);
    expect(result.tampered).toBe(true);

    const weakFinding = result.findings.find((f) => f.ruleId === 'weakened-assertions');
    expect(weakFinding).toBeDefined();
    expect(weakFinding?.reason).toContain('assert True');

    const deletedFindings = result.findings.filter((f) => f.ruleId === 'deleted-assertions');
    expect(deletedFindings.length).toBeGreaterThan(0);
    expect(deletedFindings[0].reason).toContain('Deleted assertion');
  });

  // Pattern 3: # noqa suppressions and changed test counts denominator
  it('detects Pattern 3: # noqa suppressions and decreased test count denominators', () => {
    const diffContent = readFileSync(resolve(fixturesDir, 'diff-tampering-noqa-denominator.diff'), 'utf-8');
    const result = lintDiffString(diffContent);
    expect(result.tampered).toBe(true);

    const noqaFindings = result.findings.filter((f) => f.ruleId === 'mass-lint-suppression');
    expect(noqaFindings.length).toBeGreaterThanOrEqual(2);

    const countFindings = result.findings.filter((f) => f.ruleId === 'changed-test-counts-denominator');
    expect(countFindings.length).toBeGreaterThanOrEqual(1);
    expect(countFindings[0].reason).toContain('denominator');
  });
});
