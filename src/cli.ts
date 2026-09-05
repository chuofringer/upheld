import { readFileSync, appendFileSync } from 'node:fs';
import { parseClaimsJson, readClaimsFromFile } from './claims.js';
import { verifyClaims } from './verifier.js';
import { formatGitHubJobSummary, formatMarkdownSummary, formatTerminalTable } from './formatter.js';
import { Claim, VerifyOptions, VerifyReport } from './types.js';
import { getGitDiff } from './git.js';
import { lintDiffString } from './linter.js';

function printHelp(): void {
  console.log(`
Upheld — Claims vs Evidence Verifier for AI Coding Agents
"Claims, upheld." / "Done means shown."

Usage:
  upheld verify [options] [claims.json]
  upheld lint-diff [options] [patch.diff]
  cat claims.json | upheld verify [options]
  cat patch.diff | upheld lint-diff [options]

Commands:
  verify               Verify claims against evidence (default command)
  lint-diff            Scan git diff or patch for reward-hacking and claim-tampering patterns

Options:
  --strict             Exit with non-zero code if any claim is unmet / tampering found
  --base <ref>         Git base revision to diff against (e.g. main, HEAD~1)
  --patch <file>       Path to a patch or diff file to analyze
  --lint-diff          (for verify) Enable reward-hack / diff tampering check during claims verification
  --format <type>      Output format: table (default), markdown, or json
  --cwd <path>         Working directory to evaluate claims in (default: current directory)
  --no-unclaimed       Disable detection of unclaimed modified/untracked files
  --json               Shortcut for --format json
  --markdown           Shortcut for --format markdown
  --summary            Output GitHub Action job summary format
  --summary-file <f>   Append job summary to specified file (or $GITHUB_STEP_SUMMARY)
  -h, --help           Show this help message
  -v, --version        Show version
`);
}

async function readStdin(): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = '';
    process.stdin.setEncoding('utf-8');

    if (process.stdin.isTTY) {
      resolve('');
      return;
    }

    process.stdin.on('data', (chunk) => {
      data += chunk;
    });

    process.stdin.on('end', () => {
      resolve(data);
    });

    process.stdin.on('error', (err) => {
      reject(err);
    });
  });
}

