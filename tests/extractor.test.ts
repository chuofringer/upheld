import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { readFile } from 'node:fs/promises';
import { extractClaimsFromTranscript } from '../src/extractor.js';
import { verifyClaims } from '../src/verifier.js';

describe('Transcript Claim Extractor', () => {
  const fixturesDir = resolve(__dirname, '../examples/fixtures');

  it('extracts claims from Claude Code JSONL honest transcript and verifies upheld', async () => {
    const transcript = await readFile(resolve(fixturesDir, 'transcript-claude-honest.jsonl'), 'utf-8');
    const claims = extractClaimsFromTranscript(transcript);

    expect(claims.length).toBeGreaterThanOrEqual(3);
    const fileClaims = claims.filter((c) => c.type === 'file_written');
    expect(fileClaims.some((c) => (c as any).path === 'README.md')).toBe(true);
    expect(fileClaims.some((c) => (c as any).path === 'package.json')).toBe(true);

    const testClaims = claims.filter((c) => c.type === 'tests_pass');
    expect(testClaims.length).toBeGreaterThanOrEqual(1);

    const report = await verifyClaims(claims, {
      cwd: resolve(__dirname, '..'),
      detectUnclaimed: false,
    });
    expect(report.hasUnmet).toBe(false);
    expect(report.summary.upheld).toBe(claims.length);
  });

  it('extracts claims from Claude Code JSONL lying transcript and detects unmet claims', async () => {
    const transcript = await readFile(resolve(fixturesDir, 'transcript-claude-lying.jsonl'), 'utf-8');
    const claims = extractClaimsFromTranscript(transcript);

    expect(claims.length).toBeGreaterThanOrEqual(2);
    const fakeFileClaim = claims.find((c) => c.type === 'file_written' && (c as any).path === 'non_existent_fake_file.txt');
    expect(fakeFileClaim).toBeDefined();

    const report = await verifyClaims(claims, {
      cwd: resolve(__dirname, '..'),
      detectUnclaimed: false,
    });
    expect(report.hasUnmet).toBe(true);
    expect(report.summary.unmet).toBeGreaterThanOrEqual(2);
  });

  it('extracts claims from Cursor JSON array transcript and verifies upheld', async () => {
    const transcript = await readFile(resolve(fixturesDir, 'transcript-cursor-honest.json'), 'utf-8');
    const claims = extractClaimsFromTranscript(transcript);

    expect(claims.length).toBe(3);
    const report = await verifyClaims(claims, {
      cwd: resolve(__dirname, '..'),
      detectUnclaimed: false,
    });
    expect(report.hasUnmet).toBe(false);
    expect(report.summary.upheld).toBe(3);
  });

  it('extracts claims from plain text narrative transcript and detects unmet claims', async () => {
    const transcript = await readFile(resolve(fixturesDir, 'transcript-text-lying.txt'), 'utf-8');
    const claims = extractClaimsFromTranscript(transcript);

    expect(claims.some((c) => c.type === 'file_written' && (c as any).path === 'missing_module.py')).toBe(true);
    expect(claims.some((c) => c.type === 'file_written' && (c as any).path === 'ghost_service.ts')).toBe(true);

    const report = await verifyClaims(claims, {
      cwd: resolve(__dirname, '..'),
      detectUnclaimed: false,
    });
    expect(report.hasUnmet).toBe(true);
  });
});
