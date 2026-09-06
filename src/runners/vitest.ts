export interface ParsedVitestOutput {
  framework: 'vitest';
  passed?: number;
  failed?: number;
  skipped?: number;
  total?: number;
}

export function parseVitestOutput(output: string): ParsedVitestOutput {
  // Strip ANSI codes
  const clean = output.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '');

  let passed: number | undefined;
  let failed: number | undefined;
  let skipped: number | undefined;
  let total: number | undefined;

  // Check for test file collection failure / syntax error: e.g. "Test Files 1 failed (1)" with "Tests no tests"
  const testFilesFail = clean.match(/Test Files\s+(\d+)\s+failed/i);
  const testsNoTests = clean.match(/Tests\s+(?:no\s+tests|0\s+total)/i);

  // Pattern: Tests 2 failed | 8 passed | 1 skipped (11)
  const testsLine = clean.match(/Tests\s+([^\n]+)/);
  if (testsLine) {
    const text = testsLine[1];
    const passMatch = text.match(/(\d+)\s+passed/);
    if (passMatch) {
      passed = parseInt(passMatch[1], 10);
    }
    const failMatch = text.match(/(\d+)\s+failed/);
    if (failMatch) {
      failed = parseInt(failMatch[1], 10);
    }
    const skipMatch = text.match(/(\d+)\s+skipped/);
    if (skipMatch) {
      skipped = parseInt(skipMatch[1], 10);
    }
    const totalMatch = text.match(/\((\d+)\)/);
    if (totalMatch) {
      total = parseInt(totalMatch[1], 10);
    } else if (passed !== undefined || failed !== undefined || skipped !== undefined) {
      total = (passed ?? 0) + (failed ?? 0) + (skipped ?? 0);
    }

    if (passMatch || failMatch || skipMatch || totalMatch) {
      return {
        framework: 'vitest',
        passed: passed ?? 0,
        failed: failed ?? 0,
        skipped: skipped ?? 0,
        total: total ?? ((passed ?? 0) + (failed ?? 0) + (skipped ?? 0)),
      };
    }
  }

  // Handle suite / file collection failure where Tests didn't run
  if (testFilesFail && (testsNoTests || clean.includes('FAIL '))) {
    const failedFiles = parseInt(testFilesFail[1], 10);
    return {
      framework: 'vitest',
      passed: 0,
      failed: failedFiles,
      skipped: 0,
      total: failedFiles,
    };
  }

  // If "Test Files" line exists with passed
  const testFilesLine = clean.match(/Test Files\s+([^\n]+)/);
  if (testFilesLine) {
    const text = testFilesLine[1];
    const passMatch = text.match(/(\d+)\s+passed/);
    const failMatch = text.match(/(\d+)\s+failed/);
    if (passMatch || failMatch) {
      return {
        framework: 'vitest',
        passed: passMatch ? parseInt(passMatch[1], 10) : 0,
        failed: failMatch ? parseInt(failMatch[1], 10) : 0,
        skipped: 0,
        total: (passMatch ? parseInt(passMatch[1], 10) : 0) + (failMatch ? parseInt(failMatch[1], 10) : 0),
      };
    }
  }

  return {
    framework: 'vitest',
  };
}
