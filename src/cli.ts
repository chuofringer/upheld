#!/usr/bin/env node
import * as fs from 'node:fs';
import * as path from 'node:path';
import { runVerification, ClaimDefinition } from './verifier.js';
import { appendLedgerEntry, getLedgerSummary, formatLedgerSummary } from './ledger.js';
import type { ExitMode } from './types.js';

interface CliArgs {
  command: string;
  subcommand?: string;
  configPath?: string;
  ledgerPath?: string;
  limit?: number;
  reverse?: boolean;
  json?: boolean;
  help?: boolean;
  version?: boolean;
}

function parseArgs(args: string[]): CliArgs {
  const result: CliArgs = {
    command: 'verify',
  };

  const positional: string[] = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--help' || arg === '-h') {
      result.help = true;
    } else if (arg === '--version' || arg === '-v') {
      result.version = true;
    } else if (arg === '--ledger' || arg === '-l') {
      result.ledgerPath = args[++i];
    } else if (arg.startsWith('--ledger=')) {
      result.ledgerPath = arg.substring('--ledger='.length);
    } else if (arg === '--config' || arg === '-c') {
      result.configPath = args[++i];
    } else if (arg.startsWith('--config=')) {
      result.configPath = arg.substring('--config='.length);
    } else if (arg === '--limit' || arg === '-n') {
      result.limit = parseInt(args[++i], 10);
    } else if (arg.startsWith('--limit=')) {
      result.limit = parseInt(arg.substring('--limit='.length), 10);
    } else if (arg === '--reverse' || arg === '-r') {
      result.reverse = true;
    } else if (arg === '--json') {
      result.json = true;
    } else if (!arg.startsWith('-')) {
      positional.push(arg);
    }
  }

  if (positional.length > 0) {
    if (positional[0] === 'ledger') {
      result.command = 'ledger';
      result.subcommand = positional[1] || 'summary';
    } else if (positional[0] === 'verify') {
      result.command = 'verify';
      if (positional[1] && !result.configPath) {
        result.configPath = positional[1];
      }
    } else if (positional[0] === 'summary') {
      result.command = 'ledger';
      result.subcommand = 'summary';
    } else {
      result.command = positional[0];
    }
  }

  return result;
}

function printHelp() {
  console.log(`
upheld - claims vs evidence verifier for AI coding agents. Done means shown.

USAGE:
  upheld [command] [options]

COMMANDS:
  verify [config]           Run claim verification against evidence (default command)
  ledger summary [options]  Show summary of recent verification runs from the local ledger

OPTIONS:
  --ledger, -l <path>       Path to local claim receipt ledger JSONL file (e.g. .upheld/ledger.jsonl)
  --config, -c <path>       Path to claims definition file (default: .upheld.json, claims.json, or package.json)
  --limit, -n <number>      Number of runs to show in ledger summary (default: 10)
  --reverse, -r             Reverse the order of ledger summary runs
  --json                    Output results as JSON
  --version, -v             Show version
  --help, -h                Show this help message

EXAMPLES:
  upheld verify --ledger receipts.jsonl
  upheld --ledger .upheld/ledger.jsonl
  upheld ledger summary --ledger .upheld/ledger.jsonl --limit 5
  upheld ledger summary --ledger receipts.jsonl --json
`);
}

function loadClaims(configPath?: string): ClaimDefinition[] {
  const defaultPaths = ['.upheld.json', 'upheld.json', 'claims.json', '.claims.json'];
  let resolved: string | null = null;

  if (configPath) {
    resolved = path.resolve(configPath);
    if (!fs.existsSync(resolved)) {
      console.error(`Error: Config file not found at ${configPath}`);
      process.exit(1);
    }
  } else {
    for (const p of defaultPaths) {
      const full = path.resolve(p);
      if (fs.existsSync(full)) {
        resolved = full;
        break;
      }
    }
  }

  if (resolved && fs.existsSync(resolved)) {
    try {
      const raw = fs.readFileSync(resolved, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
      if (parsed && Array.isArray(parsed.claims)) {
        return parsed.claims;
      }
    } catch (err) {
      console.error(`Failed to parse claims config at ${resolved}:`, err);
      process.exit(1);
    }
  }

  // Check package.json test script as fallback auto-claim if no explicit config found
  const pkgPath = path.resolve('package.json');
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      const claims: ClaimDefinition[] = [];
      if (pkg.scripts?.test) {
        claims.push({
          id: 'test-suite',
          description: 'Package test suite passes',
          type: 'command',
          command: 'npm test',
        });
      }
      if (claims.length > 0) {
        return claims;
      }
    } catch {
      // ignore
    }
  }

  return [];
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    printHelp();
    process.exit(0);
  }

  if (args.version) {
    console.log('upheld v0.1.0');
    process.exit(0);
  }

  if (args.command === 'ledger') {
    if (args.subcommand === 'summary' || !args.subcommand) {
      const ledgerPath = args.ledgerPath || '.upheld/ledger.jsonl';
      if (!fs.existsSync(path.resolve(ledgerPath))) {
        if (args.json) {
          console.log(JSON.stringify([]));
        } else {
          console.log(`No ledger found at ${ledgerPath}`);
        }
        process.exit(0);
      }

      const entries = await getLedgerSummary(ledgerPath, {
        limit: args.limit ?? 10,
        reverse: args.reverse ?? false,
      });

      if (args.json) {
        console.log(JSON.stringify(entries, null, 2));
      } else {
        console.log(formatLedgerSummary(entries));
      }
      process.exit(0);
    } else {
      console.error(`Unknown ledger subcommand: ${args.subcommand}`);
      printHelp();
      process.exit(1);
    }
  }

  if (args.command === 'verify') {
    const claims = loadClaims(args.configPath);
    if (claims.length === 0) {
      console.log('No claims defined. Create a .upheld.json or pass --config path/to/claims.json');
      console.log('Example .upheld.json:');
      console.log(
        JSON.stringify(
          {
            claims: [
              {
                id: 'unit-tests',
                description: 'All unit tests pass',
                type: 'command',
                command: 'npm test',
              },
            ],
          },
          null,
          2
        )
      );
      process.exit(0);
    }

    const result = await runVerification(claims);

    if (args.ledgerPath) {
      await appendLedgerEntry(args.ledgerPath, result);
    }

    if (args.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(`Verification Run: ${result.runId}`);
      console.log(`Timestamp: ${result.timestamp}`);
      console.log('─'.repeat(60));
      for (const claim of result.claims) {
        const icon = claim.status === 'upheld' ? '✔' : claim.status === 'unmet' ? '✖' : '⚠';
        console.log(`[${icon}] ${claim.id} (${claim.status.toUpperCase()}): ${claim.description}`);
        if (claim.message) {
          console.log(`    ${claim.message}`);
        }
      }
      console.log('─'.repeat(60));
      console.log(
        `Summary: ${result.summary.upheld} upheld, ${result.summary.unmet} unmet, ${result.summary.unclaimed} unclaimed (Total: ${result.summary.total})`
      );
      console.log(`Exit Mode: ${result.exitMode.toUpperCase()}`);
      if (args.ledgerPath) {
        console.log(`Receipt appended to local ledger: ${args.ledgerPath}`);
      }
    }

    process.exit(result.passed ? 0 : 1);
  }

  console.error(`Unknown command: ${args.command}`);
  printHelp();
  process.exit(1);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
