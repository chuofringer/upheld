import test from 'node:test';
import assert from 'node:assert/strict';
import { diffReports, formatCompactDiff, normalizeToResults } from './diff.js';
import { ClaimResult, VerificationReport } from './types.js';

test('normalizeToResults parses array of claim results', () => {
  const results: ClaimResult[] = [
    { id: 'c1', status: 'upheld' }
  ];
  const normalized = normalizeToResults(results);
  assert.equal(normalized.results.length, 1);
  assert.equal(normalized.results[0].id, 'c1');
});

test('normalizeToResults parses VerificationReport', () => {
  const report: VerificationReport = {
    timestamp: '2026-09-05T00:00:00.000Z',
    summary: { total: 1, upheld: 1, unmet: 0, unclaimed: 0 },
    results: [{ id: 'c1', status: 'upheld' }]
  };
  const normalized = normalizeToResults(report);
  assert.equal(normalized.timestamp, '2026-09-05T00:00:00.000Z');
  assert.equal(normalized.results.length, 1);
});

test('diffReports computes newlyUpheld, newlyUnmet, newlyUnclaimed, and unchanged correctly', () => {
  const baseResults: ClaimResult[] = [
    { id: 'c1', description: 'Build succeeded', status: 'unmet', reason: 'Compilation error' },
    { id: 'c2', description: 'Tests passing', status: 'upheld', reason: 'Exit 0' },
    { id: 'c3', description: 'Docs present', status: 'upheld', reason: 'File exists' },
    { id: 'c4', description: 'Lint clean', status: 'unclaimed', reason: 'No rule' }
  ];

  const targetResults: ClaimResult[] = [
    { id: 'c1', description: 'Build succeeded', status: 'upheld', reason: 'Exit 0' }, // newlyUpheld
    { id: 'c2', description: 'Tests passing', status: 'unmet', reason: 'Assertion error' }, // newlyUnmet
    { id: 'c3', description: 'Docs present', status: 'upheld', reason: 'File exists' }, // unchanged
    { id: 'c4', description: 'Lint clean', status: 'unclaimed', reason: 'No rule' }, // unchanged
    { id: 'c5', description: 'New feature', status: 'upheld', reason: 'Exit 0' } // added & newlyUpheld
  ];

  const diff = diffReports(baseResults, targetResults);

  assert.equal(diff.summary.newlyUpheldCount, 2);
  assert.equal(diff.summary.newlyUnmetCount, 1);
  assert.equal(diff.summary.newlyUnclaimedCount, 0);
  assert.equal(diff.summary.unchangedCount, 2);
  assert.equal(diff.summary.addedCount, 1);
  assert.equal(diff.summary.removedCount, 0);

  assert.equal(diff.delta.newlyUpheld[0].id, 'c1');
  assert.equal(diff.delta.newlyUpheld[1].id, 'c5');
  assert.equal(diff.delta.newlyUnmet[0].id, 'c2');
  assert.equal(diff.delta.unchanged.map(x => x.id).sort().join(','), 'c3,c4');
});

test('diffReports detects removed claims', () => {
  const base: ClaimResult[] = [
    { id: 'c1', status: 'upheld' },
    { id: 'c2', status: 'upheld' }
  ];
  const target: ClaimResult[] = [
    { id: 'c1', status: 'upheld' }
  ];

  const diff = diffReports(base, target);
  assert.equal(diff.summary.removedCount, 1);
  assert.equal(diff.delta.removed[0].id, 'c2');
});

test('formatCompactDiff produces clear, readable text', () => {
  const diff = diffReports(
    [{ id: 'c1', description: 'Claim 1', status: 'unmet' }],
    [{ id: 'c1', description: 'Claim 1', status: 'upheld', reason: 'Fixed' }]
  );

  const formatted = formatCompactDiff(diff, { color: false });
  assert.match(formatted, /=== Upheld Claim Delta ===/);
  assert.match(formatted, /\+1 upheld/);
  assert.match(formatted, /✔ Newly Upheld:/);
  assert.match(formatted, /\+ \[UPHELD\] c1 - Claim 1 \(Fixed\)/);
});
