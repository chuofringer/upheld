# upheld
Upheld — claims vs evidence verifier for AI coding agents. Done means shown.

## Features

- **Claim Verification**: Evaluate structured claims against empirical rules (file existence, zero-exit commands, content pattern matching).
- **`upheld diff` Subcommand**: Compare two claim-result JSON reports (or compare a baseline against a live `--run <claims.json>`) and output a compact delta of newly Upheld, newly Unmet (regressions), and newly Unclaimed claims. Perfect for CI flakiness tracking and AI agent retry loops.

## Installation & Build

```bash
npm install
npm run build
npm test
```

## Usage

### 1. Verify Claims

```bash
# Verify claims and print VerificationReport JSON
node ./dist/cli.js verify claims.json

# Save VerificationReport to file
node ./dist/cli.js verify claims.json --out baseline-report.json
```

### 2. Diff Claim Reports (`upheld diff`)

Compare two reports:
```bash
node ./dist/cli.js diff baseline-report.json current-report.json
```

Compare a baseline report against a fresh verification run:
```bash
node ./dist/cli.js diff baseline-report.json --run claims.json
```

Output raw JSON for automated pipeline integration:
```bash
node ./dist/cli.js diff baseline-report.json current-report.json --json
```

Example Output:
```text
=== Upheld Claim Delta ===
Summary: +2 upheld | -1 unmet | ~0 unclaimed | 5 unchanged

✔ Newly Upheld:
  + [UPHELD] feature_auth - User authentication tests passing (Command executed with exit code 0)
  + [UPHELD] schema_migration - Database migration file exists (File exists at src/db/migration.ts)

✖ Newly Unmet (Regressions / Failures):
  - [UNMET] lint_clean - Linter check passes (Command failed with exit code 1)
```

## Programmatic API

```typescript
import { verifyClaims, diffReports, formatCompactDiff } from 'upheld';

const baseline = verifyClaims(initialClaims);
// ... run code changes / agent actions ...
const target = verifyClaims(updatedClaims);

const diff = diffReports(baseline, target);
console.log(formatCompactDiff(diff, { color: true }));
```
