# upheld

Upheld — claims vs evidence verifier for AI coding agents. *Done means shown.*

## Overview

AI coding agents often assert that a task, test, or build is completed without providing verification evidence. `upheld` ensures that agent claims are backed by verifiable evidence (command outputs, file assertions, or recorded checks) and prints a clear **Claims vs Evidence** table.

## Quick Start

```bash
# Direct verification of .upheld.json or claims.json
npx upheld verify

# Wrap any agent command to execute and auto-verify claims if present
npx upheld wrap -- npm test
```

## Claims File Format (`.upheld.json` or `claims.json`)

Create a `.upheld.json` file in your project root:

```json
{
  "claims": [
    {
      "id": "claim-build",
      "description": "TypeScript builds cleanly",
      "command": "npm run build"
    },
    {
      "id": "claim-tests",
      "description": "All unit tests pass",
      "command": "npm test",
      "expected": "pass"
    },
    {
      "id": "claim-artifact",
      "description": "Output bundle generated",
      "file": "dist/index.js"
    }
  ]
}
```

## Stop-Hook & Shell Wrapper Pattern

For agent loops in tools like Cursor or Claude Code, you can wire `upheld` into your shell workflow or stop hooks to ensure verification evidence is evaluated before marking tasks done.

> **Note:** This is an optional pattern that users wire into their own agent scripts or CI/tool hooks. We do not require or bundle a proprietary plugin.

### Using `upheld wrap`

Prefix any command inside your agent loop with `upheld wrap --`:

```bash
upheld wrap -- npm run test
```

`upheld wrap` executes the target command first. If `.upheld.json` (or `claims.json`) is present in the working directory, it automatically validates all claims and renders the Claims vs Evidence table:

```
=== Upheld: Claims vs Evidence Verification ===
| Claim ID       | Claim / Description                  | Status     | Evidence / Details               |
|----------------|--------------------------------------|------------|----------------------------------|
| claim-build    | TypeScript builds cleanly            | VERIFIED   | Command completed with exit code |
| claim-tests    | All unit tests pass                  | VERIFIED   | Output matched expectation       |
| claim-artifact | Output bundle generated              | VERIFIED   | File exists: dist/index.js       |

Summary: 3/3 verified (0 failed)
```

### Stop-Hook Helper Script (`scripts/stop-hook.sh`)

You can invoke `./scripts/stop-hook.sh` at the end of agent turns or test runs:

```bash
./scripts/stop-hook.sh
```

Or pass a specific validation command to run through the wrapper:

```bash
./scripts/stop-hook.sh npm test
```

## CLI Reference

```
USAGE:
  upheld wrap [--strict] [--claims <path>] -- <command> [args...]
  upheld verify [--claims <path>]
  upheld --help

OPTIONS:
  --strict         Exit with code 1 if any claim verification fails
  --claims, -c     Path to claims JSON file (default: .upheld.json / claims.json)
  --help, -h       Show help message
  --version, -v    Show version number
```
