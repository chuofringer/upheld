import { Claim, FileWrittenClaim, TestsPassClaim } from '../types.js';

export interface RawToolEvent {
  tool?: string;
  name?: string;
  type?: string;
  args?: Record<string, unknown>;
  parameters?: Record<string, unknown>;
  input?: Record<string, unknown>;
  result?: Record<string, unknown>;
  response?: Record<string, unknown>;
  output?: Record<string, unknown>;
  status?: string;
  exitCode?: number;
}

const TEST_COMMAND_PATTERNS = [
  /\b(pytest|vitest|jest|mocha|cargo test|go test|npm test|pnpm test|yarn test|npm run test|bun test|mvn test|gradle test|ctest|dotnet test|tox|nose2)\b/i,
];

export function isTestExecutionCommand(cmd: string): boolean {
  return TEST_COMMAND_PATTERNS.some((pattern) => pattern.test(cmd));
}

export function normalizeToolEventsToClaims(events: RawToolEvent[]): Claim[] {
  const claims: Claim[] = [];
  const writtenPaths = new Set<string>();
  const testCmds = new Set<string>();

  for (const event of events) {
    const toolName = (event.tool || event.name || event.type || '').toLowerCase();
    const args = event.args || event.parameters || event.input || {};
    const result = event.result || event.response || event.output || {};

    // Check for file writing tools
    if (
      toolName === 'write_file' ||
      toolName === 'file_edit' ||
      toolName === 'write_to_file' ||
      toolName === 'create_file' ||
      toolName === 'str_replace' ||
      toolName === 'strreplace' ||
      toolName === 'edit_file' ||
      toolName === 'save_file'
    ) {
      const filePath =
        (args.path as string) ||
        (args.file_path as string) ||
        (args.filePath as string) ||
        (args.filename as string);

      if (filePath && typeof filePath === 'string' && !writtenPaths.has(filePath)) {
        writtenPaths.add(filePath);
        const claim: FileWrittenClaim = {
          type: 'file_written',
          path: filePath,
        };
        claims.push(claim);
      }
    }

    // Check for bash/command execution tools
    if (
      toolName === 'bash' ||
      toolName === 'exec' ||
      toolName === 'execute_command' ||
      toolName === 'shell' ||
      toolName === 'run_command' ||
      toolName === 'cmd'
    ) {
      const cmd =
        (args.command as string) ||
        (args.cmd as string) ||
        (args.input as string);

      if (cmd && typeof cmd === 'string') {
        const exitCode =
          typeof result.exitCode === 'number'
            ? result.exitCode
            : typeof result.exit_code === 'number'
            ? result.exit_code
            : typeof event.exitCode === 'number'
            ? event.exitCode
            : undefined;

        // If exitCode was non-zero, it was a failed run, don't claim success unless exitCode was 0 or omitted
        if (exitCode !== undefined && exitCode !== 0) {
          continue;
        }

        // Check if command is a test command
        if (isTestExecutionCommand(cmd) && !testCmds.has(cmd)) {
          testCmds.add(cmd);
          const claim: TestsPassClaim = {
            type: 'tests_pass',
            cmd,
          };
          claims.push(claim);
        }
      }
    }
  }

  return claims;
}
