export interface ParsedTestOutput {
  framework: 'pytest';
  passed?: number;
  failed?: number;
  total?: number;
}

export function parsePytestOutput(output: string): ParsedTestOutput {
  // Strip ANSI color codes
  const clean = output.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '');

  let passed = 0;
  let failed = 0;
  let skipped = 0;
  let errorCount = 0;

  const passedMatch = clean.match(/(\d+)\s+passed/);
  if (passedMatch) {
    passed = parseInt(passedMatch[1], 10);
  }

  const failedMatch = clean.match(/(\d+)\s+failed/);
  if (failedMatch) {
    failed = parseInt(failedMatch[1], 10);
  }

  const errorMatch = clean.match(/(\d+)\s+error/);
  if (errorMatch) {
    errorCount = parseInt(errorMatch[1], 10);
  }

  const skippedMatch = clean.match(/(\d+)\s+skipped/);
  if (skippedMatch) {
    skipped = parseInt(skippedMatch[1], 10);
  }

  const total = passed + failed + errorCount + skipped;

  return {
    framework: 'pytest',
    passed: passedMatch ? passed : undefined,
    failed: failedMatch || errorMatch ? failed + errorCount : 0,
    total: total > 0 ? total : undefined,
  };
}
