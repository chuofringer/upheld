# Upheld Tutorial & Runnable Examples

> **Brand**: vibemapper  
> **Tagline**: *"Claims, upheld."* / *"Done means shown."*

Welcome to the **Upheld** hands-on tutorial. This walkthrough is designed for design partners, agent evaluators, and engineers integrating claims verification into automated coding workflows.

Upheld independently audits the actions AI coding agents claim they completed against empirical ground truth: it re-executes claimed test commands, checks file system artifacts with write-evidence timestamps, detects unclaimed git modifications, and renders structured Claims vs Evidence reports.

---

## 1. Install & Build from Source

> **Honesty Notice**: Upheld is currently built directly from source. There is no global npm package published yet (`npm i -g upheld` is not supported). All instructions below use local source builds (`node dist/bin.js` or `npx .`).

### Prerequisites
- Node.js >= 20.0.0
- Git

### Build Steps

```bash
# Clone repository
git clone https://github.com/chuofringer/upheld.git
cd upheld

# Install dependencies and build TypeScript to dist/
npm install && npm run build
```

Once built, you can invoke the CLI using either:
```bash
node dist/bin.js verify <claims.json> [options]
# or
npx . verify <claims.json> [options]
```

---

## 2. Quickstart: Automated Tutorial Script

All use cases described below can be run in one command using the provided tutorial script:

```bash
bash examples/tutorial/run.sh
```

---

## 3. Use Case Walkthroughs

### Use Case A: `tests_pass` Verification

AI agents frequently claim tests are passing, but may hallucinate test counts or report completion when tests failed. Upheld executes the test command, parses runner output (Vitest, Jest, Pytest), and compares exit codes and metrics.

#### Scenario A.1: Accurate Test Claim (UPHELD)

Claim file `examples/tutorial/claims-case-a-upheld.json`:
```json
{
  "version": "1.0",
  "claims": [
    {
      "type": "tests_pass",
      "cmd": "npx vitest run --config examples/sample-project/vitest.config.ts",
      "passed": 2,
      "failed": 0,
      "total": 2,
      "description": "Accurate claim: 2 passed vitest tests matching sample-project"
    }
  ]
}
```

Run verification:
```bash
node dist/bin.js verify examples/tutorial/claims-case-a-upheld.json --no-unclaimed
```

Output:
```text
Upheld — Claims vs Evidence
============================

Status  |  Claim Type  |  Claim                                     |  Evidence                               
--------+--------------+--------------------------------------------+-----------------------------------------
UPHELD  |  tests_pass  |  cmd: npx vitest run --config examples...  |  exit: 0, passed: 2, failed: 0, total: 2

Summary:
  Upheld:    1
  Unmet:     0
  Unclaimed: 0
  Total:     1
```

#### Scenario A.2: Exaggerated Test Count (UNMET)

Claim file `examples/tutorial/claims-case-a-unmet.json`:
```json
{
  "version": "1.0",
  "claims": [
    {
      "type": "tests_pass",
      "cmd": "npx vitest run --config examples/sample-project/vitest.config.ts",
      "passed": 5,
      "failed": 0,
      "total": 5,
      "description": "Exaggerated claim: claims 5 passed tests when suite only runs 2"
    }
  ]
}
```

Run verification:
```bash
node dist/bin.js verify examples/tutorial/claims-case-a-unmet.json --no-unclaimed
```

Output:
```text
Upheld — Claims vs Evidence
============================

Status  |  Claim Type  |  Claim                                     |  Evidence                               
--------+--------------+--------------------------------------------+-----------------------------------------
UNMET   |  tests_pass  |  cmd: npx vitest run --config examples...  |  exit: 0, passed: 2, failed: 0, total: 2

Summary:
  Upheld:    0
  Unmet:     1
  Unclaimed: 0
  Total:     1

Notes & Mismatches:
  [UNMET] claim-1: Claimed 5 passed but observed 2; claimed 5 total but observed 2
```

---

### Use Case B: `file_written` with Write Evidence

