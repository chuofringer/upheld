import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { runVerification, verifyClaim } from '../src/verifier.js';

describe('Verifier Engine', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'upheld-verifier-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('verifies file_exists claims', async () => {
    const existingFile = path.join(tmpDir, 'test.txt');
    fs.writeFileSync(existingFile, 'hello');

    const claim1 = await verifyClaim(
      {
        id: 'file-check-1',
        description: 'File should exist',
        type: 'file_exists',
        file: 'test.txt',
      },
      tmpDir
    );
    expect(claim1.status).toBe('upheld');

    const claim2 = await verifyClaim(
      {
        id: 'file-check-2',
        description: 'Missing file',
        type: 'file_exists',
        file: 'missing.txt',
      },
      tmpDir
    );
    expect(claim2.status).toBe('unmet');
  });

  it('verifies file_contains claims', async () => {
    const targetFile = path.join(tmpDir, 'sample.txt');
    fs.writeFileSync(targetFile, 'const x = 42;');

    const claim1 = await verifyClaim(
      {
        id: 'contains-check-1',
        description: 'Contains 42',
        type: 'file_contains',
        file: 'sample.txt',
        pattern: '42',
      },
      tmpDir
    );
    expect(claim1.status).toBe('upheld');

    const claim2 = await verifyClaim(
      {
        id: 'contains-check-2',
        description: 'Contains 100',
        type: 'file_contains',
        file: 'sample.txt',
        pattern: '100',
      },
      tmpDir
    );
    expect(claim2.status).toBe('unmet');
  });

  it('verifies command claims', async () => {
    const claim1 = await verifyClaim(
      {
        id: 'cmd-check-1',
        description: 'Echo test',
        type: 'command',
        command: 'node -e "process.exit(0)"',
      },
      tmpDir
    );
    expect(claim1.status).toBe('upheld');

    const claim2 = await verifyClaim(
      {
        id: 'cmd-check-2',
        description: 'Fail test',
        type: 'command',
        command: 'node -e "process.exit(1)"',
      },
      tmpDir
    );
    expect(claim2.status).toBe('unmet');
  });

  it('runs batch verification and aggregates counts', async () => {
    const result = await runVerification(
      [
        {
          id: 'c1',
          description: 'cmd success',
          type: 'command',
          command: 'node -e "process.exit(0)"',
        },
        {
          id: 'c2',
          description: 'cmd failure',
          type: 'command',
          command: 'node -e "process.exit(1)"',
        },
        {
          id: 'c3',
          description: 'unknown type',
          type: 'custom',
        },
      ],
      { cwd: tmpDir }
    );

    expect(result.summary.total).toBe(3);
    expect(result.summary.upheld).toBe(1);
    expect(result.summary.unmet).toBe(1);
    expect(result.summary.unclaimed).toBe(1);
    expect(result.exitMode).toBe('fail');
    expect(result.passed).toBe(false);
  });
});
