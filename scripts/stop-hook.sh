#!/usr/bin/env bash
# Upheld stop-hook helper for Cursor / Claude-ish agent loops
# Usage: ./scripts/stop-hook.sh [command-to-run-or-empty]

set -e

if [ "$#" -gt 0 ]; then
  # Run wrapped command if provided
  npx upheld wrap -- "$@"
else
  # Auto-verify if claims file exists
  if [ -f ".upheld.json" ] || [ -f "claims.json" ] || [ -f ".claims.json" ] || [ -f "upheld.json" ]; then
    npx upheld verify
  else
    echo "[upheld stop-hook] No claims file found. Skipping claims verification."
  fi
fi