Merely asserting that a file exists is insufficient — agents sometimes claim credit for files that already existed in the repository before the agent started. Upheld requires active write evidence, verifiable via `git status` modifications or a `--since <timestamp>` evaluation window.

#### Scenario B.1: Newly Written / Modified Artifact (UPHELD)

Claim file `examples/tutorial/claims-case-b-upheld.json`:
```json
{
  "version": "1.0",
  "claims": [
    {
      "type": "file_written",
      "path": "examples/tutorial/fixtures/mini-corpus/generated.ts",
      "description": "Accurate claim: newly modified artifact verified via --since timestamp window"
    }
  ]
}
```

Run verification (passing `--since` starting before the touch):
```bash
touch examples/tutorial/fixtures/mini-corpus/generated.ts
node dist/bin.js verify examples/tutorial/claims-case-b-upheld.json --since "$(node -e 'console.log(Date.now() - 5000)')" --no-unclaimed
```

Output:
```text
Upheld — Claims vs Evidence
============================

Status  |  Claim Type    |  Claim                                     |  Evidence                              
--------+----------------+--------------------------------------------+----------------------------------------
UPHELD  |  file_written  |  path: examples/tutorial/fixtures/mini...  |  exists (size: 345 B, modified/created)

Summary:
  Upheld:    1
  Unmet:     0
  Unclaimed: 0
  Total:     1
```

#### Scenario B.2: Pre-Existing Unchanged File (UNMET)

Claim file `examples/tutorial/claims-case-b-unmet.json`:
```json
{
  "version": "1.0",
  "claims": [
    {
      "type": "file_written",
      "path": "LICENSE",
      "description": "False/stale claim: claims LICENSE was written this run, but it is pre-existing and unchanged"
    }
  ]
}
```

Run verification:
```bash
node dist/bin.js verify examples/tutorial/claims-case-b-unmet.json --since "$(node -e 'console.log(Date.now() + 1000)')" --no-unclaimed
```

Output:
```text
Upheld — Claims vs Evidence
============================

Status  |  Claim Type    |  Claim          |  Evidence                        
--------+----------------+-----------------+----------------------------------
UNMET   |  file_written  |  path: LICENSE  |  exists (size: 1067 B, unchanged)

Summary:
  Upheld:    0
  Unmet:     1
  Unclaimed: 0
  Total:     1

Notes & Mismatches:
  [UNMET] claim-1: File 'LICENSE' exists but has no evidence of write or change this run (unmodified in git status and mtime prior to evaluation window)
```

---

### Use Case C: Unclaimed Side Effects (`detectUnclaimed`)

When coding agents modify configuration files, write secret keys to untracked files, or leave behind temporary artifacts without declaring them in their claims, Upheld flags them as `UNCLAIMED`.

Claim file `examples/tutorial/claims-case-c-unclaimed.json`:
```json
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
```

Example isolated run:
```bash
# Agent claims claimed_artifact.ts, but also secretly creates secret.env
node dist/bin.js verify claims.json
```

Output:
```text
Upheld — Claims vs Evidence
============================

Status     |  Claim Type      |  Claim                      |  Evidence                                    
-----------+------------------+-----------------------------+----------------------------------------------
UPHELD     |  file_written    |  path: claimed_artifact.ts  |  exists (size: 29 B, modified/created)       
UNCLAIMED  |  unclaimed_file  |  (none)                     |  unclaimed file written/modified: secret.env 

Summary:
  Upheld:    1
  Unmet:     0
  Unclaimed: 1
  Total:     2

Notes & Mismatches:
  [UNCLAIMED] unclaimed-1: File 'secret.env' was modified or created in git status but not claimed
```

*(To disable unclaimed detection in environments where untracked files are expected, pass `--no-unclaimed`.)*

---

### Use Case D: Report Mode vs. `--strict` Exit Codes

Upheld supports two execution modes for different pipeline integrations:

1. **Report Mode (Default)**: Always exits `0`, emitting structured output even when claims fail. Perfect for telemetry, dashboards, and evaluation benchmarks.
2. **Strict Mode (`--strict`)**: Exits `1` if any claim evaluates to `UNMET`. Perfect for CI gates and pre-merge checks.

