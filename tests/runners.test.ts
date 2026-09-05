import { describe, it, expect } from 'vitest';
import { parsePytestOutput } from '../src/runners/pytest.js';
import { parseVitestOutput } from '../src/runners/vitest.js';
import { parseJestOutput } from '../src/runners/jest.js';

describe('Test Output Parsers', () => {
  it('parses pytest output', () => {
    const output = `
============================= test session starts ==============================
tests/test_app.py ...                                                    [100%]
============================== 3 passed in 0.12s ===============================
    `;
    const result = parsePytestOutput(output);
    expect(result.passed).toBe(3);
    expect(result.failed).toBe(0);
    expect(result.total).toBe(3);
  });

  it('parses pytest output with failures and errors', () => {
    const output = `
============================== 2 failed, 4 passed, 1 error in 0.45s ============
    `;
    const result = parsePytestOutput(output);
    expect(result.passed).toBe(4);
    expect(result.failed).toBe(3); // 2 failed + 1 error
    expect(result.total).toBe(7);
  });

  it('parses vitest output', () => {
    const output = `
 Tests  4 passed (4)
 Duration  240ms
    `;
    const result = parseVitestOutput(output);
    expect(result.passed).toBe(4);
    expect(result.failed).toBe(0);
    expect(result.total).toBe(4);
  });

  it('parses vitest output with failures', () => {
    const output = `
 Tests  2 failed | 3 passed (5)
 Duration  450ms
    `;
    const result = parseVitestOutput(output);
    expect(result.passed).toBe(3);
    expect(result.failed).toBe(2);
    expect(result.total).toBe(5);
  });

  it('parses jest output', () => {
    const output = `
Tests:       1 failed, 4 passed, 5 total
Snapshots:   0 total
Time:        1.234 s
    `;
    const result = parseJestOutput(output);
    expect(result.passed).toBe(4);
    expect(result.failed).toBe(1);
    expect(result.total).toBe(5);
  });
});
