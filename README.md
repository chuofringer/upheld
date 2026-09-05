# Upheld

<p align="center">
  <strong>Claims, upheld.</strong> &nbsp;|&nbsp; <em>Done means shown.</em>
</p>

<p align="center">
  Harness-agnostic claims-vs-evidence verifier for AI coding agents — matching named claims to deterministic receipts.
</p>

<p align="center">
  <a href="https://nodejs.org"><img src="https://img.shields.io/badge/node-%3E%3D20.0.0-blue?style=flat-square" alt="Node.js Version" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-green?style=flat-square" alt="License" /></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/typescript-5.7+-3178c6?style=flat-square" alt="TypeScript" /></a>
  <a href="https://github.com/chuofringer/upheld/pulls"><img src="https://img.shields.io/badge/PRs-welcome-orange?style=flat-square" alt="PRs Welcome" /></a>
</p>

---

## Overview

AI coding agents often assert that tasks are complete with phrases like *"all 18 tests pass"* or *"file updated successfully"*. But asserting is not proving.

**Upheld** is an independent, harness-agnostic verification tool that audits claims made by AI agents against empirical evidence. It independently re-executes tests deterministically, checks for concrete **write and modification evidence** (via git status mutations and modification timestamps against `--since`), flags unacknowledged file mutations, and produces clean audit summaries for developers and CI pipelines.

```
                     ┌────────────────────────┐
                     │   AI Coding Agent      │
                     │  (Claims Output JSON)  │
                     └──────────┬─────────────┘
                                │
                                ▼
                     ┌────────────────────────┐
                     │         UPHELD         │
                     │  Evidence Verification │
                     └────┬──────────────┬────┘
                          │              │
       [Empirical Re-run] │              │ [Git Status & mtime Window]
                          ▼              ▼
     ┌────────────────────────┐      ┌────────────────────────┐
     │  Deterministic Tests   │      │  Write Evidence Audit  │
     │   Execution & Parse    │      │  & Unclaimed Diff Scan │
     └────────────┬───────────┘      └────────────┬───────────┘
                  │                               │
                  └──────────────┬────────────────┘
                                 │
                                 ▼
                     ┌────────────────────────┐
                     │  Claims vs. Evidence   │
                     │     Receipt Table      │
                     │ (Report Mode / Strict) │
                     └────────────────────────┘
```

---

## Claims vs Evidence Audit Table *(Example)*

When executed, Upheld evaluates agent claims against on-disk and execution receipts:

| Status | Claim Type | Claim Details | Empirical Evidence / Receipt | Verdict |
| :--- | :--- | :--- | :--- | :--- |
| `UPHELD` | `tests_pass` | `cmd: npm test, passed: 18` | Exit code `0`; 18 passed, 0 failed (1.42s) | **VERIFIED** |
| `UPHELD` | `file_written` | `path: src/auth/token.ts` | Write evidence verified: modified in git working tree (`M`) & `mtime` >= `--since` | **VERIFIED** |
| `UNMET` | `tests_pass` | `cmd: pytest tests/, passed: 5` | Re-run exited with code `1` (3 passed, 2 failed in `test_auth.py:44`) | **FAILED** |
| `UNMET` | `file_written` | `path: src/config/env.ts` | **No write evidence**: file exists on disk but unmodified in git and `mtime` unchanged | **FAILED** |
| `UNCLAIMED` | `unclaimed_file` | `(none)` | Unclaimed mutation detected in working tree (`M package-lock.json`) | **FLAGGED** |

---

## Features

