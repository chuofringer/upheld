import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { initProject, CLAIMS_EXAMPLE_JSON, CLAUDE_STOP_HOOK_SH, UPHELD_README_MD, GITHUB_ACTION_WORKFLOW_YML } from '../src/init.js';
import { runCli } from '../src/cli.js';

describe('initProject', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'upheld-init-test-'));
  });

  afterEach(() => {
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('creates .upheld directory with example claims, stop hook, and README', () => {
    const result = initProject({ cwd: tempDir });

    const claimsExample = join(tempDir, '.upheld', 'claims.example.json');
    const stopHook = join(tempDir, '.upheld', 'stop-hook.sh');
    const readme = join(tempDir, '.upheld', 'README.md');

    expect(existsSync(claimsExample)).toBe(true);
    expect(existsSync(stopHook)).toBe(true);
    expect(existsSync(readme)).toBe(true);

    expect(readFileSync(claimsExample, 'utf-8')).toBe(CLAIMS_EXAMPLE_JSON);
    expect(readFileSync(stopHook, 'utf-8')).toBe(CLAUDE_STOP_HOOK_SH);
    expect(readFileSync(readme, 'utf-8')).toBe(UPHELD_README_MD);

    expect(result.createdFiles).toEqual([claimsExample, stopHook, readme]);
    expect(result.skippedFiles).toEqual([]);
  });

  it('creates GitHub Action workflow when githubAction flag is set', () => {
    const result = initProject({ cwd: tempDir, githubAction: true });

    const workflowFile = join(tempDir, '.github', 'workflows', 'upheld.yml');
    expect(existsSync(workflowFile)).toBe(true);
    expect(readFileSync(workflowFile, 'utf-8')).toBe(GITHUB_ACTION_WORKFLOW_YML);
    expect(result.createdFiles).toContain(workflowFile);
  });

  it('is idempotent and skips existing files without --force', () => {
    initProject({ cwd: tempDir, githubAction: true });

    // Modify a file to verify it is NOT overwritten
    const claimsExample = join(tempDir, '.upheld', 'claims.example.json');
    writeFileSync(claimsExample, '{"custom": true}');

    const result2 = initProject({ cwd: tempDir, githubAction: true });

    expect(result2.createdFiles).toEqual([]);
    expect(result2.skippedFiles.length).toBe(4);
    expect(readFileSync(claimsExample, 'utf-8')).toBe('{"custom": true}');
  });

  it('overwrites existing files when force flag is set', () => {
    initProject({ cwd: tempDir });

    const claimsExample = join(tempDir, '.upheld', 'claims.example.json');
    writeFileSync(claimsExample, '{"custom": true}');

    const result = initProject({ cwd: tempDir, force: true });

    expect(result.createdFiles).toContain(claimsExample);
    expect(result.skippedFiles).toEqual([]);
    expect(readFileSync(claimsExample, 'utf-8')).toBe(CLAIMS_EXAMPLE_JSON);
  });
});

describe('CLI init command', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'upheld-cli-init-test-'));
  });

  afterEach(() => {
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('runs `upheld init` successfully', async () => {
    const code = await runCli(['init', '--cwd', tempDir]);
    expect(code).toBe(0);

    expect(existsSync(join(tempDir, '.upheld', 'claims.example.json'))).toBe(true);
    expect(existsSync(join(tempDir, '.upheld', 'stop-hook.sh'))).toBe(true);
    expect(existsSync(join(tempDir, '.upheld', 'README.md'))).toBe(true);
  });

  it('runs `upheld init --github-action` successfully', async () => {
    const code = await runCli(['init', '--github-action', '--cwd', tempDir]);
    expect(code).toBe(0);

    expect(existsSync(join(tempDir, '.github', 'workflows', 'upheld.yml'))).toBe(true);
  });

  it('handles idempotence and force via CLI', async () => {
    await runCli(['init', '--cwd', tempDir]);

    const claimsExample = join(tempDir, '.upheld', 'claims.example.json');
    writeFileSync(claimsExample, '{"custom": 123}');

    // Without force, should exit 0 and not overwrite
    let code = await runCli(['init', '--cwd', tempDir]);
    expect(code).toBe(0);
    expect(readFileSync(claimsExample, 'utf-8')).toBe('{"custom": 123}');

    // With force, should overwrite
    code = await runCli(['init', '--force', '--cwd', tempDir]);
    expect(code).toBe(0);
    expect(readFileSync(claimsExample, 'utf-8')).toBe(CLAIMS_EXAMPLE_JSON);
  });
});
