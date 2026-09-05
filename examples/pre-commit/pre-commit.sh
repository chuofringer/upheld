#!/usr/bin/env bash
# Upheld pre-commit hook script
# Verifies agent / developer claims against ground truth before committing staged changes.
#
# Usage:
#   Direct:
#     ./examples/pre-commit/pre-commit.sh
#   Husky (.husky/pre-commit):
#     npx . verify --strict .upheld/claims.json || ./examples/pre-commit/pre-commit.sh
#   Lefthook (lefthook.yml):
#     pre-commit:
#       commands:
#         upheld:
#           run: ./examples/pre-commit/pre-commit.sh

set -e

# Default claims file locations to look for
CLAIMS_FILES=(
  ".upheld/claims.json"
  ".claude/claims.json"
  "claims.json"
)

CLAIMS_FILE=""

# If explicit argument provided, use it
if [ -n "$1" ]; then
  CLAIMS_FILE="$1"
else
  # Check environment variable
  if [ -n "$UPHELD_CLAIMS_FILE" ]; then
    CLAIMS_FILE="$UPHELD_CLAIMS_FILE"
  else
    # Find first existing default file
    for f in "${CLAIMS_FILES[@]}"; do
      if [ -f "$f" ]; then
        CLAIMS_FILE="$f"
        break
      fi
    done
  fi
fi

# If no claims file is found or staged, skip gracefully (or exit 0)
if [ -z "$CLAIMS_FILE" ] || [ ! -f "$CLAIMS_FILE" ]; then
  # No claims file to verify
  exit 0
fi

# Check if claims file is part of staged changes or if all staged files should be checked
# In pre-commit context, verifying the claims ensures done means shown.
echo "🔍 [upheld pre-commit] Verifying claims in $CLAIMS_FILE..."

# Run upheld verify with --strict so unmet claims abort the commit
FLAGS="${UPHELD_FLAGS:-}"

if [ -f "./dist/bin.js" ]; then
  # shellcheck disable=SC2086
  node "./dist/bin.js" verify --strict $FLAGS "$CLAIMS_FILE"
elif command -v upheld >/dev/null 2>&1; then
  # shellcheck disable=SC2086
  upheld verify --strict $FLAGS "$CLAIMS_FILE"
elif command -v npx >/dev/null 2>&1; then
  # shellcheck disable=SC2086
  npx . verify --strict $FLAGS "$CLAIMS_FILE"
else
  echo "Error: Neither local build ('./dist/bin.js'), 'upheld', nor 'npx .' found to run verification." >&2
  exit 1
fi