- **Transcript Claim Extraction**: Automatically parses Claude Code and Cursor tool logs (JSONL, JSON, or plain text transcripts) to extract `tests_pass` and `file_written` claims.
- **Empirical Re-run**: Re-runs claimed test commands (`pytest`, `vitest`, `jest`, or arbitrary shell commands) and compares parsed outputs (passed/failed/total counts and exit status) to what was claimed.
- **File Artifact Verification**: Checks for write evidence that claimed file paths were created or modified during the run via git status (`M`, `A`, `??`) or modification time (`mtime`) against `--since`; pre-existing untouched files evaluate to unmet.
- **Unclaimed Change Detection**: Identifies files modified or created in git that were never claimed by the agent.
- **Machine-Readable Output**: Emits structured JSON (`--format json` / `--json`) or Markdown (`--format markdown` / `--markdown`) for downstream tools.
- **GitHub Check Run Integration**: Automatically posts or updates a Check Run named **"Upheld — Claims vs evidence"** when `GITHUB_TOKEN` and `GITHUB_SHA` are present (`--github-check`).
- **Harness Agnostic**: Evaluates JSON claims from any producer or agent workflow (Claude Code, Cursor, Codex, OpenHands, Aider, custom CI/CD pipelines, or standalone CLIs).
- **Report & Strict Modes**:
  - **Report Mode (default)**: Emits a structured Claims vs Evidence table and exits `0` for transparent observation.
  - **Strict Mode (`--strict`)**: Exits with a non-zero code if any claim is unmet or fails.
- **GitHub Actions & Job Summary**: Automatically renders Markdown job summaries in `$GITHUB_STEP_SUMMARY`.
- **Lightweight & Honest**: Minimal footprint, zero external bloat, Node 20+.

---

## Supported Claim Types

Upheld evaluates structured claims provided as JSON input.

### 1. `tests_pass`
Verifies that a specified test command passes by independently executing it and matching exit codes and test counts (`passed`, `failed`, `total`).

```json
{
  "type": "tests_pass",
  "cmd": "npm test -- tests/auth.test.ts",
  "passed": 8,
  "failed": 0,
  "total": 8
}
```

### 2. `file_written`
Verifies that a file was **genuinely written or modified during the run**, backed by git working tree mutation signals or modification timestamps within the `--since` window.

```json
{
  "type": "file_written",
  "path": "src/services/auth.ts"
}
```

> ⚠️ **Write Evidence vs. Existence**: If a file exists on disk from an earlier run but was never modified during the current session, Upheld marks the claim as `UNMET`.

### Full Claims File Example (`claims.json`)

```json
{
  "agent": "vibecoder-v1",
  "task": "fix-auth-expiration",
  "since": "2026-09-05T23:30:00.000Z",
  "claims": [
    {
      "type": "file_written",
      "path": "src/services/auth.ts"
    },
    {
      "type": "tests_pass",
      "cmd": "npm test -- tests/auth.test.ts",
      "passed": 8,
      "failed": 0,
      "total": 8
    }
  ]
}
```

---

## CLI Options

```text
Usage:
  upheld verify [options] [claims.json]
  cat claims.json | upheld verify [options]

Options:
  --strict             Exit with non-zero code if any claim is unmet (default: exit 0 in report mode)
  --format <type>      Output format: table (default), markdown, or json
  --cwd <path>         Working directory to evaluate claims in (default: current directory)
  --since <timestamp>  Evaluation window start timestamp (ms or ISO date) for file write evidence
  --no-unclaimed       Disable detection of unclaimed modified/untracked files
  --json               Shortcut for --format json
  --markdown           Shortcut for --format markdown
  --summary            Output GitHub Action job summary format
  --summary-file <f>   Append job summary to specified file (or $GITHUB_STEP_SUMMARY)
  -h, --help           Show help message
  -v, --version        Show version
```

---

## Execution Modes

- **Report Mode (Default)**: Inspects empirical evidence, outputs the audit table to stdout and `$GITHUB_STEP_SUMMARY` if available, and exits with code `0`. Ideal for exploratory workflows and agent post-run reviews.
  ```bash
  node dist/bin.js verify claims.json
  ```

- **Strict Mode (`--strict`)**: Enforces deterministic integrity by exiting with status `1` whenever any claim is unmet, tests fail, or counts mismatch.
  ```bash
  node dist/bin.js verify claims.json --strict
  ```

<<<<<<< HEAD
### Bootstrap Configuration (`init`)
Quickly bootstrap an `.upheld` directory with template claims, a Claude Code Stop-hook script, and a README:

