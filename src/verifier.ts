import { Claim, VerifyOptions, VerifyReport, VerificationResult } from './types.js';
import { executeTestCommand } from './runners/index.js';
import { checkFileEvidence } from './checker.js';
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
      if (claim.skipped !== undefined) claimParts.push(`skipped: ${claim.skipped}`);
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
      if (execution.skipped !== undefined) evidenceParts.push(`skipped: ${execution.skipped}`);
      if (execution.total !== undefined) evidenceParts.push(`total: ${execution.total}`);
      const evidenceSummary = evidenceParts.join(', ');

      // Determine status
      let upheld = true;
      let details: string | undefined;

      const hasMetrics = execution.passed !== undefined || execution.failed !== undefined || execution.skipped !== undefined || execution.total !== undefined;
      if (!hasMetrics) {
        upheld = false;
        details = 'Command output could not be parsed for test metrics (unparsed output)';
      }

      if (execution.exitCode !== 0) {
        upheld = false;
        details = details
          ? `${details}; Command exited with non-zero code ${execution.exitCode}`
          : `Command exited with non-zero code ${execution.exitCode}`;
      }

      // Check if claims included counts that could not be extracted from output
      const countsClaimed = claim.passed !== undefined || claim.failed !== undefined || claim.skipped !== undefined || claim.total !== undefined;
      const countsMissing = (claim.passed !== undefined && execution.passed === undefined) ||
                            (claim.failed !== undefined && execution.failed === undefined) ||
                            (claim.skipped !== undefined && execution.skipped === undefined) ||
                            (claim.total !== undefined && execution.total === undefined);

      if (countsClaimed && countsMissing) {
        upheld = false;
        const missingFields: string[] = [];
        if (claim.passed !== undefined && execution.passed === undefined) missingFields.push('passed');
        if (claim.failed !== undefined && execution.failed === undefined) missingFields.push('failed');
        if (claim.skipped !== undefined && execution.skipped === undefined) missingFields.push('skipped');
        if (claim.total !== undefined && execution.total === undefined) missingFields.push('total');
        const reason = `Claim specified test counts (${missingFields.join(', ')}), but parser could not extract them from command output`;
        details = details ? `${details}; ${reason}` : reason;
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

      if (claim.skipped !== undefined && execution.skipped !== undefined && execution.skipped !== claim.skipped) {
        upheld = false;
        details = details
          ? `${details}; claimed ${claim.skipped} skipped but observed ${execution.skipped}`
          : `Claimed ${claim.skipped} skipped but observed ${execution.skipped}`;
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

      const evidence = await checkFileEvidence(claim.path, {
        cwd,
        sinceTimestamp: options.sinceTimestamp,
      });

      let status: 'upheld' | 'unmet' = 'unmet';
      let evidenceSummary = '';
      let details: string | undefined;

      if (!evidence.exists) {
        evidenceSummary = 'does not exist';
        details = `File '${claim.path}' was not found`;
      } else if (!evidence.modifiedThisRun) {
        evidenceSummary = `exists (size: ${evidence.sizeBytes ?? 0} B, unchanged)`;
        details = `File '${claim.path}' exists but has no evidence of write or change this run (unmodified in git status and mtime prior to evaluation window)`;
      } else {
        status = 'upheld';
        evidenceSummary = `exists (size: ${evidence.sizeBytes ?? 0} B, modified/created)`;
      }

      results.push({
        id,
        type: 'file_written',
        status,
        claim,
        claimSummary,
        evidenceSummary,
        details,
      });
    }
  }

  // Detect unclaimed modified/untracked files if enabled
  if (options.detectUnclaimed !== false) {
    const gitFiles = await detectUntrackedAndModifiedFiles(cwd);
    let unclaimedIndex = 1;
    for (const file of gitFiles) {
      const isClaimed = Array.from(claimedFilePaths).some((claimedPath) => {
        const normClaimed = claimedPath.replace(/\\/g, '/').replace(/^\.\//, '');
        const normFile = file.replace(/\\/g, '/').replace(/^\.\//, '');
        if (normClaimed === normFile) return true;
        // If git file is a dir ending in / and claimed file is inside it
        if (normFile.endsWith('/') && normClaimed.startsWith(normFile)) return true;
        // If claimedPath is a directory and git file is inside it
        const claimedDir = normClaimed.endsWith('/') ? normClaimed : `${normClaimed}/`;
        if (normFile.startsWith(claimedDir)) return true;
        return false;
      });

      if (!isClaimed) {
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
