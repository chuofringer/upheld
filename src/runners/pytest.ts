export interface ParsedPytestOutput {
  framework: 'pytest';
  passed?: number;
  failed?: number;
  skipped?: number;
  total?: number;
}

export function parsePytestOutput(output: string): ParsedPytestOutput {
  // Strip ANSI color codes
  const clean = output.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '');

  let passedMatch = clean.match(/(\d+)\s+passed/);
  let failedMatch = clean.match(/(\d+)\s+failed/);
  let errorMatch = clean.match(/(\d+)\s+errors?/);
  let skippedMatch = clean.match(/(\d+)\s+skipped/);
  let xfailedMatch = clean.match(/(\d+)\s+xfailed/);
  let xpassedMatch = clean.match(/(\d+)\s+xpassed/);

  // Check for collection error summary: "Interrupted: 1 error during collection" or "collected 0 items / 1 error"
  const collectionErrorMatch = clean.match(/(\d+)\s+error(?:s)?\s+during\s+collection/i) ||
    clean.match(/collected\s+\d+\s+items?\s*\/\s*(\d+)\s+error/i);

  let hasAnyMatch = Boolean(
    passedMatch ||
    failedMatch ||
    errorMatch ||
    skippedMatch ||
    xfailedMatch ||
    xpassedMatch ||
    collectionErrorMatch
  );

  if (!hasAnyMatch) {
    return {
      framework: 'pytest',
    };
  }

  let passed = passedMatch ? parseInt(passedMatch[1], 10) : 0;
  let failed = failedMatch ? parseInt(failedMatch[1], 10) : 0;
  let errorCount = errorMatch ? parseInt(errorMatch[1], 10) : 0;
  let skipped = skippedMatch ? parseInt(skippedMatch[1], 10) : 0;
  let xfailed = xfailedMatch ? parseInt(xfailedMatch[1], 10) : 0;
  let xpassed = xpassedMatch ? parseInt(xpassedMatch[1], 10) : 0;

  if (collectionErrorMatch && errorCount === 0) {
    errorCount = parseInt(collectionErrorMatch[1], 10);
  }

  const totalFailed = failed + errorCount;
  const totalSkipped = skipped;
  const total = passed + totalFailed + totalSkipped + xfailed + xpassed;

  return {
    framework: 'pytest',
    passed,
    failed: totalFailed,
    skipped: totalSkipped,
    total: total > 0 ? total : undefined,
  };
}