```bash
node dist/bin.js init
# or
npx . init
```

Options:
- `--github-action`: Also create a starter GitHub Action workflow at `.github/workflows/upheld.yml`.
- `--force`: Overwrite existing files (by default, existing files are skipped).
- `--cwd <dir>`: Target working directory (default: current directory).

### Verify Claims in Watch Mode
Watch a claims file for changes and re-verify automatically during development:
```bash
node dist/bin.js verify --watch path/to/claims.json
# or
npx . verify -w path/to/claims.json
```

### Extract Claims from Agent Transcripts
Parse Claude Code or Cursor logs (JSONL, JSON arrays, or text):
```bash
# Extract to a claims.json file
upheld extract agent-transcript.jsonl --out claims.json

# Extract from stdin and pipe directly to verify
cat transcript.jsonl | upheld extract | upheld verify
```

### Verify Claims from a File
```bash
node dist/bin.js verify path/to/claims.json
# or
npx . verify path/to/claims.json
```

### Verify Claims via Standard Input
```bash
cat claims.json | node dist/bin.js verify
# or
cat claims.json | npx . verify
```

### GitHub Check Run
```bash
node dist/bin.js verify --github-check claims.json
# or
npx . verify --github-check claims.json
```

---

## Integrations

### Pre-Commit Hooks (Husky / Lefthook)
Ensure agent and developer claims are upheld before code is committed. See [`examples/pre-commit/`](./examples/pre-commit/).

#### Husky (`.husky/pre-commit`)
One-liner:
```bash
test -f .upheld/claims.json && npx . verify --strict .upheld/claims.json || true
```

#### Lefthook (`lefthook.yml`)
One-liner:
```yaml
pre-commit:
  commands:
    upheld:
      run: test -f .upheld/claims.json && npx . verify --strict .upheld/claims.json || true
```

### Claude Code Stop-Hook
Upheld can run as a Claude Code Stop-hook to extract claims from the session transcript and verify them before concluding a session. See [`examples/claude-code-hook/`](./examples/claude-code-hook/) for setup and scripts.

### GitHub Actions
To verify claims in CI, run the built CLI directly or invoke local verify steps:

```yaml
- name: Verify Agent Claims
  run: |
    npm ci && npm run build
    node dist/bin.js verify .upheld/claims.json
```

*(Note: Direct composite action usage via `uses: chuofringer/upheld@main` will be available after PR #1 merges to `main`.)*

---

## Why Upheld?

Most coding agent harnesses rely either on:
1. **Self-reported completion**: The agent declares *"I ran the tests and they passed"*, leading to false positives, silent omissions, and hallucinated success.
2. **Heavyweight finish-review blockers**: Rigid, monolithic review gates that freeze agent workflows or demand proprietary orchestrators.

Upheld provides a lightweight, focused wedge: **deterministic receipt verification**. It doesn't care how the agent was prompted or what model produced the code — it only verifies whether the agent's explicit claims match verifiable, reproducible facts on disk and in execution.

## False-Completion Corpus

Upheld includes a curated fixture corpus of common false-completion patterns exhibited by coding agents (skipped tests, phantom file writes, inflated pass counts, swallowed exit codes).

See [`examples/corpus/`](./examples/corpus/) and run the corpus validation suite:

```bash
npm run corpus
```

---

## Publishing (Maintainers Only / Dry-Run Verification)

> **Notice:** Publishing to npm is restricted to repository owners / maintainers (`@chuofringer`) and is planned for a future release. Upheld is not yet published to npm.

To verify the package contents that will be included in future releases via dry-run:

```bash
npm pack --dry-run
```

When ready for release (maintainers only):

```bash
npm publish --access public --dry-run
# Actual publish (owners only upon release):
# npm publish --access public
```

---

## License

Distributed under the MIT License. See [LICENSE](LICENSE) for details.

<p align="center">
  <sub>Built by <strong>vibemapper</strong> · Claims, upheld.</sub>
</p>
