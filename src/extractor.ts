import { Claim, TestsPassClaim, FileWrittenClaim } from './types.js';
import { parseOutputMetrics } from './runners/index.js';

export interface ExtractOptions {
  cwd?: string;
  dedupe?: boolean;
}

export function extractClaimsFromTranscript(
  transcript: string,
  options: ExtractOptions = {}
): Claim[] {
  const claims: Claim[] = [];
  const lines = transcript.split('\n');

  let parsedAnyJson = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        const json = JSON.parse(trimmed);
        parsedAnyJson = true;
        extractFromJsonEntry(json, claims);
      } catch {
        extractFromText(trimmed, claims);
      }
    } else {
      extractFromText(trimmed, claims);
    }
  }

  // If transcript is formatted as an array of JSON objects (e.g. Cursor transcript or standard JSON list)
  const fullTrimmed = transcript.trim();
  if (fullTrimmed.startsWith('[') && fullTrimmed.endsWith(']')) {
    try {
      const arr = JSON.parse(fullTrimmed);
      if (Array.isArray(arr)) {
        for (const item of arr) {
          extractFromJsonEntry(item, claims);
        }
      }
    } catch {
      // ignore
    }
  }

  // Also do a multi-line pass on the full transcript text to catch multi-line assertions/blocks
  extractFromMultilineText(transcript, claims);

  if (options.dedupe !== false) {
    return deduplicateClaims(claims);
  }

  return claims;
}

function extractFromJsonEntry(obj: any, claims: Claim[]): void {
  if (!obj || typeof obj !== 'object') return;

  // Handle nested content array (e.g. Anthropic message content blocks)
  if (Array.isArray(obj.content)) {
    for (const item of obj.content) {
      extractFromJsonEntry(item, claims);
    }
  } else if (typeof obj.content === 'string') {
    extractFromText(obj.content, claims);
  }

  // Handle message property if present
  if (typeof obj.message === 'string') {
    extractFromText(obj.message, claims);
  } else if (obj.message && typeof obj.message === 'object') {
    extractFromJsonEntry(obj.message, claims);
  }

  // Handle text property if present
  if (typeof obj.text === 'string') {
    extractFromText(obj.text, claims);
  }

  // Handle Claude Code tool_use or Cursor tool_call
  const toolName = obj.name || obj.tool_name || obj.toolName || obj.tool || (obj.function && obj.function.name);
  const toolInput = obj.input || obj.parameters || obj.args || obj.arguments || (obj.function && obj.function.arguments);

  let parsedInput = toolInput;
  if (typeof toolInput === 'string') {
    try {
      parsedInput = JSON.parse(toolInput);
    } catch {
      parsedInput = { raw: toolInput };
    }
  }

  if (toolName && typeof toolName === 'string') {
    const nameLower = toolName.toLowerCase();

    // File writing / editing tools
    if (
      nameLower === 'write' ||
      nameLower === 'writefile' ||
      nameLower === 'write_file' ||
      nameLower === 'strreplace' ||
      nameLower === 'str_replace' ||
      nameLower === 'edit' ||
      nameLower === 'editfile' ||
      nameLower === 'edit_file' ||
      nameLower === 'createfile' ||
      nameLower === 'create_file' ||
      nameLower.includes('file_edit') ||
      nameLower.includes('file_write')
    ) {
      if (parsedInput && typeof parsedInput === 'object') {
        const filePath = parsedInput.path || parsedInput.file_path || parsedInput.filepath || parsedInput.target_file || parsedInput.file;
        if (filePath && typeof filePath === 'string') {
          claims.push({
            type: 'file_written',
            path: filePath,
            description: `File written via ${toolName} tool call`,
          });
        }
      }
    }

    // Shell / Bash / Terminal test execution
    if (
      nameLower === 'bash' ||
      nameLower === 'shell' ||
      nameLower === 'terminal' ||
      nameLower === 'exec' ||
      nameLower === 'command' ||
      nameLower === 'run_command'
    ) {
      if (parsedInput && typeof parsedInput === 'object') {
        const cmd = parsedInput.command || parsedInput.cmd || parsedInput.script || parsedInput.raw;
        if (cmd && typeof cmd === 'string') {
          // Check if tool output/result is attached or if it is a test command
          const output = obj.output || obj.result || obj.response || (obj.tool_result && obj.tool_result.content);
          let metrics: { passed?: number; failed?: number; total?: number } = {};
          if (typeof output === 'string') {
            metrics = parseOutputMetrics(output);
          }

          if (isTestCommand(cmd) || metrics.passed !== undefined || (metrics.total !== undefined && metrics.total > 0)) {
            claims.push({
              type: 'tests_pass',
              cmd,
              passed: metrics.passed,
              failed: metrics.failed,
              total: metrics.total,
              description: `Test command executed via ${toolName} tool`,
            });
          }
        }
      }
    }
  }

  // Handle explicit claims object inside transcript
  if (obj.claims && Array.isArray(obj.claims)) {
    for (const c of obj.claims) {
      if (c && typeof c === 'object') {
        if (c.type === 'tests_pass' && typeof c.cmd === 'string') {
          claims.push(c);
        } else if (c.type === 'file_written' && typeof c.path === 'string') {
          claims.push(c);
        }
      }
    }
  }

  // Handle tool_result / command execution logs
  if (obj.type === 'tool_result' || obj.role === 'tool') {
    const content = typeof obj.content === 'string' ? obj.content : JSON.stringify(obj.content);
    if (content) {
      extractFromText(content, claims);
    }
  }
}

