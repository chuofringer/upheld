import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import * as childProcess from 'node:child_process';

describe('CLI Integration', () => {
  let tmpDir: string;
  const cliPath = path.resolve('dist/cli.js');

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'upheld-cli-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('runs verify with claims config and appends to ledger', () => {
    const configPath = path.join(tmpDir, 'claims.json');
    const ledgerPath = path.join(tmpDir, 'ledger.jsonl');

    fs.writeFileSync(
      configPath,
      JSON.stringify({
        claims: [
          {
            id: 'c1',
            description: 'Sample claim',
            type: 'command',
            command: 'node -e "process.exit(0)"',
          },
        ],
      })
    );

    const out = childProcess.execSync(
      `node "${cliPath}" verify --config "${configPath}" --ledger "${ledgerPath}"`,
      { cwd: tmpDir, encoding: 'utf-8' }
    );

    expect(out).toContain('Verification Run:');
    expect(out).toContain('Receipt appended to local ledger:');

    expect(fs.existsSync(ledgerPath)).toBe(true);
    const ledgerContent = fs.readFileSync(ledgerPath, 'utf-8');
    const entry = JSON.parse(ledgerContent.trim());
    expect(entry.version).toBe('1.0');
    expect(entry.counts.upheld).toBe(1);
    expect(entry.counts.unmet).toBe(0);
  });

  it('prints ledger summary for recent runs', () => {
    const configPath = path.join(tmpDir, 'claims.json');
    const ledgerPath = path.join(tmpDir, 'ledger.jsonl');

    fs.writeFileSync(
      configPath,
      JSON.stringify({
        claims: [
          {
            id: 'c1',
            description: 'Sample claim',
            type: 'command',
            command: 'node -e "process.exit(0)"',
          },
        ],
      })
    );

    // Run 2 verification passes
    childProcess.execSync(
      `node "${cliPath}" verify --config "${configPath}" --ledger "${ledgerPath}"`,
      { cwd: tmpDir }
    );
    childProcess.execSync(
      `node "${cliPath}" verify --config "${configPath}" --ledger "${ledgerPath}"`,
      { cwd: tmpDir }
    );

    // Print summary
    const summaryOut = childProcess.execSync(
      `node "${cliPath}" ledger summary --ledger "${ledgerPath}" --limit 2`,
      { cwd: tmpDir, encoding: 'utf-8' }
    );

    expect(summaryOut).toContain('Receipt Ledger (2 runs):');
    expect(summaryOut).toContain('PASS');

    // JSON summary output
    const jsonOut = childProcess.execSync(
      `node "${cliPath}" ledger summary --ledger "${ledgerPath}" --json`,
      { cwd: tmpDir, encoding: 'utf-8' }
    );

    const json = JSON.parse(jsonOut);
    expect(Array.isArray(json)).toBe(true);
    expect(json.length).toBe(2);
    expect(json[0].version).toBe('1.0');
  });
});
