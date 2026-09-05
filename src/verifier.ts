import { Claim, VerifyOptions, VerifyReport, VerificationResult } from './types.js';
import { executeTestCommand } from './runners/index.js';
import { checkFileExists } from './checker.js';
import { detectUntrackedAndModifiedFiles } from './git.js';

export async function verifyClaims(
  claims: Claim[],
  options: VerifyOptions = {}
): Promise<VerifyReport> {
  const cwd = options.cwd ?? process.cwd();
  const results: VerificationResult[] = [];

  const claimedFilePaths = new Set<string>();

  for (let i = 0; i < claims.length; i++) {
    const claim = claims[i];
    const id = `claim-${i + 1}`;

    if (claim.type === 'tests_pass') {
      const claimParts: string[] = [`cmd: ${claim.cmd}`];
      if (claim.passed !== undefined) claimParts.push(`passed: ${claim.passed}`);
      if (claim.failed !== undefined) claimParts.push(`failed: ${claim.failed}`);
      if (claim.total !== undefined) claimParts.push(`total: ${claim.total}`);
      const claimSummary = claimParts.join(', ');

      const execution = await executeTestCommand(claim.cmd, {
        cwd,
        timeoutMs: options.timeoutMs,
        env: options.env,
      });

      const evidenceParts: string[] = [`exit: ${execution.exitCode}`];
      if (execution.passed !== undefined) evidenceParts.push(`passed: ${execution.passed}`);
      if (execution.failed !== undefined) evidenceParts.push(`failed: ${execution.failed}`);
      if (execution.total !== undefined) evidenceParts.push(`total: ${execution.total}`);
      const evidenceSummary = evidenceParts.join(', ');

      // Determine status
      let upheld = true;
      let details: string | undefined;

      if (execution.exitCode !== 0) {
        upheld = false;
        details = `Command exited with non-zero code ${execution.exitCode}`;
      }

      if (claim.passed !== undefined && execution.passed !== undefined && execution.passed !== claim.passed) {
        upheld = false;
        details = details
          ? `${details}; claimed ${claim.passed} passed but observed ${execution.passed}`
          : `Claimed ${claim.passed} passed but observed ${execution.passed}`;
      }

      if (claim.failed !== undefined && execution.failed !== undefined && execution.failed !== claim.failed) {
        upheld = false;
        details = details
          ? `${details}; claimed ${claim.failed} failed but observed ${execution.failed}`
          : `Claimed ${claim.failed} failed but observed ${execution.failed}`;
      }

      if (claim.total !== undefined && execution.total !== undefined && execution.total !== claim.total) {
        upheld = false;
        details = details
          ? `${details}; claimed ${claim.total} total but observed ${execution.total}`
          : `Claimed ${claim.total} total but observed ${execution.total}`;
      }

      results.push({
        id,
        type: 'tests_pass',
        status: upheld ? 'upheld' : 'unmet',
        claim,
        claimSummary,
        evidenceSummary,
        details,
      });
    } else if (claim.type === 'file_written') {
      claimedFilePaths.add(claim.path);
      const claimSummary = `path: ${claim.path}`;

      const evidence = await checkFileExists(claim.path, cwd);
      const evidenceSummary = evidence.exists
        ? `exists (size: ${evidence.sizeBytes ?? 0} B)`
        : 'does not exist';

      results.push({
        id,
        type: 'file_written',
        status: evidence.exists ? 'upheld' : 'unmet',
        claim,
        claimSummary,
        evidenceSummary,
        details: evidence.exists ? undefined : `File '${claim.path}' was not found`,
      });
    }
  }

  // Detect unclaimed modified/untracked files if enabled
  if (options.detectUnclaimed !== false) {
    const gitFiles = await detectUntrackedAndModifiedFiles(cwd);
    let unclaimedIndex = 1;
    for (const file of gitFiles) {
      if (!claimedFilePaths.has(file)) {
        results.push({
          id: `unclaimed-${unclaimedIndex++}`,
          type: 'unclaimed_file',
          status: 'unclaimed',
          claimSummary: '(none)',
          evidenceSummary: `unclaimed file written/modified: ${file}`,
          details: `File '${file}' was modified or created in git status but not claimed`,
        });
      }
    }
  }

  let upheldCount = 0;
  let unmetCount = 0;
  let unclaimedCount = 0;

  for (const r of results) {
    if (r.status === 'upheld') upheldCount++;
    else if (r.status === 'unmet') unmetCount++;
    else if (r.status === 'unclaimed') unclaimedCount++;
  }

  return {
    timestamp: new Date().toISOString(),
    cwd,
    results,
    summary: {
      total: results.length,
      upheld: upheldCount,
      unmet: unmetCount,
      unclaimed: unclaimedCount,
    },
    hasUnmet: unmetCount > 0,
  };
}
