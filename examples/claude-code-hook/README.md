# Claude Code Stop-Hook with Upheld

Upheld integrates directly with [Claude Code](https://docs.anthropic.com/en/docs/agents-and-tools/claude-code) as a Stop-hook to verify an agent's claims before concluding a session.

## Overview

When Claude Code finishes a task, an agent often reports that it created files and ran tests successfully. Upheld re-evaluates those exact assertions:

1. Re-running claimed test commands (e.g. `pytest`, `npm test`, `vitest`, `jest`).
2. Checking that claimed files actually exist on disk.
3. Flagging any unclaimed modified or untracked files in git.

## Setup

### 1. Configure the Stop Hook

Add the stop hook script to your workspace or Claude configuration:

Save `examples/claude-code-hook/stop-hook.sh` to `.claude/hooks/stop` in your repository:

```bash
mkdir -p .claude/hooks
cp examples/claude-code-hook/stop-hook.sh .claude/hooks/stop
chmod +x .claude/hooks/stop
```

Or configure Claude Code hooks in `.claude/settings.json`:

```json
{
  "hooks": {
    "stop": "bash examples/claude-code-hook/stop-hook.sh"
  }
}
```

### 2. Instruct Agent to Emit Claims

Add a lightweight prompt snippet to `CLAUDE.md` or system instructions:

```markdown
When concluding a task, write your empirical claims to `.claude/claims.json`:
```json
{
  "claims": [
    { "type": "tests_pass", "cmd": "npm test", "passed": 8, "total": 8 },
    { "type": "file_written", "path": "src/feature.ts" }
  ]
}
```
```

### 3. Execution & Behavior

- **Report Mode (Default)**: Prints the claims-vs-evidence table and always exits `0`. Claude completes the session with transparent visibility into what was proven.
- **Strict Mode (`--strict`)**: Set `npx . verify --strict "$CLAIMS_FILE"` (or `node dist/bin.js verify --strict "$CLAIMS_FILE"`) in the hook. If any claim fails or is unmet, the hook exits non-zero, prompting the agent to self-correct before finishing.
