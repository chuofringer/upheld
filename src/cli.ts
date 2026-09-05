import { readFileSync, appendFileSync, writeFileSync, watch as fsWatch } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { parseClaimsJson, readClaimsFromFile } from './claims.js';
import { verifyClaims } from './verifier.js';
import { formatGitHubJobSummary, formatMarkdownSummary, formatTerminalTable, formatSarifReport } from './formatter.js';
import { initProject } from './init.js';
import { postGitHubCheckRun } from './github.js';
import { extractClaimsFromTranscript } from './extractor.js';
import { Claim, ClaimsDocument, VerifyOptions, VerifyReport } from './types.js';

function printHelp(): void {
  console.log(`
Upheld — Claims vs Evidence Verifier for AI Coding Agents
"Claims, upheld." / "Done means shown."

Usage:
  upheld init [options]
  upheld verify [options] [claims.json]
  cat claims.json | upheld verify [options]
  upheld extract <transcript> [options]
  cat transcript.jsonl | upheld extract [options]

Commands:
  init                 Bootstrap an .upheld configuration directory
  verify               Verify claims against empirical ground truth (default)
  extract              Extract tests_pass and file_written claims from agent transcripts

Init Options:
  --github-action      Drop a starter GitHub Action workflow (.github/workflows/upheld.yml)
  --force              Overwrite existing files
  --cwd <path>         Target working directory (default: current directory)

Verify Options:
  -w, --watch          Watch claims file for changes and re-verify automatically
  --strict             Exit with non-zero code if any claim is unmet (default: exit 0 in report mode)
  --format <type>      Output format: table (default), markdown, json, or sarif
  --cwd <path>         Working directory to evaluate claims in (default: current directory)
  --since <timestamp>  Evaluation window start timestamp (ms or ISO date) for file writes
  --no-unclaimed       Disable detection of unclaimed modified/untracked files
  --json               Shortcut for --format json
  --markdown           Shortcut for --format markdown
  --sarif              Shortcut for --format sarif
  --github-check       Post/update a GitHub check run named "Upheld — Claims vs evidence" (no-op if GITHUB_TOKEN/GITHUB_SHA missing)
  --summary            Output GitHub Action job summary format
  --summary-file <f>   Append job summary to specified file (or $GITHUB_STEP_SUMMARY)

Extraction Options:
  --out <file>         Write extracted claims JSON document to specified file (default: stdout)
  --no-dedupe          Do not deduplicate extracted claims
General Options:
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

  let command: 'verify' | 'extract' | 'init' = 'verify';
  let fileArg: string | undefined;
  let strict = false;
  let force = false;
  let githubAction = false;
  let watch = false;
  let format: 'table' | 'markdown' | 'json' | 'sarif' = 'table';
  let cwd = process.cwd();
  let sinceTimestamp: number | undefined;
  let detectUnclaimed = true;
  let summaryFile: string | undefined = process.env.GITHUB_STEP_SUMMARY;
  let writeSummary = false;
  let enableGitHubCheck = false;
  let outFile: string | undefined;
  let dedupe = true;

  // Check if first positional arg is a command
  let startIndex = 0;
  if (args[0] === 'verify') {
    command = 'verify';
    startIndex = 1;
  } else if (args[0] === 'extract') {
    command = 'extract';
    startIndex = 1;
  } else if (args[0] === 'init') {
    command = 'init';
    startIndex = 1;
  }

  for (let i = startIndex; i < args.length; i++) {
    const arg = args[i];
    if (arg === 'init') {
      command = 'init';
    } else if (arg === 'verify') {
      command = 'verify';
    } else if (arg === 'extract') {
      command = 'extract';
    } else if (arg === '-w' || arg === '--watch') {
      watch = true;
    } else if (arg === '--strict') {
      strict = true;
    } else if (arg === '--force') {
      force = true;
    } else if (arg === '--github-action') {
      githubAction = true;
    } else if (arg === '--json') {
      format = 'json';
    } else if (arg === '--markdown') {
      format = 'markdown';
    } else if (arg === '--sarif') {
      format = 'sarif';
    } else if (arg === '--github-check') {
      enableGitHubCheck = true;
    } else if (arg === '--summary') {
      format = 'markdown';
      writeSummary = true;
    } else if (arg === '--summary-file') {
      summaryFile = args[++i];
      writeSummary = true;
    } else if (arg === '--no-unclaimed') {
      detectUnclaimed = false;
    } else if (arg === '--out') {
      outFile = args[++i];
    } else if (arg === '--no-dedupe') {
      dedupe = false;
    } else if (arg === '--format') {
      const next = args[++i];
      if (next === 'table' || next === 'markdown' || next === 'json' || next === 'sarif') {
        format = next;
      } else {
        console.error(`Invalid format: ${next}. Choose table, markdown, json, or sarif.`);
        return 1;
      }
    } else if (arg === '--cwd') {
      cwd = args[++i];
    } else if (arg === '--since') {
      const val = args[++i];
      const parsedNum = Number(val);
      if (!isNaN(parsedNum) && parsedNum > 0) {
        sinceTimestamp = parsedNum;
      } else {
        const parsedDate = Date.parse(val);
        if (!isNaN(parsedDate)) {
          sinceTimestamp = parsedDate;
        } else {
          console.error(`Invalid --since value: ${val}`);
          return 1;
        }
      }
    } else if (!arg.startsWith('-')) {
      fileArg = arg;
    }
  }

  if (command === 'init') {
    try {
      const result = initProject({
        cwd,
        force,
        githubAction,
      });

      console.log(`Initialized Upheld configuration in ${result.targetDir}`);
      for (const created of result.createdFiles) {
        console.log(`  + Created: ${created}`);
      }
      for (const skipped of result.skippedFiles) {
        console.log(`  - Skipped (already exists, use --force to overwrite): ${skipped}`);
      }
      return 0;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`Error initializing project: ${message}`);
      return 1;
    }
  }

  if (command === 'extract') {
    let transcriptContent = '';
    try {
      if (fileArg) {
        transcriptContent = await readFile(fileArg, 'utf-8');
      } else {
        transcriptContent = await readStdin();
        if (!transcriptContent.trim()) {
          console.error('Error: No transcript input provided via file argument or stdin.');
          printHelp();
          return 1;
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`Error reading transcript: ${message}`);
      return 1;
    }

    const claims = extractClaimsFromTranscript(transcriptContent, { cwd, dedupe });
    const claimsDoc: ClaimsDocument = {
      version: '1.0',
      claims,
    };

    const outputJson = JSON.stringify(claimsDoc, null, 2);

    if (outFile) {
      try {
        writeFileSync(outFile, outputJson, 'utf-8');
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`Error writing claims output to ${outFile}: ${message}`);
        return 1;
      }
    } else {
      console.log(outputJson);
    }

    return 0;
  }

  if (command !== 'verify') {
    console.error(`Unknown command: ${command}`);
    printHelp();
    return 1;
  }

  const options: VerifyOptions = {
    cwd,
    strict,
    detectUnclaimed,
    sinceTimestamp,
  };

  const executeVerification = async (claimsToVerify: Claim[]): Promise<VerifyReport> => {
    const report = await verifyClaims(claimsToVerify, options);

    if (format === 'json') {
      console.log(JSON.stringify(report, null, 2));
    } else if (format === 'markdown') {
      console.log(formatMarkdownSummary(report));
    } else if (format === 'sarif') {
      console.log(formatSarifReport(report));
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

    return report;
  };

  if (watch) {
    if (!fileArg) {
      console.error('Error: --watch requires a claims file path.');
      return 1;
    }

    console.log(`[upheld] Watching for changes in ${fileArg}... (Press Ctrl+C to stop)`);

    const runWatchIteration = async () => {
      try {
        const claims = await readClaimsFromFile(fileArg);
        console.log(`\n[upheld] Claims file changed: ${new Date().toLocaleTimeString()}`);
        await executeVerification(claims);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`[upheld] Error reloading claims: ${message}`);
      }
    };

    // Initial run
    await runWatchIteration();

    let debounceTimer: NodeJS.Timeout | null = null;
    const watcher = fsWatch(fileArg, (eventType) => {
      if (eventType === 'change' || eventType === 'rename') {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          runWatchIteration();
        }, 150);
      }
    });

    return new Promise((resolve) => {
      const cleanup = () => {
        if (debounceTimer) clearTimeout(debounceTimer);
        watcher.close();
        resolve(0);
      };
      process.on('SIGINT', cleanup);
      process.on('SIGTERM', cleanup);
    });
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

  const report = await executeVerification(claims);

  if (enableGitHubCheck) {
    try {
      const checkResult = await postGitHubCheckRun(report);
      if (checkResult.posted) {
        if (format !== 'json' && format !== 'sarif') {
          console.log(`GitHub Check Run posted: ${checkResult.url ?? `Check Run #${checkResult.checkRunId}`}`);
        }
      } else if (checkResult.error) {
        console.error(`Warning: Failed to post GitHub check run: ${checkResult.error}`);
      }
      // If skipped due to missing tokens/env (e.g. running locally), gracefully no-op quietly
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`Warning: Unexpected error posting GitHub check run: ${message}`);
    }
  }

  if (strict && report.hasUnmet) {
    return 1;
  }

  return 0;
}