export async function runCli(args: string[] = process.argv.slice(2)): Promise<number> {
  if (args.includes('-h') || args.includes('--help') || (args.length === 0 && process.stdin.isTTY)) {
    printHelp();
    return 0;
  }

  if (args.includes('-v') || args.includes('--version')) {
    try {
      console.log('upheld v0.0.1');
    } catch {
      console.log('0.0.1');
    }
    return 0;
  }

  let command: 'verify' | 'lint-diff' | undefined;
  let fileArg: string | undefined;
  let strict = false;
  let format: 'table' | 'markdown' | 'json' = 'table';
  let cwd = process.cwd();
  let detectUnclaimed = true;
  let lintDiff = false;
  let base: string | undefined;
  let patchFile: string | undefined;
  let summaryFile: string | undefined = process.env.GITHUB_STEP_SUMMARY;
  let writeSummary = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === 'verify') {
      command = 'verify';
    } else if (arg === 'lint-diff') {
      command = 'lint-diff';
    } else if (arg === '--strict') {
      strict = true;
    } else if (arg === '--lint-diff') {
      lintDiff = true;
    } else if (arg === '--base') {
      base = args[++i];
    } else if (arg === '--patch') {
      patchFile = args[++i];
    } else if (arg === '--json') {
      format = 'json';
    } else if (arg === '--markdown') {
      format = 'markdown';
    } else if (arg === '--summary') {
      format = 'markdown';
      writeSummary = true;
    } else if (arg === '--summary-file') {
      summaryFile = args[++i];
      writeSummary = true;
    } else if (arg === '--no-unclaimed') {
      detectUnclaimed = false;
    } else if (arg === '--format') {
      const next = args[++i];
      if (next === 'table' || next === 'markdown' || next === 'json') {
        format = next;
      } else {
        console.error(`Invalid format: ${next}. Choose table, markdown, or json.`);
        return 1;
      }
    } else if (arg === '--cwd') {
      cwd = args[++i];
    } else if (!arg.startsWith('-')) {
      fileArg = arg;
    }
  }

  if (!command) {
    command = 'verify';
  }

  if (command === 'lint-diff') {
    let diffText = '';
    if (patchFile) {
      try {
        diffText = readFileSync(patchFile, 'utf-8');
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`Error reading patch file '${patchFile}': ${message}`);
        return 1;
      }
    } else if (fileArg) {
      try {
        diffText = readFileSync(fileArg, 'utf-8');
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`Error reading patch file '${fileArg}': ${message}`);
        return 1;
      }
    } else {
      const stdinData = await readStdin();
      if (stdinData.trim()) {
        diffText = stdinData;
      } else {
        diffText = await getGitDiff(cwd, base);
      }
    }

    const lintRes = lintDiffString(diffText);
    const claimSummary = base ? `diff against ${base} free of tampering` : 'diff free of tampering';
    const evidenceSummary = lintRes.tampered
      ? `${lintRes.findings.length} tampering pattern(s) detected`
      : `clean diff (${lintRes.diffSummary.filesScanned} file(s) scanned)`;

    const report: VerifyReport = {
      timestamp: new Date().toISOString(),
      cwd,
      results: [
        {
          id: 'diff-1',
          type: 'diff_tampering',
          status: lintRes.tampered ? 'unmet' : 'upheld',
          claimSummary,
          evidenceSummary,
          details: lintRes.tampered
            ? lintRes.findings.map((f) => `${f.file}${f.line ? `:${f.line}` : ''}: ${f.reason} [${f.snippet || f.ruleId}]`).join('; ')
            : undefined,
        },
      ],
      summary: {
        total: 1,
        upheld: lintRes.tampered ? 0 : 1,
        unmet: lintRes.tampered ? 1 : 0,
        unclaimed: 0,
      },
      hasUnmet: lintRes.tampered,
    };

    if (format === 'json') {
      console.log(JSON.stringify(report, null, 2));
    } else if (format === 'markdown') {
      console.log(formatMarkdownSummary(report));
    } else {
      console.log(formatTerminalTable(report));
    }

    if ((writeSummary || process.env.GITHUB_STEP_SUMMARY) && summaryFile) {
      try {
        const jobSummaryMd = formatGitHubJobSummary(report);
        appendFileSync(summaryFile, `\n${jobSummaryMd}\n`, 'utf-8');
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`Warning: Failed to write GitHub step summary to ${summaryFile}: ${message}`);
      }
    }

    if (strict && report.hasUnmet) {
      return 1;
    }

    return 0;
  }

  let claims: Claim[] = [];

  try {
    if (fileArg) {
      claims = await readClaimsFromFile(fileArg);
    } else {
      const stdinData = await readStdin();
      if (!stdinData.trim()) {
        console.error('Error: No claims input provided via file argument or stdin.');
        printHelp();
        return 1;
      }
      claims = parseClaimsJson(stdinData);
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Error loading claims: ${message}`);
    return 1;
  }

  let patchContent: string | undefined;
  if (patchFile) {
    try {
      patchContent = readFileSync(patchFile, 'utf-8');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`Error reading patch file '${patchFile}': ${message}`);
      return 1;
    }
  }

  const options: VerifyOptions = {
    cwd,
    strict,
    detectUnclaimed,
    lintDiff,
    diffBase: base,
    patch: patchContent,
  };

  const report = await verifyClaims(claims, options);

  if (format === 'json') {
    console.log(JSON.stringify(report, null, 2));
  } else if (format === 'markdown') {
    console.log(formatMarkdownSummary(report));
  } else {
    console.log(formatTerminalTable(report));
  }

  // If in GitHub Action environment or requested summary file, write job summary
  if ((writeSummary || process.env.GITHUB_STEP_SUMMARY) && summaryFile) {
    try {
      const jobSummaryMd = formatGitHubJobSummary(report);
      appendFileSync(summaryFile, `\n${jobSummaryMd}\n`, 'utf-8');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`Warning: Failed to write GitHub step summary to ${summaryFile}: ${message}`);
    }
  }

  if (strict && report.hasUnmet) {
    return 1;
  }

  return 0;
}
