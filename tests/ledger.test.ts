import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  computeClaimHash,
  claimToDigest,
  createLedgerEntry,
  appendLedgerEntry,
  readLedgerEntries,
  getLedgerSummary,
  formatLedgerSummary,
} from '../src/index.js';
import type { VerificationResult, Claim } from '../src/types.js';

describe('Claim Digest', () => {
  it('computes deterministic claim hash', () => {
    const claim: Claim = {
      id: 'test-1',
      description: 'First test claim',
      evidenceType: 'command',
      expected: 'exit 0',
      actual: 'exit 0',
      status: 'upheld',
    };

    const hash1 = computeClaimHash(claim);
    const hash2 = computeClaimHash({ ...claim });
    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(12);

    const digest = claimToDigest(claim);
    expect(digest.id).toBe('test-1');
    expect(digest.status).toBe('upheld');
    expect(digest.hash).toBe(hash1);
    expect(digest.description).toBe('First test claim');
  });

  it('produces different hashes for different claim statuses', () => {
    const claimUpheld: Claim = {
      id: 'test-1',
      description: 'Test claim',
      status: 'upheld',
    };
    const claimUnmet: Claim = {
      id: 'test-1',
      description: 'Test claim',
      status: 'unmet',
    };

    expect(computeClaimHash(claimUpheld)).not.toBe(computeClaimHash(claimUnmet));
  });
});

describe('Claim Receipt Ledger', () => {
  let tmpDir: string;
  let ledgerPath: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'upheld-test-'));
    ledgerPath = path.join(tmpDir, 'receipts.jsonl');
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('creates ledger entry structure correctly', () => {
    const mockResult: VerificationResult = {
      runId: 'run-123',
      timestamp: '2026-09-05T22:00:00.000Z',
      claims: [
        {
          id: 'claim-1',
          description: 'Claim 1',
          evidenceType: 'file_exists',
          status: 'upheld',
        },
        {
          id: 'claim-2',
          description: 'Claim 2',
          evidenceType: 'command',
          status: 'unmet',
        },
      ],
      summary: {
        total: 2,
        upheld: 1,
        unmet: 1,
        unclaimed: 0,
      },
      exitMode: 'fail',
      passed: false,
    };

    const entry = createLedgerEntry(mockResult);
    expect(entry.version).toBe('1.0');
    expect(entry.runId).toBe('run-123');
    expect(entry.timestamp).toBe('2026-09-05T22:00:00.000Z');
    expect(entry.exitMode).toBe('fail');
    expect(entry.passed).toBe(false);
    expect(entry.counts).toEqual({
      total: 2,
      upheld: 1,
      unmet: 1,
      unclaimed: 0,
    });
    expect(entry.claims).toHaveLength(2);
    expect(entry.claims[0].status).toBe('upheld');
    expect(entry.claims[1].status).toBe('unmet');
    expect(entry.claims[0].hash).toBeDefined();
  });

  it('appends multiple entries to JSONL ledger file and reads them back', async () => {
    const run1: VerificationResult = {
      runId: 'run-1',
      timestamp: '2026-09-05T22:00:00.000Z',
      claims: [
        { id: 'c1', description: 'Claim 1', status: 'upheld' },
      ],
      summary: { total: 1, upheld: 1, unmet: 0, unclaimed: 0 },
      exitMode: 'pass',
      passed: true,
    };

    const run2: VerificationResult = {
      runId: 'run-2',
      timestamp: '2026-09-05T22:01:00.000Z',
      claims: [
        { id: 'c1', description: 'Claim 1', status: 'upheld' },
        { id: 'c2', description: 'Claim 2', status: 'unmet' },
      ],
      summary: { total: 2, upheld: 1, unmet: 1, unclaimed: 0 },
      exitMode: 'fail',
      passed: false,
    };

    await appendLedgerEntry(ledgerPath, run1);
    await appendLedgerEntry(ledgerPath, run2);

    expect(fs.existsSync(ledgerPath)).toBe(true);

    const entries = await readLedgerEntries(ledgerPath);
    expect(entries).toHaveLength(2);
    expect(entries[0].runId).toBe('run-1');
    expect(entries[0].counts.upheld).toBe(1);
    expect(entries[1].runId).toBe('run-2');
    expect(entries[1].counts.unmet).toBe(1);
  });

  it('summarizes the last N runs', async () => {
    for (let i = 1; i <= 5; i++) {
      const run: VerificationResult = {
        runId: `run-${i}`,
        timestamp: `2026-09-05T22:0${i}:00.000Z`,
        claims: [{ id: `c-${i}`, description: `Claim ${i}`, status: 'upheld' }],
        summary: { total: 1, upheld: 1, unmet: 0, unclaimed: 0 },
        exitMode: 'pass',
        passed: true,
      };
      await appendLedgerEntry(ledgerPath, run);
    }

    const last2 = await getLedgerSummary(ledgerPath, { limit: 2 });
    expect(last2).toHaveLength(2);
    expect(last2[0].runId).toBe('run-4');
    expect(last2[1].runId).toBe('run-5');

    const last2Reversed = await getLedgerSummary(ledgerPath, { limit: 2, reverse: true });
    expect(last2Reversed[0].runId).toBe('run-5');
    expect(last2Reversed[1].runId).toBe('run-4');
  });

  it('formats ledger summary nicely', async () => {
    const run: VerificationResult = {
      runId: 'abcdef123456789',
      timestamp: '2026-09-05T22:00:00.000Z',
      claims: [{ id: 'c1', description: 'Claim 1', status: 'upheld' }],
      summary: { total: 1, upheld: 1, unmet: 0, unclaimed: 0 },
      exitMode: 'pass',
      passed: true,
    };
    const entry = createLedgerEntry(run);
    const formatted = formatLedgerSummary([entry]);
    expect(formatted).toContain('Receipt Ledger (1 run)');
    expect(formatted).toContain('abcdef123456');
    expect(formatted).toContain('PASS');
    expect(formatted).toContain('1');

    const emptyFormatted = formatLedgerSummary([]);
    expect(emptyFormatted).toBe('No verification receipts found in ledger.');
  });
});
