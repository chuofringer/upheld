# upheld

Upheld — claims vs evidence verifier for AI coding agents. Done means shown.

`upheld` verifies agent claims against verifiable evidence (tests, files, pattern checks) and logs immutable claim receipts to a **local ledger**.

> **Note**: 100% local file only — no cloud services, no remote telemetry, no hosted SaaS.

---

## Features

- **Evidence Verification**: Verifies claims against actual environment evidence (`command`, `file_exists`, `file_contains`).
- **Claim Receipt Ledger**: Optional `--ledger path/to/ledger.jsonl` appends a single JSONL line per verification run containing:
  - Timestamp & unique run ID
  - Claim digests (IDs, status, sha256 hash)
  - `upheld`, `unmet`, and `unclaimed` count metrics
  - Exit mode (`pass`, `fail`, `warn`)
- **Ledger Summary**: `upheld ledger summary` prints a clean summary of the last *N* runs from your local ledger.

---

## Installation & Setup

```bash
npm install
npm run build
```

Requires Node.js 20+.

---

## Usage

### 1. Verify Claims & Append to Local Ledger

Define claims in `.upheld.json` or pass via `--config`:

```json
{
  "claims": [
    {
      "id": "unit-tests",
      "description": "All unit tests pass",
      "type": "command",
      "command": "npm test"
    },
    {
      "id": "types-valid",
      "description": "TypeScript compiler succeeds with zero errors",
      "type": "command",
      "command": "npm run build"
    }
  ]
}
```

Run verification and append a receipt to `.upheld/ledger.jsonl`:

```bash
npx upheld verify --ledger .upheld/ledger.jsonl
```

Output:
```text
Verification Run: 64e24ef5-df12-42fe-bcfa-e71ce09bc298
Timestamp: 2026-09-05T23:50:00.000Z
────────────────────────────────────────────────────────────
[✔] unit-tests (UPHELD): All unit tests pass
    Command succeeded: npm test
[✔] types-valid (UPHELD): TypeScript compiler succeeds with zero errors
    Command succeeded: npm run build
────────────────────────────────────────────────────────────
Summary: 2 upheld, 0 unmet, 0 unclaimed (Total: 2)
Exit Mode: PASS
Receipt appended to local ledger: .upheld/ledger.jsonl
```

### 2. View Ledger Summary

Inspect the most recent verification runs recorded in your local ledger:

```bash
npx upheld ledger summary --ledger .upheld/ledger.jsonl --limit 5
```

Terminal Output:
```text
Receipt Ledger (2 runs):
────────────────────────────────────────────────────────────────────────────────
RUN ID        TIMESTAMP                 MODE    UPHELD    UNMET     UNCLAIMED   
────────────────────────────────────────────────────────────────────────────────
64e24ef5-df1  2026-09-05T23:50:00.000Z  PASS    2         0         0           
a18b93f0-4e2  2026-09-05T23:52:10.000Z  PASS    2         0         0           
────────────────────────────────────────────────────────────────────────────────
```

Or get machine-readable JSON:

```bash
npx upheld ledger summary --ledger .upheld/ledger.jsonl --json
```

---

## Receipt Ledger JSONL Format

Each verification line in the ledger is formatted as:

```json
{
  "version": "1.0",
  "runId": "64e24ef5-df12-42fe-bcfa-e71ce09bc298",
  "timestamp": "2026-09-05T23:50:00.000Z",
  "exitMode": "pass",
  "passed": true,
  "counts": {
    "total": 2,
    "upheld": 2,
    "unmet": 0,
    "unclaimed": 0
  },
  "claims": [
    {
      "id": "unit-tests",
      "status": "upheld",
      "hash": "3f4ab2d109ef",
      "description": "All unit tests pass"
    }
  ]
}
```

---

## Testing

```bash
npm test
```
