# Upheld Use-Case Verification Log

This document records verification evidence for the core use cases exercised against the Upheld scaffold branch (`cursor/upheld-scaffold-v0-5bfe`, PR #1 tip) and the false-completion corpus branch (`cursor/false-completion-fixture-corpus-6c33`, PR #6 tip).

---

## Summary Matrix

| # | Use Case | Branch / PR | Command Executed | Exit Code | Upheld / Unmet Result | Match Expectation |
|---|----------|-------------|------------------|-----------|-----------------------|-------------------|
| 1 | `build` + `npm test` on #1 tip | `cursor/upheld-scaffold-v0-5bfe` (PR #1) | `npm run build && npm test` | `0` | 5 test files passed (20 tests passed) | ✅ Yes |
| 2 | `tests_pass` claim (real sample-project vitest) | `cursor/upheld-scaffold-v0-5bfe` (PR #1) | `echo '{"claims":[{"type":"tests_pass","cmd":"npx vitest run --config examples/sample-project/vitest.config.ts","passed":2,"failed":0,"total":2}]}' \| node ./dist/bin.js verify --no-unclaimed` | `0` | `UPHELD` (1 upheld, 0 unmet) | ✅ Yes |
| 3 | `tests_pass` with wrong counts (fail-closed) | `cursor/upheld-scaffold-v0-5bfe` (PR #1) | `echo '{"claims":[{"type":"tests_pass","cmd":"npx vitest run --config examples/sample-project/vitest.config.ts","passed":5,"failed":0,"total":5}]}' \| node ./dist/bin.js verify --no-unclaimed` | `0` (report mode) | `UNMET` (0 upheld, 1 unmet; observed 2 passed/total) | ✅ Yes |
| 4 | `file_written` with write evidence | `cursor/upheld-scaffold-v0-5bfe` (PR #1) | `touch /tmp/test_evidence_file.txt && echo '{"claims":[{"type":"file_written","path":"/tmp/test_evidence_file.txt"}]}' \| node ./dist/bin.js verify --no-unclaimed --since $(date +%s%3N -d '1 minute ago')` | `0` | `UPHELD` (1 upheld, 0 unmet) | ✅ Yes |
| 5 | `file_written` existence-only / unchanged pre-existing | `cursor/upheld-scaffold-v0-5bfe` (PR #1) | `echo '{"claims":[{"type":"file_written","path":"README.md"}]}' \| node ./dist/bin.js verify --no-unclaimed` | `0` (report mode) | `UNMET` (0 upheld, 1 unmet; unchanged in git status) | ✅ Yes |
| 6 | `--strict` non-zero on unmet | `cursor/upheld-scaffold-v0-5bfe` (PR #1) | `echo '{"claims":[{"type":"file_written","path":"README.md"}]}' \| node ./dist/bin.js verify --no-unclaimed --strict` | `1` | `UNMET` with non-zero exit code `1` | ✅ Yes |
| 7 | `npm run corpus` on #6 tip | `cursor/false-completion-fixture-corpus-6c33` (PR #6) | `npm run corpus` | `0` | 1 test file passed (25 tests passed across 10 fixtures) | ✅ Yes |
| 8a | Spot-check Fixture 07 (`detectUnclaimed`) | `cursor/false-completion-fixture-corpus-6c33` (PR #6) | `touch unclaimed_scratchpad.tmp && node ./dist/bin.js verify --since 0 examples/corpus/07-unclaimed-side-effects/claims.json ; rm -f unclaimed_scratchpad.tmp` | `0` | `UPHELD` for 2 claims, `UNCLAIMED` for `unclaimed_scratchpad.tmp` | ✅ Yes |
| 8b | Spot-check Fixture 09 (`write-evidence`) | `cursor/false-completion-fixture-corpus-6c33` (PR #6) | `node ./dist/bin.js verify --since 0 examples/corpus/09-fully-upheld-verification/claims.json` vs `node ./dist/bin.js verify --no-unclaimed examples/corpus/09-fully-upheld-verification/claims.json` | `0` | With write evidence (`--since 0`): `UPHELD` (2/2); Without write evidence: `UNMET` for `package.json` | ✅ Yes |

---

## Detailed Command Transcripts

### Use Case 1: Build + npm test on PR #1 tip
- **Branch**: `cursor/upheld-scaffold-v0-5bfe`
- **Command**: `npm run build && npm test`
- **Exit Code**: `0`
- **Output**:
```text
> upheld@0.0.1 build
> tsc

> upheld@0.0.1 test
> vitest run

 RUN  v3.2.7 /workspace

 ✓ tests/formatter.test.ts (3 tests)
 ✓ tests/runners.test.ts (5 tests)
 ✓ tests/claims.test.ts (4 tests)
 ✓ tests/cli.test.ts (3 tests)
 ✓ tests/verifier.test.ts (5 tests)

 Test Files  5 passed (5)
      Tests  20 passed (20)
```

---

### Use Case 2: `tests_pass` claim (real sample-project vitest) → UPHELD
- **Branch**: `cursor/upheld-scaffold-v0-5bfe`
- **Command**:
```bash
echo '{"claims":[{"type":"tests_pass","cmd":"npx vitest run --config examples/sample-project/vitest.config.ts","passed":2,"failed":0,"total":2}]}' | node ./dist/bin.js verify --no-unclaimed
```
- **Exit Code**: `0`
- **Output**:
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

---

### Use Case 3: `tests_pass` with wrong counts → UNMET (fail-closed)
- **Branch**: `cursor/upheld-scaffold-v0-5bfe`
- **Command**:
```bash
echo '{"claims":[{"type":"tests_pass","cmd":"npx vitest run --config examples/sample-project/vitest.config.ts","passed":5,"failed":0,"total":5}]}' | node ./dist/bin.js verify --no-unclaimed
```
- **Exit Code**: `0` (report mode)
- **Output**:
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

### Use Case 4: `file_written` with write evidence → UPHELD
- **Branch**: `cursor/upheld-scaffold-v0-5bfe`
- **Command**:
```bash
touch /tmp/test_evidence_file.txt && echo '{"claims":[{"type":"file_written","path":"/tmp/test_evidence_file.txt"}]}' | node ./dist/bin.js verify --no-unclaimed --since $(date +%s%3N -d '1 minute ago')
```
- **Exit Code**: `0`
- **Output**:
```text
Upheld — Claims vs Evidence
============================

Status  |  Claim Type    |  Claim                              |  Evidence                            
--------+----------------+-------------------------------------+--------------------------------------
UPHELD  |  file_written  |  path: /tmp/test_evidence_file.txt  |  exists (size: 0 B, modified/created)

Summary:
  Upheld:    1
  Unmet:     0
  Unclaimed: 0
  Total:     1
```

---

### Use Case 5: `file_written` existence-only / unchanged pre-existing → UNMET
- **Branch**: `cursor/upheld-scaffold-v0-5bfe`
- **Command**:
```bash
echo '{"claims":[{"type":"file_written","path":"README.md"}]}' | node ./dist/bin.js verify --no-unclaimed
```
- **Exit Code**: `0` (report mode)
- **Output**:
```text
Upheld — Claims vs Evidence
============================

Status  |  Claim Type    |  Claim            |  Evidence                        
--------+----------------+-------------------+----------------------------------
UNMET   |  file_written  |  path: README.md  |  exists (size: 4615 B, unchanged)

Summary:
  Upheld:    0
  Unmet:     1
  Unclaimed: 0
  Total:     1

Notes & Mismatches:
  [UNMET] claim-1: File 'README.md' exists but has no evidence of write or change this run (unmodified in git status and mtime prior to evaluation window)
```

---

### Use Case 6: `--strict` non-zero on unmet
- **Branch**: `cursor/upheld-scaffold-v0-5bfe`
- **Command**:
```bash
echo '{"claims":[{"type":"file_written","path":"README.md"}]}' | node ./dist/bin.js verify --no-unclaimed --strict
```
- **Exit Code**: `1` (strict failure mode)
- **Output**:
```text
Upheld — Claims vs Evidence
============================

Status  |  Claim Type    |  Claim            |  Evidence                        
--------+----------------+-------------------+----------------------------------
UNMET   |  file_written  |  path: README.md  |  exists (size: 4615 B, unchanged)

Summary:
  Upheld:    0
  Unmet:     1
  Unclaimed: 0
  Total:     1

Notes & Mismatches:
  [UNMET] claim-1: File 'README.md' exists but has no evidence of write or change this run (unmodified in git status and mtime prior to evaluation window)
```

---

### Use Case 7: `npm run corpus` on PR #6 tip
- **Branch**: `cursor/false-completion-fixture-corpus-6c33`
- **Command**: `npm run corpus`
- **Exit Code**: `0`
- **Output**:
```text
> upheld@0.0.1 corpus
> vitest run tests/corpus.test.ts

 RUN  v3.2.7 /workspace

 ✓ tests/corpus.test.ts (25 tests) 250ms

 Test Files  1 passed (1)
      Tests  25 passed (25)
   Duration  446ms
```

---

### Use Case 8: Spot-check Fixture 07 (`detectUnclaimed`) and Fixture 09 (`write-evidence`)
- **Branch**: `cursor/false-completion-fixture-corpus-6c33`

#### Fixture 07 Spot-Check (`detectUnclaimed`):
- **Command**:
```bash
touch unclaimed_scratchpad.tmp && node ./dist/bin.js verify --since 0 examples/corpus/07-unclaimed-side-effects/claims.json ; rm -f unclaimed_scratchpad.tmp
```
- **Exit Code**: `0`
- **Output**:
```text
Upheld — Claims vs Evidence
============================

Status     |  Claim Type      |  Claim                                     |  Evidence                                     
-----------+------------------+--------------------------------------------+-----------------------------------------------
UPHELD     |  file_written    |  path: README.md                           |  exists (size: 4941 B, modified/created)      
UPHELD     |  tests_pass      |  cmd: node -e 'console.log("Tests: 4 p...  |  exit: 0, passed: 4, failed: 0, total: 4      
UNCLAIMED  |  unclaimed_file  |  (none)                                    |  unclaimed file written/modified: unclaimed...

Summary:
  Upheld:    2
  Unmet:     0
  Unclaimed: 1
  Total:     3

Notes & Mismatches:
  [UNCLAIMED] unclaimed-1: File 'unclaimed_scratchpad.tmp' was modified or created in git status but not claimed
```

#### Fixture 09 Spot-Check (`write-evidence`):
- **With write evidence (`--since 0`)**:
  - **Command**: `node ./dist/bin.js verify --since 0 examples/corpus/09-fully-upheld-verification/claims.json`
  - **Result**: `UPHELD` (2 upheld, 0 unmet)
- **Without write evidence (unmodified file, clean git, no `--since`)**:
  - **Command**: `node ./dist/bin.js verify --no-unclaimed examples/corpus/09-fully-upheld-verification/claims.json`
  - **Result**: `UNMET` for `package.json` (1 upheld, 1 unmet; notes: `File 'package.json' exists but has no evidence of write or change this run`)

---

## Wave 2 Features Status

The following features belong to independent Wave 2 pull requests and are not on the scaffold tip:

- **PR #16 (`cursor/feat-upheld-diff-c5c5`)**: `upheld diff` for comparing claim-result deltas across runs.
- **PR #17 (`cursor/site-homepage-255e`)**: Static project homepage and docs for GitHub Pages.
- **PR #18 (`cursor/wrap-and-stop-hook-helpers-c461`)**: `upheld wrap` and stop-hook helper integrations.
- **PR #19 (`cursor/claim-receipt-ledger-fcf2`)**: Local append-only claim receipt ledger (`.upheld/receipts.jsonl`).
- **PR #20 (`cursor/multi-path-file-written-605a`)**: Multi-path `paths: string[]` support on `file_written` claims.
- **PR #21 (`cursor/feat-sarif-output-16b6`)**: SARIF report formatting (`--format sarif`).
- **PR #22 (`cursor/html-verify-report-48ee`)**: Self-contained HTML verification reports (`--format html`).