```bash
# Report mode: Exits 0
node dist/bin.js verify examples/tutorial/claims-case-a-unmet.json --no-unclaimed
echo "Exit code: $?" # Prints 0

# Strict mode: Exits 1
node dist/bin.js verify examples/tutorial/claims-case-a-unmet.json --strict --no-unclaimed
echo "Exit code: $?" # Prints 1
```

---

### Use Case E: Mini Corpus Fixture Evaluation

Upheld includes a self-contained mini corpus fixture in `examples/tutorial/fixtures/mini-corpus/` allowing immediate evaluation of multi-claim tasks (file generation + unit test verification).

*(Note: The full benchmark corpus is slated to land via PR #6 under `examples/corpus/`.)*

Claim file `examples/tutorial/claims-case-e-corpus.json`:
```json
{
  "version": "1.0",
  "claims": [
    {
      "type": "file_written",
      "path": "examples/tutorial/fixtures/mini-corpus/generated.ts",
      "description": "Mini fixture: claimed generated artifact"
    },
    {
      "type": "tests_pass",
      "cmd": "npx vitest run --config examples/tutorial/fixtures/mini-corpus/vitest.config.ts",
      "passed": 3,
      "failed": 0,
      "total": 3,
      "description": "Mini fixture: passing test suite with 3 unit tests"
    }
  ]
}
```

Run verification:
```bash
node dist/bin.js verify examples/tutorial/claims-case-e-corpus.json --no-unclaimed
```

Output:
```text
Upheld — Claims vs Evidence
============================

Status  |  Claim Type    |  Claim                                     |  Evidence                               
--------+----------------+--------------------------------------------+-----------------------------------------
UPHELD  |  file_written  |  path: examples/tutorial/fixtures/mini...  |  exists (size: 345 B, modified/created) 
UPHELD  |  tests_pass    |  cmd: npx vitest run --config examples...  |  exit: 0, passed: 3, failed: 0, total: 3

Summary:
  Upheld:    2
  Unmet:     0
  Unclaimed: 0
  Total:     2
```

---

## 4. Output Formats

Upheld supports multiple output formats natively implemented on this branch:

### Terminal Table (Default)
```bash
node dist/bin.js verify examples/tutorial/claims-case-a-upheld.json --no-unclaimed
```

### Markdown Summary (`--markdown` / `--format markdown`)
Ideal for PR comments or documentation:
```bash
node dist/bin.js verify examples/tutorial/claims-case-a-upheld.json --markdown --no-unclaimed
```

### Raw JSON (`--json` / `--format json`)
Ideal for machine ingestion and programmatic processing:
```bash
node dist/bin.js verify examples/tutorial/claims-case-a-upheld.json --json --no-unclaimed
```

### GitHub Actions Job Summary (`--summary`)
Appends formatted verification tables directly to `$GITHUB_STEP_SUMMARY`:
```bash
node dist/bin.js verify examples/tutorial/claims-case-a-upheld.json --summary --no-unclaimed
```

---

## 5. Summary Reference

| CLI Option | Default | Description |
| :--- | :--- | :--- |
| `verify [file]` | `stdin` | Path to `claims.json` or read from standard input |
| `--strict` | `false` (exit 0) | Exit non-zero (1) if any claim is `UNMET` |
| `--format <type>` | `table` | Output format: `table`, `markdown`, or `json` |
| `--json` | `false` | Shortcut for `--format json` |
| `--markdown` | `false` | Shortcut for `--format markdown` |
| `--since <timestamp>` | `undefined` | Evaluation window start (ms or ISO date) for file write evidence |
| `--no-unclaimed` | `false` | Disable detection of unclaimed modified/untracked files in git |
| `--cwd <path>` | `.` | Working directory to execute test commands and check files |
| `--summary` | `false` | Emit summary formatted for GitHub Actions |

---

*Upheld — Claims, upheld. Done means shown.*
