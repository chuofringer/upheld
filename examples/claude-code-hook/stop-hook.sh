#!/usr/bin/env bash
# Claude Code Stop hook script for Upheld
# Place in .claude/hooks/stop or invoke via settings.json: { "stopHook": "bash .claude/hooks/stop" }
#
# When Claude Code finishes a task, this hook runs Upheld to verify claims
# against ground-truth evidence before handoff.

set -e

CLAIMS_FILE=".claude/claims.json"

if [ ! -f "$CLAIMS_FILE" ]; then
  # If no claims file exists, exit gracefully
  exit 0
fi

echo "🔍 Upheld: Verifying agent claims vs evidence..."

# Run upheld verify in report mode (exit 0) or strict mode (--strict)
npx . verify "$CLAIMS_FILE"
