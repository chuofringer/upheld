import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

export interface InitOptions {
  cwd?: string;
  force?: boolean;
  githubAction?: boolean;
}

export interface InitResult {
  createdFiles: string[];
  skippedFiles: string[];
  targetDir: string;
}

export const CLAIMS_EXAMPLE_JSON = `{
  "version": "1.0",
  "claims": [
    {
      "type": "file_written",
      "path": "README.md",
      "description": "Project documentation updated"
    },
    {
      "type": "tests_pass",
      "cmd": "npm test",
      "passed": 1,
      "failed": 0,
      "total": 1,
      "description": "Verify test suite passes"
    }
  ]
}
`;

export const CLAUDE_STOP_HOOK_SH = `#!/usr/bin/env bash
# Claude Code Stop hook script for Upheld
# Place in .claude/hooks/stop or invoke via settings.json: { "stopHook": "bash .upheld/stop-hook.sh" }
#
# When Claude Code finishes a task, this hook runs Upheld to verify claims
# against ground-truth evidence before concluding.

set -e

CLAIMS_FILE=".upheld/claims.json"
if [ ! -f "$CLAIMS_FILE" ]; then
  CLAIMS_FILE=".claude/claims.json"
fi

if [ ! -f "$CLAIMS_FILE" ]; then
  # If no claims file exists, exit gracefully
  exit 0
fi

echo "🔍 Upheld: Verifying agent claims vs evidence..."

# Run upheld verify in report mode (exit 0) or strict mode (--strict).
# Using local invocation (or 'npx upheld' once published to npm):
if [ -f "./dist/bin.js" ]; then
  node ./dist/bin.js verify "$CLAIMS_FILE"
elif command -v upheld &> /dev/null; then
  upheld verify "$CLAIMS_FILE"
else
  npx . verify "$CLAIMS_FILE"
fi
`;

export const UPHELD_README_MD = `# .upheld Configuration

This directory contains configuration, templates, and hooks for [Upheld](https://github.com/chuofringer/upheld) — the harness-agnostic claims-vs-evidence verifier for AI coding agents.

## Directory Contents

- \`claims.example.json\`: Example claims template. Agents write their assertions (tests passed, files written) to \`claims.json\` or \`.upheld/claims.json\`.
- \`stop-hook.sh\`: Example Claude Code Stop-hook script to verify claims automatically upon task completion.

## Usage

### 1. Claude Code Stop Hook
To verify claims before Claude Code concludes a session, configure \`.claude/settings.json\`:

\`\`\`json
{
  "hooks": {
    "stop": "bash .upheld/stop-hook.sh"
  }
}
\`\`\`

### 2. Verify Claims Manually

Using local build:
\`\`\`bash
node dist/bin.js verify .upheld/claims.json
# or
npx . verify .upheld/claims.json
# post-publish: npx upheld verify .upheld/claims.json
\`\`\`

### 3. CI / GitHub Actions
Verify claims in your pull requests or CI pipelines:
\`\`\`bash
node dist/bin.js verify --strict .upheld/claims.json
# or
npx . verify --strict .upheld/claims.json
\`\`\`
`;

export const GITHUB_ACTION_WORKFLOW_YML = `name: Upheld Claims Verification

on:
  pull_request:
  push:
    branches: [main]

jobs:
  verify-claims:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20

      # In local repo clone / post-merge setup:
      - name: Build Upheld
        run: npm ci && npm run build

      - name: Verify claims with Upheld
        run: node dist/bin.js verify --strict .upheld/claims.json
        # Post-#1-merge / published action alternative:
        # uses: chuofringer/upheld@main
        # with:
        #   claims-file: '.upheld/claims.json'
        #   strict: 'true'
`;

export function initProject(options: InitOptions = {}): InitResult {
  const cwd = resolve(options.cwd || process.cwd());
  const force = !!options.force;
  const githubAction = !!options.githubAction;

  const upheldDir = join(cwd, '.upheld');
  if (!existsSync(upheldDir)) {
    mkdirSync(upheldDir, { recursive: true });
  }

  const filesToWrite: { path: string; content: string; mode?: number }[] = [
    {
      path: join(upheldDir, 'claims.example.json'),
      content: CLAIMS_EXAMPLE_JSON,
    },
    {
      path: join(upheldDir, 'stop-hook.sh'),
      content: CLAUDE_STOP_HOOK_SH,
      mode: 0o755,
    },
    {
      path: join(upheldDir, 'README.md'),
      content: UPHELD_README_MD,
    },
  ];

  if (githubAction) {
    const workflowsDir = join(cwd, '.github', 'workflows');
    if (!existsSync(workflowsDir)) {
      mkdirSync(workflowsDir, { recursive: true });
    }
    filesToWrite.push({
      path: join(workflowsDir, 'upheld.yml'),
      content: GITHUB_ACTION_WORKFLOW_YML,
    });
  }

  const createdFiles: string[] = [];
  const skippedFiles: string[] = [];

  for (const file of filesToWrite) {
    const exists = existsSync(file.path);
    if (exists && !force) {
      skippedFiles.push(file.path);
    } else {
      writeFileSync(file.path, file.content, {
        encoding: 'utf-8',
        mode: file.mode,
      });
      createdFiles.push(file.path);
    }
  }

  return {
    createdFiles,
    skippedFiles,
    targetDir: upheldDir,
  };
}
