import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parsePytestOutput } from '../src/runners/pytest.js';
import { parseVitestOutput } from '../src/runners/vitest.js';
import { parseJestOutput } from '../src/runners/jest.js';
import { parseOutputMetrics } from '../src/runners/index.js';
import { verifyClaims } from '../src/verifier.js';

describe('Test Output Parsers - Hardening & Golden Tests', () => {
  const fixturesDir = resolve(__dirname, 'fixtures');

  describe('Golden File Tests', () => {
    it('parses golden pytest verbose fixture', () => {
      const output = readFileSync(resolve(fixturesDir, 'pytest/verbose.txt'), 'utf-8');
      const result = parsePytestOutput(output);
      expect(result.passed).toBe(3);
      expect(result.failed).toBe(1);
      expect(result.skipped).toBe(1);
      expect(result.total).toBe(5);
    });

    it('parses golden pytest quiet fixture', () => {
      const output = readFileSync(resolve(fixturesDir, 'pytest/quiet.txt'), 'utf-8');
      const result = parsePytestOutput(output);
      expect(result.passed).toBe(3);
      expect(result.failed).toBe(1);
      expect(result.skipped).toBe(1);
      expect(result.total).toBe(5);
    });

    it('parses golden pytest collection-error fixture', () => {
      const output = readFileSync(resolve(fixturesDir, 'pytest/collection-error.txt'), 'utf-8');
      const result = parsePytestOutput(output);
      expect(result.passed).toBe(0);
      expect(result.failed).toBe(1);
      expect(result.skipped).toBe(0);
      expect(result.total).toBe(1);
    });

    it('parses golden vitest standard fixture', () => {
      const output = readFileSync(resolve(fixturesDir, 'vitest/standard.txt'), 'utf-8');
      const result = parseVitestOutput(output);
      expect(result.passed).toBe(8);
      expect(result.failed).toBe(2);
      expect(result.skipped).toBe(1);
      expect(result.total).toBe(11);
    });

    it('parses golden vitest quiet fixture', () => {
      const output = readFileSync(resolve(fixturesDir, 'vitest/quiet.txt'), 'utf-8');
      const result = parseVitestOutput(output);
      expect(result.passed).toBe(4);
      expect(result.failed).toBe(0);
      expect(result.skipped).toBe(1);
      expect(result.total).toBe(5);
    });

    it('parses golden vitest collection-error fixture', () => {
      const output = readFileSync(resolve(fixturesDir, 'vitest/collection-error.txt'), 'utf-8');
      const result = parseVitestOutput(output);
      expect(result.passed).toBe(0);
      expect(result.failed).toBe(1);
      expect(result.skipped).toBe(0);
      expect(result.total).toBe(1);
    });

    it('parses golden jest standard fixture', () => {
      const output = readFileSync(resolve(fixturesDir, 'jest/standard.txt'), 'utf-8');
      const result = parseJestOutput(output);
      expect(result.passed).toBe(6);
      expect(result.failed).toBe(2);
      expect(result.skipped).toBe(2);
      expect(result.total).toBe(10);
    });

    it('parses golden jest collection-error fixture', () => {
      const output = readFileSync(resolve(fixturesDir, 'jest/collection-error.txt'), 'utf-8');
      const result = parseJestOutput(output);
      expect(result.passed).toBe(0);
      expect(result.failed).toBe(1);
      expect(result.skipped).toBe(0);
      expect(result.total).toBe(1);
    });
  });

  describe('Pytest Parser', () => {
    it('parses standard verbose pytest output', () => {
      const output = `
============================= test session starts ==============================
rootdir: /workspace
collected 5 items

tests/test_basic.py::test_one PASSED                                     [ 20%]
tests/test_basic.py::test_two PASSED                                     [ 40%]
tests/test_basic.py::test_three SKIPPED (unsupported OS)                 [ 60%]
tests/test_basic.py::test_four FAILED                                    [ 80%]
tests/test_basic.py::test_five PASSED                                    [100%]

=================================== FAILURES ===================================
__________________________________ test_four ___________________________________
    def test_four():
>       assert 1 == 2
E       assert 1 == 2
tests/test_basic.py:12: AssertionError
=========================== short test summary info ============================
FAILED tests/test_basic.py::test_four - assert 1 == 2
=================== 1 failed, 3 passed, 1 skipped in 0.15s =====================
      `;
      const result = parsePytestOutput(output);
      expect(result.passed).toBe(3);
      expect(result.failed).toBe(1);
      expect(result.skipped).toBe(1);
      expect(result.total).toBe(5);
    });

    it('parses quiet pytest output (-q)', () => {
      const output = `
..sF.                                                                    [100%]
=================================== FAILURES ===================================
__________________________________ test_four ___________________________________
tests/test_basic.py:12: AssertionError
=========================== short test summary info ============================
FAILED tests/test_basic.py::test_four - assert 1 == 2
1 failed, 3 passed, 1 skipped in 0.08s
      `;
      const result = parsePytestOutput(output);
      expect(result.passed).toBe(3);
      expect(result.failed).toBe(1);
      expect(result.skipped).toBe(1);
      expect(result.total).toBe(5);
    });

    it('parses pytest collection failure / error during collection', () => {
      const output = `
============================= test session starts ==============================
rootdir: /workspace
collected 0 items / 1 error

==================================== ERRORS ====================================
________________________ ERROR collecting tests/test_broken.py ________________________
ImportError: No module named 'non_existent_module'
=========================== short test summary info ============================
ERROR tests/test_broken.py
!!!!!!!!!!!!!!!!!!!! Interrupted: 1 error during collection !!!!!!!!!!!!!!!!!!!!
=============================== 1 error in 0.05s ===============================
      `;
      const result = parsePytestOutput(output);
      expect(result.passed).toBe(0);
      expect(result.failed).toBe(1);
      expect(result.skipped).toBe(0);
      expect(result.total).toBe(1);
    });

    it('parses pytest with warnings, xfailed, xpassed, skipped, errors', () => {
      const output = `
=================== 2 failed, 10 passed, 3 skipped, 1 xfailed, 1 xpassed, 2 errors, 4 warnings in 2.34s ===================
      `;
      const result = parsePytestOutput(output);
      expect(result.passed).toBe(10);
      expect(result.failed).toBe(4); // 2 failed + 2 errors
      expect(result.skipped).toBe(3);
      expect(result.total).toBe(19); // 10 passed + 4 failed/err + 3 skipped + 1 xfailed + 1 xpassed
    });

    it('parses pytest with ANSI color codes present', () => {
      const output = `\x1b[32m5 passed\x1b[0m, \x1b[33m2 skipped\x1b[0m, \x1b[31m1 failed\x1b[0m in 0.12s`;
      const result = parsePytestOutput(output);
      expect(result.passed).toBe(5);
      expect(result.failed).toBe(1);
      expect(result.skipped).toBe(2);
      expect(result.total).toBe(8);
    });

    it('returns empty/unparsed for non-test output', () => {
      const output = `bash: pytest: command not found`;
      const result = parsePytestOutput(output);
      expect(result.passed).toBeUndefined();
      expect(result.failed).toBeUndefined();
      expect(result.total).toBeUndefined();
    });
  });

  describe('Vitest Parser', () => {
    it('parses standard vitest output with passed, failed, skipped', () => {
      const output = `
 Test Files  1 failed | 2 passed (3)
      Tests  2 failed | 8 passed | 1 skipped (11)
   Start at  22:00:00
   Duration  1.20s (transform 45ms, setup 0ms, collect 100ms, tests 800ms, environment 0ms, prepare 50ms)
      `;
      const result = parseVitestOutput(output);
      expect(result.passed).toBe(8);
      expect(result.failed).toBe(2);
      expect(result.skipped).toBe(1);
      expect(result.total).toBe(11);
    });

    it('parses vitest quiet / reporter output without pipe characters', () => {
      const output = `
 Tests  4 passed, 1 skipped (5)
 Duration  120ms
      `;
      const result = parseVitestOutput(output);
      expect(result.passed).toBe(4);
      expect(result.failed).toBe(0);
      expect(result.skipped).toBe(1);
      expect(result.total).toBe(5);
    });

    it('parses vitest with collection failure / syntax error', () => {
      const output = `
 FAIL  tests/broken.test.ts
Error: SyntaxError: Unexpected token
       at transform (src/index.ts:1:1)

 Test Files  1 failed (1)
      Tests  no tests
   Duration  50ms
      `;
      const result = parseVitestOutput(output);
      expect(result.failed).toBe(1);
      expect(result.passed).toBe(0);
      expect(result.total).toBe(1);
    });

    it('parses vitest all passing output', () => {
      const output = `
 Tests  15 passed (15)
 Duration  340ms
      `;
      const result = parseVitestOutput(output);
      expect(result.passed).toBe(15);
      expect(result.failed).toBe(0);
      expect(result.skipped).toBe(0);
      expect(result.total).toBe(15);
    });

    it('parses vitest only skipped tests', () => {
      const output = `
 Tests  3 skipped (3)
 Duration  20ms
      `;
      const result = parseVitestOutput(output);
      expect(result.passed).toBe(0);
      expect(result.failed).toBe(0);
      expect(result.skipped).toBe(3);
      expect(result.total).toBe(3);
    });
  });

  describe('Jest Parser', () => {
    it('parses standard jest output with passed, failed, skipped/todo', () => {
      const output = `
PASS src/foo.test.js
FAIL src/bar.test.js
  ● Test suite failed to run
    TypeError: Cannot read properties of undefined

Test Suites: 1 failed, 1 passed, 2 total
Tests:       2 failed, 1 skipped, 1 todo, 6 passed, 10 total
Snapshots:   0 total
Time:        3.456 s
Ran all test suites.
      `;
      const result = parseJestOutput(output);
      expect(result.passed).toBe(6);
      expect(result.failed).toBe(2);
      expect(result.skipped).toBe(2); // 1 skipped + 1 todo
      expect(result.total).toBe(10);
    });

    it('parses jest test suite failure with no individual tests run (collection failure)', () => {
      const output = `
FAIL src/broken.test.js
  ● Test suite failed to run
    SyntaxError: Unexpected identifier

Test Suites: 1 failed, 1 total
Tests:       0 total
Snapshots:   0 total
Time:        0.5 s
      `;
      const result = parseJestOutput(output);
      expect(result.passed).toBe(0);
      expect(result.failed).toBe(1);
      expect(result.total).toBe(1);
    });

    it('parses jest all passing output', () => {
      const output = `
Test Suites: 3 passed, 3 total
Tests:       12 passed, 12 total
Snapshots:   0 total
Time:        1.123 s
      `;
      const result = parseJestOutput(output);
      expect(result.passed).toBe(12);
      expect(result.failed).toBe(0);
      expect(result.skipped).toBe(0);
      expect(result.total).toBe(12);
    });

    it('parses jest CI output format', () => {
      const output = `
Test Suites: 5 passed, 5 total
Tests:       20 passed, 20 total
Snapshots:   0 total
Time:        4.567 s, estimated 5 s
Ran all test suites.
      `;
      const result = parseJestOutput(output);
      expect(result.passed).toBe(20);
      expect(result.failed).toBe(0);
      expect(result.total).toBe(20);
    });
  });

  describe('Auto-detection and Generic Fallback', () => {
    it('detects framework from output metrics', () => {
      const output = `
 Tests  5 passed (5)
 Duration  200ms
      `;
      const metrics = parseOutputMetrics(output);
      expect(metrics.framework).toBe('vitest');
      expect(metrics.passed).toBe(5);
    });
  });

  describe('Never treat unparsed output as success when claim exists', () => {
    it('fails verification if command exits 0 but output cannot be parsed for test metrics', async () => {
      const claims = [
        {
          type: 'tests_pass' as const,
          cmd: "node -e 'console.log(\"Some random non-test logging output\"); process.exit(0);'",
          passed: 5,
          total: 5,
        },
      ];

      const report = await verifyClaims(claims, { detectUnclaimed: false });
      expect(report.hasUnmet).toBe(true);
      expect(report.results[0].status).toBe('unmet');
      expect(report.results[0].details).toMatch(/unparsed|could not be parsed|no test metrics/i);
    });

    it('fails verification if command exits 0 but no test metrics were detected even with no claimed numbers', async () => {
      const claims = [
        {
          type: 'tests_pass' as const,
          cmd: "node -e 'console.log(\"Hello world\"); process.exit(0);'",
        },
      ];

      const report = await verifyClaims(claims, { detectUnclaimed: false });
      expect(report.hasUnmet).toBe(true);
      expect(report.results[0].status).toBe('unmet');
      expect(report.results[0].details).toMatch(/unparsed|could not be parsed|no test metrics/i);
    });
  });
});
