import { spawnSync } from 'node:child_process';
import { findClaimsFile, loadClaims, verifyAllClaims } from './verifier.js';
import { formatClaimsTable } from './formatter.js';

export interface WrapOptions {
  commandArgs: string[];
  claimsFile?: string;
  cwd?: string;
  strict?: boolean;
  quiet?: boolean;
}

export interface WrapResult {
  commandExitCode: number;
  claimsFound: boolean;
  claimsVerified: boolean;
  tableOutput?: string;
  exitCode: number;
}

export function runWrap(options: WrapOptions): WrapResult {
  const cwd = options.cwd || process.cwd();
  const commandArgs = options.commandArgs;

  let commandExitCode = 0;

  if (commandArgs && commandArgs.length > 0) {
    const cmd = commandArgs[0];
    const args = commandArgs.slice(1);

    const result = spawnSync(cmd, args, {
      cwd,
      stdio: 'inherit',
      shell: true
    });

    commandExitCode = result.status ?? (result.signal ? 1 : 0);
  }

  const claimsPath = findClaimsFile(options.claimsFile, cwd);

  if (!claimsPath) {
    return {
      commandExitCode,
      claimsFound: false,
      claimsVerified: true,
      exitCode: commandExitCode
    };
  }

  try {
    const claimsData = loadClaims(claimsPath);
    const summary = verifyAllClaims(claimsData, cwd);
    const table = formatClaimsTable(summary);

    if (!options.quiet) {
      console.log(table);
    }

    const claimsVerified = summary.failed === 0;

    // Determine final exit code:
    // If command failed, preserve non-zero command exit code.
    // If command succeeded (or no command) but claims failed and strict mode is on (or wrap is enforcing), exit 1.
    let finalExitCode = commandExitCode;
    if (finalExitCode === 0 && !claimsVerified && options.strict) {
      finalExitCode = 1;
    }

    return {
      commandExitCode,
      claimsFound: true,
      claimsVerified,
      tableOutput: table,
      exitCode: finalExitCode
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!options.quiet) {
      console.error(`\n[upheld] Error verifying claims: ${msg}`);
    }
    return {
      commandExitCode,
      claimsFound: true,
      claimsVerified: false,
      exitCode: commandExitCode !== 0 ? commandExitCode : 1
    };
  }
}
