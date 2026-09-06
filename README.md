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

- **Empirical Re-run**: Re-runs claimed test commands (`pytest`, `vitest`, `jest`, or arbitrary shell commands) and compares parsed outputs (passed/failed/total counts and exit status) to what was claimed.
- **File Artifact Verification**: Checks for write evidence that claimed file paths were created or modified during the run via git status (`M`, `A`, `??`) or modification time (`mtime`) against `--since`; pre-existing untouched files evaluate to unmet.
- **Unclaimed Change Detection**: Identifies files modified or created in git that were never claimed by the agent.
- **Harness Agnostic**: Evaluates JSON claims from any producer or agent workflow.
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

### Verify Claims via Standard Input
```bash
cat claims.json | node dist/bin.js verify
# or
cat claims.json | npx . verify
```

### Options
- `--strict`: Exit non-zero if any claim is unmet.
- `--format <table|markdown|json>`: Choose output format (`--json` and `--markdown` are shortcuts).
- `--cwd <dir>`: Set working directory for evaluation.
- `--since <timestamp>`: Evaluation window start timestamp (ms or ISO date) for file writes.
- `--no-unclaimed`: Disable git status unclaimed file detection.
- `--summary`: Output GitHub Action job summary format.

---

## Sample Output

```
Upheld — Claims vs Evidence
=====================
---

## Integrations (Planned / Scaffold Tip)

> **Note**: Example hook scripts and the GitHub Actions composite action land with the scaffold PR ([#1](https://github.com/chuofringer/upheld/pull/1)). Once merged to `main`, integration workflows will become available:

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
