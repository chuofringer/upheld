import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { checkFileEvidence, checkPathEvidence, globToRegExp, matchGlobs } from '../src/checker.js';

describe('Checker and Glob Engine', () => {
  const rootDir = resolve(__dirname, '..');

  it('translates glob patterns to regex properly', () => {
    const re1 = globToRegExp('src/**/*.ts');
    expect(re1.test('src/index.ts')).toBe(true);
    expect(re1.test('src/runners/vitest.ts')).toBe(true);
    expect(re1.test('README.md')).toBe(false);

    const re2 = globToRegExp('*.json');
    expect(re2.test('package.json')).toBe(true);
    expect(re2.test('examples/sample-project/package.json')).toBe(false);

    const re3 = globToRegExp('examples/**/math.ts');
    expect(re3.test('examples/sample-project/src/math.ts')).toBe(true);
  });

  it('matches files matching globs in workspace', async () => {
    const matches = await matchGlobs('examples/sample-project/**/*.ts', rootDir);
    expect(matches).toContain('examples/sample-project/src/math.ts');
    expect(matches).toContain('examples/sample-project/tests/math.test.ts');
    expect(matches).toContain('examples/sample-project/vitest.config.ts');
    expect(matches).not.toContain('src/index.ts');
  });

  it('checks path evidence for non-existent file', async () => {
    const result = await checkPathEvidence('non_existent_file_xyz.ts', { cwd: rootDir });
    expect(result.status).toBe('unmet');
    expect(result.exists).toBe(false);
    expect(result.details).toContain('not found');
  });

  it('checks path evidence for existing file with sinceTimestamp 0', async () => {
    const result = await checkPathEvidence('package.json', { cwd: rootDir, sinceTimestamp: 0 });
    expect(result.status).toBe('upheld');
    expect(result.exists).toBe(true);
    expect(result.modifiedThisRun).toBe(true);
  });
});
