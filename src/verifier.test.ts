import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { verifyClaim, verifyAllClaims, findClaimsFile, loadClaims } from './verifier.js';
import { formatClaimsTable } from './formatter.js';
import { runWrap } from './wrap.js';

test('verifier handles command checks', () => {
  const claimPass = {
    id: 'test-1',
    description: 'echo test passes',
    command: 'echo "hello upheld"',
    expected: 'hello'
  };

  const resPass = verifyClaim(claimPass);
  assert.equal(resPass.passed, true);
  assert.equal(resPass.status, 'verified');
  assert.match(resPass.evidence || '', /hello upheld/);

  const claimFail = {
    id: 'test-2',
    description: 'expected mismatch fails',
    command: 'echo "foo bar"',
    expected: 'baz'
  };

  const resFail = verifyClaim(claimFail);
  assert.equal(resFail.passed, false);
  assert.equal(resFail.status, 'failed');
});

test('verifier handles file checks', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'upheld-test-'));
  const testFile = path.join(tmpDir, 'sample.txt');
  fs.writeFileSync(testFile, 'claims verification proof', 'utf-8');

  const claimFilePass = {
    id: 'file-1',
    description: 'file exists and has content',
    file: 'sample.txt',
    expected: 'claims verification'
  };

  const res = verifyClaim(claimFilePass, tmpDir);
  assert.equal(res.passed, true);
  assert.equal(res.status, 'verified');

  const claimFileFail = {
    id: 'file-2',
    description: 'file missing',
    file: 'missing.txt'
  };

  const resMissing = verifyClaim(claimFileFail, tmpDir);
  assert.equal(resMissing.passed, false);
  assert.equal(resMissing.status, 'failed');

  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('formatter outputs markdown table', () => {
  const summary = {
    total: 2,
    verified: 1,
    failed: 1,
    results: [
      {
        claim: { id: 'c1', description: 'Task 1' },
        passed: true,
        status: 'verified' as const,
        message: 'ok',
        evidence: 'output evidence'
      },
      {
        claim: { id: 'c2', description: 'Task 2' },
        passed: false,
        status: 'failed' as const,
        message: 'failed',
        evidence: 'error'
      }
    ]
  };

  const table = formatClaimsTable(summary);
  assert.match(table, /=== Upheld: Claims vs Evidence Verification ===/);
  assert.match(table, /Claim ID/);
  assert.match(table, /VERIFIED/);
  assert.match(table, /FAILED/);
  assert.match(table, /Summary: 1\/2 verified \(1 failed\)/);
});

test('runWrap executes command and auto-verifies claims file', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'upheld-wrap-test-'));
  const claimsPath = path.join(tmpDir, '.upheld.json');

  fs.writeFileSync(
    claimsPath,
    JSON.stringify({
      claims: [
        {
          id: 'wrap-1',
          description: 'wrap command works',
          command: 'echo "all good"',
          expected: 'all good'
        }
      ]
    }),
    'utf-8'
  );

  const result = runWrap({
    commandArgs: ['echo', 'running wrapped task'],
    cwd: tmpDir,
    quiet: true
  });

  assert.equal(result.commandExitCode, 0);
  assert.equal(result.claimsFound, true);
  assert.equal(result.claimsVerified, true);
  assert.equal(result.exitCode, 0);
  assert.ok(result.tableOutput);
  assert.match(result.tableOutput, /wrap-1/);
  assert.match(result.tableOutput, /VERIFIED/);

  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('runWrap handles strict mode when claims fail', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'upheld-wrap-fail-'));
  const claimsPath = path.join(tmpDir, '.upheld.json');

  fs.writeFileSync(
    claimsPath,
    JSON.stringify({
      claims: [
        {
          id: 'wrap-fail',
          description: 'failing claim',
          command: 'echo "nope"',
          expected: 'yes'
        }
      ]
    }),
    'utf-8'
  );

  const result = runWrap({
    commandArgs: ['echo', 'success command'],
    cwd: tmpDir,
    strict: true,
    quiet: true
  });

  assert.equal(result.commandExitCode, 0);
  assert.equal(result.claimsFound, true);
  assert.equal(result.claimsVerified, false);
  assert.equal(result.exitCode, 1);

  fs.rmSync(tmpDir, { recursive: true, force: true });
});
