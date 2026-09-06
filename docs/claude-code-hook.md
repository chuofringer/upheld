# Claude Code Hook Integration Guide

Upheld integrates natively with [Claude Code](https://docs.anthropic.com/en/docs/agents-and-tools/claude-code) hooks. By utilizing a **Stop Hook** (or custom subagent evaluation script), you can prevent Claude Code from ending a session or declaring completion when its claims are unverified or false.

---

## Why Use Upheld with Claude Code?

When Claude Code works autonomously on complex engineering tasks:
1. It may conclude a turn by declaring that all acceptance criteria and tests have succeeded.
2. If tests are actually failing, if files were unmodified, or if it left unintended files behind, human intervention is needed.
3. An Upheld Stop Hook forces Claude Code to confront empirical reality: if claims fail, the hook rejects session termination, feeds the failure diff back into Claude Code's context, and instructs Claude to fix the issue.

---

## 1. Setting Up the Stop Hook

Claude Code supports custom hooks configured via settings or `.claude/hooks/`.

### Hook Script: `.claude/hooks/stop.sh`

Create `.claude/hooks/stop.sh` in your repository:

```bash
#!/usr/bin/env bash
set -eo pipefail

CLAIMS_FILE=".upheld/claims.json"

# Check if claims manifest exists
if [ ! -f "$CLAIMS_FILE" ]; then
  echo "⚠️  [Upheld] No claims manifest found at $CLAIMS_FILE."
  echo "Prompting agent to produce claims before concluding."
  exit 1
fi

echo "🔍 [Upheld] Verifying agent claims..."

# Run Upheld in strict mode with local CLI
if ! node dist/bin.js verify "$CLAIMS_FILE" --strict; then
  echo ""
  echo "❌ [Upheld] Verification failed! One or more claims were UNMET or UNCLAIMED files were found."
  echo "Review the Upheld output above, fix the issues, update $CLAIMS_FILE, and try again."
  exit 1
fi

echo "✅ [Upheld] All claims UPHELD successfully."
exit 0
```

Make the hook executable:
```bash
chmod +x .claude/hooks/stop.sh
```

---

## 2. Prompting Claude Code to Generate Claims

To ensure Claude Code writes a clean `.upheld/claims.json` before wrapping up its work, add instructions to your `CLAUDE.md` or system prompt:

```markdown
## Claims & Verification Policy
Before concluding your task, you MUST write a `.upheld/claims.json` manifest listing all files you modified/created and all test commands that must pass.

Example `.upheld/claims.json`:
```json
{
  "version": "1.0",
  "claims": [
    { "type": "file_written", "path": "src/feature.ts" },
    { "type": "file_written", "path": "tests/feature.test.ts" },
    { "type": "tests_pass", "cmd": "npm test", "passed": 15, "failed": 0, "total": 15 }
  ]
}
```
The session cannot complete until `node dist/bin.js verify .upheld/claims.json --strict` passes.
```

---

## 3. The Self-Correction Loop

When Claude Code encounters a failed verification, the execution cycle works as follows:

1. **Claude finishes work** $\rightarrow$ Attempts to exit session.
2. **Stop Hook triggers** $\rightarrow$ Runs `node dist/bin.js verify .upheld/claims.json --strict`.
3. **Discrepancy found** $\rightarrow$ Upheld reports:
   ```
   UNMET | tests_pass | cmd: npm test, passed: 15 | exit: 1, passed: 14, failed: 1, total: 15
   ```
4. **Hook exits non-zero** $\rightarrow$ Claude Code receives the error output.
5. **Autonomous remediation** $\rightarrow$ Claude Code reads the failure, inspects the failing test, fixes the code, re-runs tests, updates claims, and exits cleanly.
