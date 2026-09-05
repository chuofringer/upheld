import test from 'node:test';
import assert from 'node:assert/strict';
import { verifyClaim, verifyClaims } from './verifier.js';
import { Claim } from './types.js';

test('verifyClaim with file_exists', () => {
  const claimPass: Claim = {
    id: 'f1',
    description: 'package.json exists',
    rule: { type: 'file_exists', path: 'package.json' }
  };
  const resPass = verifyClaim(claimPass);
  assert.equal(resPass.status, 'upheld');

  const claimFail: Claim = {
    id: 'f2',
    description: 'nonexistent file exists',
    rule: { type: 'file_exists', path: 'nonexistent-file-xyz.txt' }
  };
  const resFail = verifyClaim(claimFail);
  assert.equal(resFail.status, 'unmet');
});

test('verifyClaim with command_exit_zero', () => {
  const claimPass: Claim = {
    id: 'cmd1',
    description: 'echo ok',
    rule: { type: 'command_exit_zero', command: 'node -e "process.exit(0)"' }
  };
  const resPass = verifyClaim(claimPass);
  assert.equal(resPass.status, 'upheld');

  const claimFail: Claim = {
    id: 'cmd2',
    description: 'exit 1',
    rule: { type: 'command_exit_zero', command: 'node -e "process.exit(1)"' }
  };
  const resFail = verifyClaim(claimFail);
  assert.equal(resFail.status, 'unmet');
});

test('verifyClaim with content_matches', () => {
  const claimPass: Claim = {
    id: 'm1',
    description: 'package.json contains upheld name',
    rule: { type: 'content_matches', path: 'package.json', pattern: '"name":\\s*"upheld"' }
  };
  const resPass = verifyClaim(claimPass);
  assert.equal(resPass.status, 'upheld');
});

test('verifyClaims generates aggregate summary report', () => {
  const claims: Claim[] = [
    { id: 'c1', description: 'desc1', rule: { type: 'command_exit_zero', command: 'true' } },
    { id: 'c2', description: 'desc2', rule: { type: 'command_exit_zero', command: 'false' } },
    { id: 'c3', description: 'desc3' }
  ];
  const report = verifyClaims(claims);
  assert.equal(report.summary.total, 3);
  assert.equal(report.summary.upheld, 1);
  assert.equal(report.summary.unmet, 1);
  assert.equal(report.summary.unclaimed, 1);
  assert.equal(report.results.length, 3);
});
