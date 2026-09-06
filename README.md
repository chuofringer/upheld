# Upheld

> **"Claims, upheld."** / **"Done means shown."**

**Upheld** is a harness-agnostic claims-vs-evidence verifier for AI coding agents.

Agents often claim they performed tasks, passed test suites, or wrote specific files. Upheld independently verifies those claims against empirical ground truth: it re-executes claimed test commands, checks file system artifacts, detects unclaimed git modifications, and renders a clean Claims vs Evidence diff.

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
Validates that a file was created or modified on disk during the run (verified via git status or `--since` window):
```json
{
  "type": "file_written",
  "path": "src/verifier.ts"
}
```

---

## Installation & Getting Started

> **Note**: Upheld is currently in active development. NPM package publishing is planned for a future release. For now, run Upheld directly from source or via local build.

### Local Setup & Build

```bash
# Clone the repository
git clone https://github.com/chuofringer/upheld.git
cd upheld

# Install dependencies and build
npm install && npm run build
```

### Running Upheld

Run the built CLI directly with Node:
```bash
node dist/bin.js verify path/to/claims.json
```

Or invoke via npx within the local repository:
```bash
npx . verify path/to/claims.json
```

Requirements: Node.js >= 20.0.0

---

## CLI Usage

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
============================

Status   | Claim Type    | Claim                          | Evidence
---------+---------------+--------------------------------+------------------------------------------
UPHELD   | file_written  | path: README.md                | exists (size: 2150 B, modified/created)
UPHELD   | file_written  | path: package.json             | exists (size: 950 B, modified/created)
UPHELD   | tests_pass    | cmd: npm test, passed: 18      | exit: 0, passed: 18, failed: 0, total: 18
UNMET    | tests_pass    | cmd: pytest, passed: 5         | exit: 1, passed: 3, failed: 2, total: 5
UNCLAIMED| unclaimed_file| (none)                         | unclaimed file written/modified: temp.log

Summary:
  Upheld:    3
  Unmet:     1
  Unclaimed: 1
  Total:     5
```

---

## Integrations

### Claude Code Stop-Hook
Upheld can run as a Claude Code Stop-hook to verify an agent's claims before concluding a session. See [`examples/claude-code-hook/`](./examples/claude-code-hook/) for setup and scripts.

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

## Development

```bash
npm install
npm run build
npm test
```

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

MIT © [vibemapper](https://github.com/chuofringer/upheld)
