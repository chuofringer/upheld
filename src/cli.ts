#!/usr/bin/env node
import * as fs from 'node:fs';
import * as path from 'node:path';
import { verifyClaims } from './verifier.js';
import { diffReports, formatCompactDiff } from './diff.js';
import { Claim, ClaimResult, VerificationReport } from './types.js';

function printHelp() {
  console.log(`
upheld — Claims vs evidence verifier for AI coding agents. Done means shown.

Usage:
  upheld verify <claims.json> [--out <report.json>]
  upheld diff <base.json> <target.json> [--json] [--no-color]
  upheld diff <base.json> --run <claims.json> [--json] [--no-color]
  upheld help

Commands:
  verify       Evaluate claims against rules & environment evidence, producing a VerificationReport.
  diff         Compare two claim-result reports (or a base report against a freshly verified claims run)
               and output a compact delta of newly Upheld, newly Unmet, and newly Unclaimed items.

Options:
  --json       Output raw JSON DiffReport instead of human-readable summary.
  --no-color   Disable ANSI color codes.
  --out <file> Save verification result to target JSON file.
`);
}

function loadJsonFile<T>(filePath: string): T {
  const resolved = path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(resolved)) {
    throw new Error(`File not found: ${filePath} (${resolved})`);
  }
  const content = fs.readFileSync(resolved, 'utf-8');
  try {
    return JSON.parse(content) as T;
  } catch (err) {
    throw new Error(`Failed to parse JSON in ${filePath}: ${(err as Error).message}`);
  }
}

async function run() {
  const args = process.argv.slice(2);
  if (args.length === 0 || args[0] === 'help' || args[0] === '--help' || args[0] === '-h') {
    printHelp();
    process.exit(0);
  }

  const command = args[0];

  if (command === 'verify') {
    const claimsPath = args[1];
    if (!claimsPath) {
      console.error('Error: Missing claims.json path for verify.');
      process.exit(1);
    }
    const claims = loadJsonFile<Claim[]>(claimsPath);
    const report = verifyClaims(claims);

    const outIndex = args.indexOf('--out');
    if (outIndex !== -1 && args[outIndex + 1]) {
      const outPath = path.resolve(process.cwd(), args[outIndex + 1]);
      fs.writeFileSync(outPath, JSON.stringify(report, null, 2), 'utf-8');
      console.log(`Report written to ${args[outIndex + 1]}`);
    } else {
      console.log(JSON.stringify(report, null, 2));
    }
    process.exit(report.summary.unmet > 0 ? 1 : 0);
  }

  if (command === 'diff') {
    const isJson = args.includes('--json');
    const noColor = args.includes('--no-color') || !process.stdout.isTTY;
    const runIndex = args.indexOf('--run');

    const cleanArgs = args.slice(1).filter(a => !a.startsWith('--'));

    if (cleanArgs.length === 0) {
      console.error('Error: Missing base report file path for diff.');
      process.exit(1);
    }

    const basePath = cleanArgs[0];
    const baseData = loadJsonFile<VerificationReport | ClaimResult[]>(basePath);

    let targetData: VerificationReport | ClaimResult[];

    if (runIndex !== -1 && args[runIndex + 1]) {
      const claimsToRunPath = args[runIndex + 1];
      const claims = loadJsonFile<Claim[]>(claimsToRunPath);
      targetData = verifyClaims(claims);
    } else {
      if (cleanArgs.length < 2) {
        console.error('Error: Please provide either a target report JSON or --run <claims.json>.');
        process.exit(1);
      }
      const targetPath = cleanArgs[1];
      targetData = loadJsonFile<VerificationReport | ClaimResult[]>(targetPath);
    }

    const diff = diffReports(baseData, targetData);

    if (isJson) {
      console.log(JSON.stringify(diff, null, 2));
    } else {
      console.log(formatCompactDiff(diff, { color: !noColor }));
    }

    // Exit non-zero if there are newly unmet claims (regressions)
    if (diff.summary.newlyUnmetCount > 0) {
      process.exit(2);
    }
    process.exit(0);
  }

  console.error(`Unknown command: ${command}`);
  printHelp();
  process.exit(1);
}

run().catch((err) => {
  console.error(`Fatal error: ${err.message}`);
  process.exit(1);
});
