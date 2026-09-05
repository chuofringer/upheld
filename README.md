# Upheld

> **"Claims, upheld."** / **"Done means shown."**

**Upheld** is a harness-agnostic claims-vs-evidence verifier for AI coding agents.

Agents often claim they performed tasks, passed test suites, or wrote specific files. Upheld independently verifies those claims against empirical ground truth: it re-executes claimed test commands, checks file system artifacts, detects unclaimed git modifications, lints diffs for dishonest reward-hacking / claim-tampering patterns, and renders a clean Claims vs Evidence report.

---

## Features

- **Empirical Re-run**: Re-runs claimed test commands (`pytest`, `vitest`, `jest`, or arbitrary shell commands) and compares parsed outputs (passed/failed/total counts and exit status) to what was claimed.
- **Reward-Hack / Claim-Tampering Diff Linter**: Scans git diffs or patch files for subtle tricks agents use to fake test passes:
  - Added test focus or skip modifiers (`.only`, `.skip`, `fit`, `fdescribe`, `xit`, `xdescribe`, `@pytest.mark.skip`).
  - Weakened or tautological assertions (`assert True`, `expect(true).toBe(true)`, `assert 1 == 1`).
  - Deleted assertions in test files without equivalent replacement.
  - Artificially modified test count denominators in configurations or claim docs.
  - Mass addition of linter/type suppressions (`# noqa`, `eslint-disable`, `@ts-ignore`, `@ts-nocheck`).
- **File Artifact Verification**: Checks that claimed file paths actually exist on disk.
- **Unclaimed Change Detection**: Identifies files modified or created in git that were never claimed by the agent.
- **Harness Agnostic**: Works with Claude Code, Cursor, Codex, OpenHands, Aider, custom CI/CD pipelines, or standalone CLIs.
- **Status Vocabulary**:
  - `UPHELD`: The claim matches empirical evidence.
  - `UNMET`: The claim failed, metrics mismatched, or tampering was detected.
  - `UNCLAIMED`: Unclaimed changes or untracked artifacts were found in git status.
- **Report & Strict Modes**:
  - **Report Mode (default)**: Emits a structured Claims vs Evidence table and exits `0` for transparent observation.
  - **Strict Mode (`--strict`)**: Exits with a non-zero code if any claim is unmet, tampering is found, or verification fails.
- **GitHub Actions & Job Summary**: Automatically renders Markdown job summaries in `$GITHUB_STEP_SUMMARY`.
- **Lightweight & Honest**: Minimal footprint, zero external bloat, Node 20+.

---

## Supported Claim Types

### 1. `tests_pass`
Validates that running a test command passes and matches claimed metrics:
```json
{
  "type": "tests_pass",
  "cmd": "pytest tests/",
  "passed": 12,
  "failed": 0,
  "total": 12
}
```

### 2. `file_written`
Validates that a file was created or modified on disk:
```json
{
  "type": "file_written",
  "path": "src/verifier.ts"
}
```

### 3. `diff_tampering`
Validates that a git diff or patch contains no reward-hacking or claim-tampering patterns:
```json
{
  "type": "diff_tampering",
  "base": "main"
}
```

---

## Installation

```bash
npm install -g upheld
# or locally
npm install --save-dev upheld
```

Requirements: Node.js >= 20.0.0

---

## CLI Usage

### Verify Claims from a File
```bash
upheld verify path/to/claims.json
```

### Verify Claims with Diff Tampering Check
```bash
upheld verify path/to/claims.json --lint-diff [--base main]
```

### Scan Git Diff or Patch Directly for Tampering (`lint-diff`)
```bash
# Scan uncommitted changes against HEAD (or working directory diff)
upheld lint-diff

# Scan branch diff against base ref
upheld lint-diff --base main

# Scan a saved patch file
upheld lint-diff path/to/change.diff
# or
cat change.diff | upheld lint-diff
```

### Options
- `--strict`: Exit non-zero if any claim is unmet or tampering is found.
- `--base <ref>`: Git base revision to diff against (e.g. `main`, `HEAD~1`).
- `--patch <file>`: Path to patch or diff file to evaluate.
- `--lint-diff`: (for `verify`) Enable diff tampering inspection alongside claims verification.
- `--format <table|markdown|json>`: Choose output format (`--json` and `--markdown` are shortcuts).
- `--cwd <dir>`: Set working directory for evaluation.
- `--no-unclaimed`: Disable git status unclaimed file detection.
- `--summary`: Output GitHub Action job summary format.

---

## Sample Output

```
Upheld — Claims vs Evidence
============================

Status   | Claim Type      | Claim                          | Evidence
---------+-----------------+--------------------------------+------------------------------------------
UPHELD   | file_written    | path: README.md                | exists (size: 2150 B)
UPHELD   | file_written    | path: package.json             | exists (size: 950 B)
UPHELD   | tests_pass      | cmd: npm test, passed: 18      | exit: 0, passed: 18, failed: 0, total: 18
UNMET    | tests_pass      | cmd: pytest, passed: 5         | exit: 1, passed: 3, failed: 2, total: 5
UNMET    | diff_tampering  | diff free of tampering         | 2 tampering pattern(s) detected
UNCLAIMED| unclaimed_file  | (none)                         | unclaimed file written/modified: temp.log

Summary:
  Upheld:    3
  Unmet:     2
  Unclaimed: 1
  Total:     6

Notes & Mismatches:
  [UNMET] claim-2: Command exited with non-zero code 1; claimed 5 passed but observed 3; claimed 0 failed but observed 2; claimed 5 total but observed 5
  [UNMET] diff-1: tests/auth.test.ts:14: Added test focus/skip modifier (.only or .skip) which suppresses tests [it.only('logs in user', () => {]
```

---

## Integrations

### Claude Code Stop-Hook
Upheld can run as a Claude Code Stop-hook to verify an agent's claims before concluding a session. See [`examples/claude-code-hook/`](./examples/claude-code-hook/) for setup and scripts.

### GitHub Actions
Add Upheld to your CI workflow using our composite action:

```yaml
- uses: chuofringer/upheld@main
  with:
    claims-file: '.upheld/claims.json'
    strict: 'false' # report mode
```

---

## Development

```bash
npm install
npm run build
npm test
```

---

## License

MIT © [vibemapper](https://github.com/chuofringer/upheld)
