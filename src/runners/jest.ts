export interface ParsedJestOutput {
  framework: 'jest';
  passed?: number;
  failed?: number;
  total?: number;
}

export function parseJestOutput(output: string): ParsedJestOutput {
  // Strip ANSI codes
  const clean = output.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '');

  let passed: number | undefined;
  let failed: number | undefined;
  let total: number | undefined;

  // Pattern: Tests:       1 failed, 4 passed, 5 total
  const testsLine = clean.match(/Tests:\s+([^\n]+)/);
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
    const totalMatch = text.match(/(\d+)\s+total/);
    if (totalMatch) {
      total = parseInt(totalMatch[1], 10);
    }
  }

  return {
    framework: 'jest',
    passed,
    failed: failed ?? 0,
    total,
  };
}
