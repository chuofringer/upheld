import test from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

test('CLI: upheld diff between two report files', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'upheld-test-'));
  const repA = path.join(tmpDir, 'repA.json');
  const repB = path.join(tmpDir, 'repB.json');

  fs.writeFileSync(repA, JSON.stringify([
    { id: 'c1', status: 'unmet', description: 'Build passes' },
    { id: 'c2', status: 'upheld', description: 'Docs present' }
  ]), 'utf-8');

  fs.writeFileSync(repB, JSON.stringify([
    { id: 'c1', status: 'upheld', description: 'Build passes' },
    { id: 'c2', status: 'upheld', description: 'Docs present' }
  ]), 'utf-8');

  const stdout = execSync(`node ./dist/cli.js diff "${repA}" "${repB}" --no-color`, { encoding: 'utf-8' });
  assert.match(stdout, /\+1 upheld/);
  assert.match(stdout, /✔ Newly Upheld:/);
  assert.match(stdout, /\+ \[UPHELD\] c1 - Build passes/);

  // Test --json output flag
  const jsonStdout = execSync(`node ./dist/cli.js diff "${repA}" "${repB}" --json`, { encoding: 'utf-8' });
  const parsed = JSON.parse(jsonStdout);
  assert.equal(parsed.summary.newlyUpheldCount, 1);
  assert.equal(parsed.summary.newlyUnmetCount, 0);
  assert.equal(parsed.delta.newlyUpheld[0].id, 'c1');

  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('CLI: upheld diff with --run claims.json', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'upheld-test-run-'));
  const repBase = path.join(tmpDir, 'repBase.json');
  const claimsFile = path.join(tmpDir, 'claims.json');

  fs.writeFileSync(repBase, JSON.stringify([
    { id: 'test_claim', status: 'unmet', description: 'Check true command' }
  ]), 'utf-8');

  fs.writeFileSync(claimsFile, JSON.stringify([
    { id: 'test_claim', description: 'Check true command', rule: { type: 'command_exit_zero', command: 'true' } }
  ]), 'utf-8');

  const stdout = execSync(`node ./dist/cli.js diff "${repBase}" --run "${claimsFile}" --no-color`, { encoding: 'utf-8' });
  assert.match(stdout, /\+1 upheld/);
  assert.match(stdout, /\+ \[UPHELD\] test_claim/);

  fs.rmSync(tmpDir, { recursive: true, force: true });
});
