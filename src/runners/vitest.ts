export interface ParsedVitestOutput {
  framework: 'vitest';
  passed?: number;
  failed?: number;
  total?: number;
}

export function parseVitestOutput(output: string): ParsedVitestOutput {
  // Strip ANSI codes
  const clean = output.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '');

  let passed: number | undefined;
  let failed: number | undefined;
  let total: number | undefined;

  // Pattern: Tests  1 failed | 4 passed (5) or Tests  5 passed (5)
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
    const totalMatch = text.match(/\((\d+)\)/);
    if (totalMatch) {
      total = parseInt(totalMatch[1], 10);
    } else if (passed !== undefined || failed !== undefined) {
      total = (passed ?? 0) + (failed ?? 0);
    }
  }

  return {
    framework: 'vitest',
    passed,
    failed: failed ?? 0,
    total,
  };
}
