# How Verification Works

Upheld operates as a deterministic, claims-vs-evidence verification engine. It sits between an AI coding agent's session completion and code merge/review.

```
┌────────────────────────────────────────────────────────┐
│                   AI Coding Agent                      │
│      (Claude Code, Cursor, OpenHands, Aider, CI)       │
└───────────────────────────┬────────────────────────────┘
                            │ Emits
                            ▼
┌────────────────────────────────────────────────────────┐
│                 Claims Manifest File                   │
│                    (`claims.json`)                     │
└───────────────────────────┬────────────────────────────┘
                            │ Evaluates
                            ▼
┌────────────────────────────────────────────────────────┐
│                   Upheld Verifier                      │
│                                                        │
│  1. Ingests claims manifest (JSON or stdin)            │
│  2. Checks file write evidence (git status / mtime)    │
│  3. Re-executes claimed test commands (`cmd`)          │
│  4. Parses stdout/stderr for pass/fail/total counts    │
│  5. Inspects git status for undeclared modified files  │
│  6. Generates Claim vs Evidence diff                   │
└───────────────────────────┬────────────────────────────┘
                            │
              ┌─────────────┴─────────────┐
              ▼                           ▼
┌───────────────────────────┐ ┌───────────────────────────┐
│       Report Mode         │ │        Strict Mode        │
│   Emits structured diff   │ │   Exits non-zero code     │
│       (Exit Code 0)       │ │    Blocks CI / Hooks      │
└───────────────────────────┘ └───────────────────────────┘
```

---

## 1. Claims Manifest Schema

A claims manifest is a JSON document declaring the specific accomplishments the agent asserts. Upheld focuses on two thin-wedge claim types: `tests_pass` and `file_written`.

```json
{
  "version": "1.0",
  "claims": [
    {
      "type": "file_written",
      "path": "src/verifier.ts"
    },
    {
      "type": "file_written",
      "path": "tests/verifier.test.ts"
    },
    {
      "type": "tests_pass",
      "cmd": "npm test",
      "passed": 18,
      "failed": 0,
      "total": 18
    }
  ]
}
```

### Supported Claim Types

| Type | Key Properties | Verification Method |
| :--- | :--- | :--- |
| `file_written` | `path` (relative or absolute path), optional `description` | Verifies write evidence: checks if file exists AND was modified/created (git dirty status or `mtime` $\ge$ `--since` timestamp). Never mere file existence. |
| `tests_pass` | `cmd` (shell command), optional `passed`, `failed`, `total`, `description` | Re-executes `cmd`, captures exit code, parses runner outputs (`pytest`, `vitest`, `jest`, generic fallback). |

---

## 2. File Write Evidence Evaluation

For `file_written` claims:
- **Write Evidence Required**: Upheld requires proof that the file was written or modified in the current session.
- **Evaluation Mechanism**:
  1. Verifies that the path exists on disk (`stat`).
  2. If `--since <timestamp>` is provided, checks if `fileStat.mtimeMs >= sinceTimestamp`.
  3. Checks `git status --porcelain` to verify if the file is tracked-modified, staged, or untracked.
  4. If a file exists on disk but was neither modified in git status nor modified after the `--since` timestamp, Upheld marks the claim as `unmet` with details noting unchanged status.

---

## 3. Test Output Parsers & Execution Engine

When evaluating a `tests_pass` claim, Upheld executes `cmd` via a subshell and passes stdout/stderr through specialized test output parsers:

- **Jest / Vitest**: Extracts `Tests: X passed, Y failed, Z total` patterns.
- **Pytest**: Extracts `X passed, Y failed, Z skipped in ...s` summary lines.
- **Generic Fallback**: Evaluates process exit code `0` vs non-zero.

The actual parsed numbers are compared directly against the agent's claimed numbers. If claimed counts are omitted, Upheld checks for a successful exit code (`0`).

---

## 4. Unclaimed Change Detection

After evaluating all explicit claims, Upheld inspects the local Git working tree using `git status --porcelain`.

- If files in the working tree were created, edited, or deleted, but were **not** referenced in any `file_written` claim:
  - Upheld flags each untracked/modified file with status `unclaimed`.
- This ensures full transparency: agents cannot stealthily modify test suites, disable linters, or leave dirty build artifacts behind.
- Can be disabled using `--no-unclaimed`.

---

## 5. Evaluation Modes

### Report Mode (Default)
In Report Mode, Upheld runs all verifications, prints the complete breakdown table (or JSON/Markdown), and exits with status code `0`. This is ideal for informational PR comments, step summaries, and passive observability.

### Strict Mode (`--strict`)
In Strict Mode, Upheld exits with status code `1` if:
- Any claim evaluation results in `unmet`.
- Any unexpected file is flagged as `unclaimed` (unless `--no-unclaimed` is passed).
- Any test command fails to execute or exits non-zero.

Strict mode turns Upheld into an automated quality gate for CI workflows and Claude Code Stop-hooks.