function extractFromText(text: string, claims: Claim[]): void {
  // 1. File written patterns
  const fileWrittenPatterns = [
    /(?:created|wrote|modified|updated|saved|generated)\s+(?:file\s+)?[`'"]?([a-zA-Z0-9_\-./\\]+\.[a-zA-Z0-9_]+)[`'"]?/gi,
    /(?:file_written|file written|wrote to)\s*[:=]?\s*[`'"]?([a-zA-Z0-9_\-./\\]+\.[a-zA-Z0-9_]+)[`'"]?/gi,
    /Wrote\s+\d+\s+lines\s+to\s+[`'"]?([a-zA-Z0-9_\-./\\]+\.[a-zA-Z0-9_]+)[`'"]?/gi,
  ];

  for (const pat of fileWrittenPatterns) {
    let match: RegExpExecArray | null;
    while ((match = pat.exec(text)) !== null) {
      const filePath = match[1];
      if (isValidFilePath(filePath)) {
        claims.push({
          type: 'file_written',
          path: filePath,
          description: `Extracted file claim: ${filePath}`,
        });
      }
    }
  }

  // 2. Test pass patterns
  const testCmdPatterns = [
    /(?:ran|run|executed|running|tests? pass(?:ed|ing)? for|test command)\s*[:=-]?\s*[`'"]([^`'"]*(?:pytest|vitest|jest|npm test|pnpm test|yarn test|cargo test|go test|python -m pytest|node -e)[^`'"]*)[`'"]/gi,
    /`([^`'"]*(?:pytest|vitest|jest|npm test|pnpm test|yarn test|cargo test|go test|python -m pytest|node -e)[^`'"]*)`\s*(?:passed|succeeded|completed with all tests passing|\(\d+\s*passed)/gi,
  ];

  for (const pat of testCmdPatterns) {
    let match: RegExpExecArray | null;
    while ((match = pat.exec(text)) !== null) {
      const cmd = match[1].trim();
      const metrics = parseOutputMetrics(text);
      claims.push({
        type: 'tests_pass',
        cmd,
        passed: metrics.passed,
        failed: metrics.failed,
        total: metrics.total,
        description: `Extracted test pass claim for '${cmd}'`,
      });
    }
  }

  // 3. Claims formatted as markdown bullet list or table
  const claimBulletPattern = /[-*]\s*(?:Claim\s*:\s*)?(tests_pass|file_written)\s*[:=]\s*(.+)/gi;
  let bulletMatch: RegExpExecArray | null;
  while ((bulletMatch = claimBulletPattern.exec(text)) !== null) {
    const type = bulletMatch[1].toLowerCase();
    const rest = bulletMatch[2].trim();

    if (type === 'file_written') {
      const fileMatch = rest.match(/[`'"]?([a-zA-Z0-9_\-./\\]+\.[a-zA-Z0-9_]+)[`'"]?/);
      if (fileMatch && isValidFilePath(fileMatch[1])) {
        claims.push({
          type: 'file_written',
          path: fileMatch[1],
        });
      }
    } else if (type === 'tests_pass') {
      const cmdMatch = rest.match(/[`'"]([^`'"]+)[`'"]/) || [null, rest.split(/[,;(]/)[0].trim()];
      const cmd = cmdMatch[1]?.trim();
      if (cmd) {
        const metrics = parseOutputMetrics(rest);
        claims.push({
          type: 'tests_pass',
          cmd,
          passed: metrics.passed,
          failed: metrics.failed,
          total: metrics.total,
        });
      }
    }
  }
}

function extractFromMultilineText(transcript: string, claims: Claim[]): void {
  // Check for fenced code blocks containing claims JSON
  const jsonBlockRegex = /```(?:json)?\s*([\s\S]*?)\s*```/g;
  let blockMatch: RegExpExecArray | null;
  while ((blockMatch = jsonBlockRegex.exec(transcript)) !== null) {
    const snippet = blockMatch[1].trim();
    if (snippet.startsWith('{') || snippet.startsWith('[')) {
      try {
        const parsed = JSON.parse(snippet);
        if (Array.isArray(parsed)) {
          for (const item of parsed) {
            extractFromJsonEntry(item, claims);
          }
        } else if (typeof parsed === 'object') {
          extractFromJsonEntry(parsed, claims);
        }
      } catch {
        // Not valid JSON in codeblock, continue
      }
    }
  }
}

function isTestCommand(cmd: string): boolean {
  const c = cmd.toLowerCase().trim();
  return (
    c.includes('pytest') ||
    c.includes('vitest') ||
    c.includes('jest') ||
    c.startsWith('npm test') ||
    c.startsWith('pnpm test') ||
    c.startsWith('yarn test') ||
    c.startsWith('npm run test') ||
    c.startsWith('pnpm run test') ||
    c.startsWith('yarn run test') ||
    c.startsWith('cargo test') ||
    c.startsWith('go test') ||
    c.includes('test_') ||
    c.includes('.test.') ||
    c.includes('.spec.')
  );
}

function isValidFilePath(path: string): boolean {
  const p = path.trim();
  if (!p) return false;
  if (p.includes('\n') || p.includes('\r')) return false;
  // Ignore common false positives like URLs, package names, version tags
  if (p.startsWith('http://') || p.startsWith('https://')) return false;
  if (p.startsWith('git@') || p.startsWith('v0.') || p.startsWith('v1.')) return false;
  // Must have an extension or directory structure
  if (!p.includes('.') && !p.includes('/')) return false;
  return true;
}

function deduplicateClaims(claims: Claim[]): Claim[] {
  const seen = new Set<string>();
  const unique: Claim[] = [];

  for (const claim of claims) {
    let key: string;
    if (claim.type === 'file_written') {
      key = `file:${claim.path}`;
    } else {
      // Deduplicate test claims by cmd - prefer the one that has metrics specified
      key = `test:${claim.cmd}`;
    }

    if (!seen.has(key)) {
      seen.add(key);
      unique.push(claim);
    } else if (claim.type === 'tests_pass') {
      // If the new one has metrics and existing doesn't, update existing
      const existingIdx = unique.findIndex((c) => c.type === 'tests_pass' && c.cmd === claim.cmd);
      if (existingIdx >= 0) {
        const existing = unique[existingIdx] as TestsPassClaim;
        if (existing.passed === undefined && claim.passed !== undefined) {
          unique[existingIdx] = claim;
        }
      }
    }
  }

  return unique;
}
