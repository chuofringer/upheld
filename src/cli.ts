import { runWrap } from './wrap.js';
import { findClaimsFile, loadClaims, verifyAllClaims } from './verifier.js';
import { formatClaimsTable } from './formatter.js';

export function runCli(argv: string[] = process.argv.slice(2)): void {
  const args = [...argv];

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    printHelp();
    process.exit(0);
  }

  if (args.includes('--version') || args.includes('-v')) {
    console.log('upheld v0.1.0');
    process.exit(0);
  }

  const subCommand = args[0];

  if (subCommand === 'wrap') {
    // Check for -- separator or flags
    const rest = args.slice(1);
    let strict = false;
    let claimsFile: string | undefined;
    let cmdToRun: string[] = [];

    let i = 0;
    while (i < rest.length) {
      const arg = rest[i];
      if (arg === '--') {
        cmdToRun = rest.slice(i + 1);
        break;
      } else if (arg === '--strict') {
        strict = true;
        i++;
      } else if (arg === '--claims' || arg === '-c') {
        claimsFile = rest[i + 1];
        i += 2;
      } else {
        // If not a recognized flag and not after --, treat rest as command if no -- was provided
        cmdToRun = rest.slice(i);
        break;
      }
    }

    const result = runWrap({
      commandArgs: cmdToRun,
      claimsFile,
      strict
    });

    process.exit(result.exitCode);
  } else if (subCommand === 'verify' || subCommand === 'check') {
    let claimsFile: string | undefined;
    let strict = true;

    for (let i = 1; i < args.length; i++) {
      if (args[i] === '--claims' || args[i] === '-c') {
        claimsFile = args[i + 1];
        i++;
      }
    }

    const filePath = findClaimsFile(claimsFile);
    if (!filePath) {
      console.error('[upheld] No claims file found (.upheld.json, claims.json, etc.)');
      process.exit(1);
    }

    try {
      const claimsData = loadClaims(filePath);
      const summary = verifyAllClaims(claimsData);
      console.log(formatClaimsTable(summary));
      process.exit(summary.failed > 0 ? 1 : 0);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[upheld] Error: ${msg}`);
      process.exit(1);
    }
  } else {
    // If command not recognized, check if user ran `upheld -- cmd` or passed unknown subcmd
    console.error(`[upheld] Unknown command: ${subCommand}\n`);
    printHelp();
    process.exit(1);
  }
}

function printHelp(): void {
  console.log(`
upheld — Claims vs Evidence verifier for AI coding agents

USAGE:
  upheld wrap [--strict] [--claims <path>] -- <command> [args...]
  upheld verify [--claims <path>]
  upheld --help

COMMANDS:
  wrap             Execute a command, then automatically verify claims file if present
  verify, check    Directly verify claims in .upheld.json or specified file

OPTIONS:
  --strict         Exit with code 1 if any claim verification fails
  --claims, -c     Path to claims JSON file (default: .upheld.json / claims.json)
  --help, -h       Show this help message
  --version, -v    Show version number

STOP-HOOK INTEGRATION:
  Use in agent tool wrappers or stop hooks to ensure claims are verified with evidence.
`);
}
