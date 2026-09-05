# Upheld

> **"Claims, upheld."** / **"Done means shown."**

**Upheld** is a harness-agnostic claims-vs-evidence verifier for AI coding agents.

Agents often claim they performed tasks, passed test suites, or wrote specific files. Upheld independently verifies those claims against empirical ground truth: it re-executes claimed test commands, checks file system artifacts, detects unclaimed git modifications, and renders a clean Claims vs Evidence diff.

---

## Features

- **Empirical Re-run**: Re-runs claimed test commands (`pytest`, `vitest`, `jest`, or arbitrary shell commands) and compares parsed outputs (passed/failed/total counts and exit status) to what was claimed.
- **File Artifact Verification**: Checks that claimed file paths actually exist on disk.
- **Unclaimed Change Detection**: Identifies files modified or created in git that were never claimed by the agent.
- **Harness Agnostic**: Works with Claude Code, Cursor, Codex, OpenHands, Aider, custom CI/CD pipelines, or standalone CLIs.
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
Validates that a file was created or modified on disk:
```json
{
  "type": "file_written",
  "path": "src/verifier.ts"
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

### Verify Claims via Standard Input
```bash
cat claims.json | upheld verify
```

### Options
- `--strict`: Exit non-zero if any claim is unmet.
- `--format <table|markdown|json>`: Choose output format (`--json` and `--markdown` are shortcuts).
- `--cwd <dir>`: Set working directory for evaluation.
- `--no-unclaimed`: Disable git status unclaimed file detection.
- `--summary`: Output GitHub Action job summary format.

---

## Sample Output

```
Upheld — Claims vs Evidence
============================

Status   | Claim Type    | Claim                          | Evidence
---------+---------------+--------------------------------+------------------------------------------
UPHELD   | file_written  | path: README.md                | exists (size: 2150 B)
UPHELD   | file_written  | path: package.json             | exists (size: 950 B)
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
Add Upheld to your CI workflow using our composite action:

```yaml
- uses: chuofringer/upheld@main
  with:
    claims-file: '.upheld/claims.json'
    strict: 'false' # report mode
```

---

## Benchmark: Upheld vs. "Trust the Agent"

Upheld provides a fixture benchmark script comparing empirical claim verification against blind acceptance ("trust the agent"). This serves as our dogfood metric toward our target validation goal of detecting ≥3% contradicted claims in agent workflows.

Run the benchmark:

```bash
npm run benchmark
# or directly
node --loader tsx scripts/benchmark-false-claims.ts
```

### Benchmark Results (Corpus Fixtures)

```
Upheld — False-Claim Benchmark (Upheld vs. "Trust the Agent")
================================================================================

Fixture / Strategy                |  Strategy           |  Claims  |  Upheld  |  Unmet  |  Time (ms)
----------------------------------+---------------------+----------+----------+---------+-----------
claims-upheld.json [Trust Agent]  |  Trust Agent        |  3       |  3       |  0      |  0.0 ms   
claims-upheld.json [Upheld]       |  Upheld (Verified)  |  3       |  3       |  0      |  24.3 ms  
claims-unmet.json [Trust Agent]   |  Trust Agent        |  2       |  2       |  0      |  0.0 ms   
claims-unmet.json [Upheld]        |  Upheld (Verified)  |  2       |  0       |  2      |  20.6 ms  

Benchmark Summary:
  Total Fixture Cases:          2
  Total Claims Evaluated:       5
  Unmet Claims Caught (Upheld): 2 / 5
  Unmet Claims Caught (Trust):  0 / 5 (Blind acceptance)
  Total Benchmark Duration:     45.5 ms
```

> **Note:** The metrics above reflect strictly deterministic evaluations of test corpus fixtures (`examples/fixtures/`).

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
