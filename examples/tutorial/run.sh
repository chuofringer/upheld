#!/usr/bin/env bash
set -e

# ==============================================================================
# Upheld — Claims vs Evidence Runnable Tutorial
# Brand: vibemapper | Tagline: "Claims, upheld." / "Done means shown."
#
# This script walks through all five core verification use cases:
#   Use Case A: tests_pass (Upheld matching counts vs Unmet count mismatch)
#   Use Case B: file_written (Upheld modified file vs Unmet pre-existing unchanged file)
#   Use Case C: Unclaimed side effects (detecting unmentioned file modifications)
#   Use Case D: Report mode (exit 0) vs Strict mode (--strict exit non-zero)
#   Use Case E: Mini corpus fixture evaluation (landing via PR #6)
# ==============================================================================

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_ROOT"

echo "================================================================="
echo "Upheld — Claims vs Evidence Verifier Tutorial"
echo "Tagline: Claims, upheld. Done means shown."
echo "Repo Root: $REPO_ROOT"
echo "================================================================="
echo ""

if [ ! -f "dist/bin.js" ]; then
  echo "Building upheld from source (npm run build)..."
  npm run build
fi

# ------------------------------------------------------------------------------
# 1. USE CASE A: tests_pass
# ------------------------------------------------------------------------------
echo "-----------------------------------------------------------------"
echo "USE CASE A.1: tests_pass — Accurate test claim (UPHELD)"
echo "Claim: 2 passed vitest tests in sample-project (exact match)"
echo "-----------------------------------------------------------------"
node dist/bin.js verify examples/tutorial/claims-case-a-upheld.json --no-unclaimed
echo ""

echo "-----------------------------------------------------------------"
echo "USE CASE A.2: tests_pass — Exaggerated test count (UNMET)"
echo "Claim: 5 passed tests, but evidence reveals only 2 passed"
echo "-----------------------------------------------------------------"
node dist/bin.js verify examples/tutorial/claims-case-a-unmet.json --no-unclaimed
echo ""

# ------------------------------------------------------------------------------
# 2. USE CASE B: file_written
# ------------------------------------------------------------------------------
echo "-----------------------------------------------------------------"
echo "USE CASE B.1: file_written — Newly written artifact with write evidence (UPHELD)"
echo "Touching artifact 'examples/tutorial/fixtures/mini-corpus/generated.ts'..."
touch examples/tutorial/fixtures/mini-corpus/generated.ts
echo "-----------------------------------------------------------------"
# Evaluation with --since window capturing the recent touch
WINDOW_START=$(node -e 'console.log(Date.now() - 5000)')
node dist/bin.js verify examples/tutorial/claims-case-b-upheld.json --since "$WINDOW_START" --no-unclaimed
echo ""

echo "-----------------------------------------------------------------"
echo "USE CASE B.2: file_written — Pre-existing unchanged file with --since (UNMET)"
echo "Claim: LICENSE was written in this run; ground truth: file is unchanged"
echo "-----------------------------------------------------------------"
# Setting --since to current time (LICENSE mtime is older)
CURRENT_TS=$(node -e 'console.log(Date.now() + 1000)')
node dist/bin.js verify examples/tutorial/claims-case-b-unmet.json --since "$CURRENT_TS" --no-unclaimed
echo ""

# ------------------------------------------------------------------------------
# 3. USE CASE C: Unclaimed side effects (detectUnclaimed)
# ------------------------------------------------------------------------------
echo "-----------------------------------------------------------------"
echo "USE CASE C: Unclaimed side effects — detecting unmentioned file edits"
echo "Setting up temporary working directory for isolated git detection..."
ISOLATED_DIR="$(mktemp -d /tmp/upheld-unclaimed-demo-XXXXXX)"
(
  cd "$ISOLATED_DIR"
  git init -q
  git config user.name "Vibe Mapper"
  git config user.email "vibemapper@users.noreply.github.com"
  
  # Initial commit
  echo "initial" > base.txt
  git add base.txt
  git commit -m "init" -q

  # Agent touches claimed_artifact.ts and unmentioned secret.env
  echo "export const agentCode = 42;" > claimed_artifact.ts
  echo "SECRET_TOKEN=xyz" > secret.env

  cat << 'EOF' > claims.json
{
  "version": "1.0",
  "claims": [
    {
      "type": "file_written",
      "path": "claimed_artifact.ts",
      "description": "Claiming only claimed_artifact.ts"
    }
  ]
}
EOF

  echo "Running verification with unclaimed change detection enabled:"
  node "$REPO_ROOT/dist/bin.js" verify claims.json --cwd "$ISOLATED_DIR"
)
rm -rf "$ISOLATED_DIR"
echo "-----------------------------------------------------------------"
echo ""

# ------------------------------------------------------------------------------
# 4. USE CASE D: Report vs --strict exit codes
# ------------------------------------------------------------------------------
echo "-----------------------------------------------------------------"
echo "USE CASE D.1: Report Mode (default) — Exits 0 even with UNMET claims"
echo "-----------------------------------------------------------------"
set +e
node dist/bin.js verify examples/tutorial/claims-case-a-unmet.json --no-unclaimed
REPORT_EXIT_CODE=$?
set -e
echo "Report mode exit code: $REPORT_EXIT_CODE (expected: 0)"
if [ "$REPORT_EXIT_CODE" -ne 0 ]; then
  echo "Error: Expected exit code 0 in report mode"
  exit 1
fi
echo ""

echo "-----------------------------------------------------------------"
echo "USE CASE D.2: Strict Mode (--strict) — Exits non-zero on UNMET claims"
echo "-----------------------------------------------------------------"
set +e
node dist/bin.js verify examples/tutorial/claims-case-a-unmet.json --strict --no-unclaimed
STRICT_EXIT_CODE=$?
set -e
echo "Strict mode exit code: $STRICT_EXIT_CODE (expected: 1)"
if [ "$STRICT_EXIT_CODE" -eq 0 ]; then
  echo "Error: Expected non-zero exit code with --strict"
  exit 1
fi
echo ""

# ------------------------------------------------------------------------------
# 5. USE CASE E: Corpus fixture (mini tutorial fixture or examples/corpus/)
# ------------------------------------------------------------------------------
echo "-----------------------------------------------------------------"
echo "USE CASE E: Corpus fixture evaluation"
if [ -d "examples/corpus" ]; then
  echo "Detected examples/corpus/ directory on branch."
  node dist/bin.js verify examples/tutorial/claims-case-e-corpus.json --no-unclaimed
else
  echo "Note: Full corpus lands via PR #6 (examples/corpus/). Using self-contained mini-corpus fixture."
  node dist/bin.js verify examples/tutorial/claims-case-e-corpus.json --no-unclaimed
fi
echo ""

echo "================================================================="
echo "All tutorial use cases executed successfully!"
echo "Tagline: Claims, upheld. Done means shown."
echo "================================================================="
