import { describe, it, expect } from 'vitest';
import {
  normalizeToolEventsToClaims,
  normalizeCodexSessionToClaims,
  normalizeOpenCodeSessionToClaims,
  RawToolEvent,
  CodexSessionEvent,
  OpenCodeSessionEvent,
} from '../src/adapters/index.js';

describe('Harness Event Normalizer (Shared Helper)', () => {
  it('normalizes generic tool events into tests_pass and file_written claims', () => {
    const rawEvents: RawToolEvent[] = [
      {
        tool: 'bash',
        args: { command: 'pytest tests/test_core.py' },
        result: { exitCode: 0, stdout: '=== 5 passed in 0.12s ===' },
      },
      {
        tool: 'write_file',
        args: { path: 'src/module.py', content: 'def hello(): pass' },
        result: { success: true },
      },
      {
        tool: 'read_file',
        args: { path: 'src/module.py' },
        result: { content: '...' },
      },
    ];

    const claims = normalizeToolEventsToClaims(rawEvents);

    expect(claims).toHaveLength(2);
    expect(claims[0]).toEqual({
      type: 'tests_pass',
      cmd: 'pytest tests/test_core.py',
    });
    expect(claims[1]).toEqual({
      type: 'file_written',
      path: 'src/module.py',
    });
  });

  it('filters out failed test commands and deduplicates file_written claims', () => {
    const rawEvents: RawToolEvent[] = [
      {
        tool: 'bash',
        args: { command: 'npm test' },
        result: { exitCode: 1, stdout: '1 failed' },
      },
      {
        tool: 'write_file',
        args: { path: 'src/index.ts' },
      },
      {
        tool: 'write_file',
        args: { path: 'src/index.ts' },
      },
      {
        tool: 'bash',
        args: { command: 'npm test' },
        result: { exitCode: 0, stdout: 'pass' },
      },
    ];

    const claims = normalizeToolEventsToClaims(rawEvents);

    expect(claims).toHaveLength(2);
    expect(claims[0]).toEqual({
      type: 'file_written',
      path: 'src/index.ts',
    });
    expect(claims[1]).toEqual({
      type: 'tests_pass',
      cmd: 'npm test',
    });
  });
});

describe('Codex CLI Adapter', () => {
  it('normalizes Codex CLI session events into Upheld claims', () => {
    const codexEvents: CodexSessionEvent[] = [
      {
        type: 'tool_call',
        name: 'exec',
        parameters: { cmd: 'vitest run' },
        response: { exit_code: 0, output: '3 passed' },
      },
      {
        type: 'tool_call',
        name: 'file_edit',
        parameters: { file_path: 'src/adapters/codex.ts' },
        response: { status: 'ok' },
      },
      {
        type: 'message',
        role: 'assistant',
        content: 'Task completed.',
      },
    ];

    const claims = normalizeCodexSessionToClaims(codexEvents);

    expect(claims).toHaveLength(2);
    expect(claims).toEqual([
      {
        type: 'tests_pass',
        cmd: 'vitest run',
      },
      {
        type: 'file_written',
        path: 'src/adapters/codex.ts',
      },
    ]);
  });
});

describe('OpenCode Adapter', () => {
  it('normalizes OpenCode session events into Upheld claims', () => {
    const openCodeEvents: OpenCodeSessionEvent[] = [
      {
        event: 'tool_executed',
        toolName: 'execute_command',
        input: { command: 'npm run test:ci' },
        output: { exitCode: 0, stdout: 'All tests passed' },
      },
      {
        event: 'tool_executed',
        toolName: 'write_to_file',
        input: { filePath: 'src/adapters/opencode.ts' },
        output: { success: true },
      },
      {
        event: 'tool_executed',
        toolName: 'view_file',
        input: { filePath: 'package.json' },
        output: { content: '{}' },
      },
    ];

    const claims = normalizeOpenCodeSessionToClaims(openCodeEvents);

    expect(claims).toHaveLength(2);
    expect(claims).toEqual([
      {
        type: 'tests_pass',
        cmd: 'npm run test:ci',
      },
      {
        type: 'file_written',
        path: 'src/adapters/opencode.ts',
      },
    ]);
  });
});
