import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';

const BIN_PATH = path.resolve(process.cwd(), 'bin/upheld.js');

test('CLI --help outputs help message', () => {
  const res = spawnSync('node', [BIN_PATH, '--help'], { encoding: 'utf-8' });
  assert.equal(res.status, 0);
  assert.match(res.stdout, /upheld — Claims vs Evidence verifier/);
  assert.match(res.stdout, /upheld wrap/);
});

test('CLI wrap runs command and verifies claims', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'upheld-cli-wrap-'));
  const claimsPath = path.join(tmpDir, '.upheld.json');

  fs.writeFileSync(
    claimsPath,
    JSON.stringify({
      claims: [
        {
          id: 'cli-1',
          description: 'cli wrap works',
          command: 'node -e "console.log(\'cli-ok\')"',
          expected: 'cli-ok'
        }
      ]
    }),
    'utf-8'
  );

  const res = spawnSync('node', [BIN_PATH, 'wrap', '--', 'echo', 'cli testing'], {
    cwd: tmpDir,
    encoding: 'utf-8'
  });

  assert.equal(res.status, 0);
  assert.match(res.stdout, /cli testing/);
  assert.match(res.stdout, /=== Upheld: Claims vs Evidence Verification ===/);
  assert.match(res.stdout, /cli-1/);
  assert.match(res.stdout, /VERIFIED/);

  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('CLI verify fails when claim fails', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'upheld-cli-verify-'));
  const claimsPath = path.join(tmpDir, '.upheld.json');

  fs.writeFileSync(
    claimsPath,
    JSON.stringify({
      claims: [
        {
          id: 'cli-fail',
          description: 'cli fail check',
          command: 'echo "hello"',
          expected: 'goodbye'
        }
      ]
    }),
    'utf-8'
  );

  const res = spawnSync('node', [BIN_PATH, 'verify'], {
    cwd: tmpDir,
    encoding: 'utf-8'
  });

  assert.equal(res.status, 1);
  assert.match(res.stdout, /FAILED/);

  fs.rmSync(tmpDir, { recursive: true, force: true });
});
