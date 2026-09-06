import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { runCli } from '../src/cli.js';
import { verifyClaims } from '../src/verifier.js';
import { readClaimsFromFile } from '../src/claims.js';

const execAsync = promisify(exec);

describe('Tutorial Examples and Runnable Suite', () => {
  const rootDir = resolve(__dirname, '..');
  const tutorialDir = resolve(rootDir, 'examples/tutorial');

  it('runs case A upheld fixture and verifies passing test counts', async () => {
    const claims = await readClaimsFromFile(resolve(tutorialDir, 'claims-case-a-upheld.json'));
    const report = await verifyClaims(claims, {
      cwd: rootDir,
      detectUnclaimed: false,
    });

    expect(report.hasUnmet).toBe(false);
    expect(report.summary.upheld).toBe(1);
    expect(report.summary.unmet).toBe(0);
    expect(report.results[0].status).toBe('upheld');
  });

  it('runs case A unmet fixture and flags exaggerated test counts', async () => {
    const claims = await readClaimsFromFile(resolve(tutorialDir, 'claims-case-a-unmet.json'));
    const report = await verifyClaims(claims, {
      cwd: rootDir,
      detectUnclaimed: false,
    });

    expect(report.hasUnmet).toBe(true);
    expect(report.summary.upheld).toBe(0);
    expect(report.summary.unmet).toBe(1);
    expect(report.results[0].status).toBe('unmet');
    expect(report.results[0].details).toContain('Claimed 5 passed but observed 2');
  });

  it('runs case B unmet fixture and flags pre-existing unchanged files with future --since timestamp', async () => {
    const claims = await readClaimsFromFile(resolve(tutorialDir, 'claims-case-b-unmet.json'));
    const report = await verifyClaims(claims, {
      cwd: rootDir,
      detectUnclaimed: false,
      sinceTimestamp: Date.now() + 100_000,
    });

    expect(report.hasUnmet).toBe(true);
    expect(report.results[0].status).toBe('unmet');
    expect(report.results[0].details).toContain('no evidence of write or change this run');
  });

  it('runs case E mini corpus fixture and upholds both file written and test suite pass', async () => {
    const claims = await readClaimsFromFile(resolve(tutorialDir, 'claims-case-e-corpus.json'));
    const report = await verifyClaims(claims, {
      cwd: rootDir,
      detectUnclaimed: false,
      sinceTimestamp: 0,
    });

    expect(report.hasUnmet).toBe(false);
    expect(report.summary.upheld).toBe(2);
    expect(report.summary.unmet).toBe(0);
  });

  it('runs examples/tutorial/run.sh bash script end-to-end successfully', async () => {
    const { stdout, stderr } = await execAsync('bash examples/tutorial/run.sh', {
      cwd: rootDir,
    });

    expect(stdout).toContain('All tutorial use cases executed successfully!');
    expect(stdout).toContain('Claims, upheld. Done means shown.');
    expect(stdout).toContain('USE CASE A.1');
    expect(stdout).toContain('USE CASE E');
  });
});
