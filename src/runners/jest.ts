export interface ParsedJestOutput {
  framework: 'jest';
  passed?: number;
  failed?: number;
  skipped?: number;
  total?: number;
}

export function parseJestOutput(output: string): ParsedJestOutput {
  // Strip ANSI codes
  const clean = output.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '');

  let passed: number | undefined;
  let failed: number | undefined;
  let skipped: number | undefined;
  let total: number | undefined;

  // Check for test suite collection failure where Tests is 0 total or missing
  const testSuitesLine = clean.match(/Test Suites:\s+([^\n]+)/);
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
    const skipMatch = text.match(/(\d+)\s+(?:skipped|todo)/g);
    if (skipMatch) {
      skipped = 0;
      for (const s of skipMatch) {
        const num = s.match(/(\d+)/);
        if (num) skipped += parseInt(num[1], 10);
      }
    }
    const totalMatch = text.match(/(\d+)\s+total/);
    if (totalMatch) {
      total = parseInt(totalMatch[1], 10);
    }

    // If Tests: 0 total but Test Suites reported failure
    if (total === 0 && testSuitesLine) {
      const suitesText = testSuitesLine[1];
      const failSuites = suitesText.match(/(\d+)\s+failed/);
      const totalSuites = suitesText.match(/(\d+)\s+total/);
      if (failSuites) {
        const failCount = parseInt(failSuites[1], 10);
        return {
          framework: 'jest',
          passed: 0,
          failed: failCount,
          skipped: 0,
          total: totalSuites ? parseInt(totalSuites[1], 10) : failCount,
        };
      }
    }

    if (passMatch || failMatch || skipMatch || totalMatch) {
      return {
        framework: 'jest',
        passed: passed ?? 0,
        failed: failed ?? 0,
        skipped: skipped ?? 0,
        total: total ?? ((passed ?? 0) + (failed ?? 0) + (skipped ?? 0)),
      };
    }
  }

  // Handle cases where Tests line is missing entirely but Test Suites exists
  if (testSuitesLine) {
    const text = testSuitesLine[1];
    const passSuites = text.match(/(\d+)\s+passed/);
    const failSuites = text.match(/(\d+)\s+failed/);
    const totalSuites = text.match(/(\d+)\s+total/);

    const failCount = failSuites ? parseInt(failSuites[1], 10) : 0;
    const passCount = passSuites ? parseInt(passSuites[1], 10) : 0;
    const totalCount = totalSuites ? parseInt(totalSuites[1], 10) : (passCount + failCount);

    return {
      framework: 'jest',
      passed: passCount,
      failed: failCount,
      skipped: 0,
      total: totalCount,
    };
  }

  return {
    framework: 'jest',
  };
}
