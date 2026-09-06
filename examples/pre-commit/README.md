# Upheld Pre-Commit Hook

Pre-commit verification ensures that every commit upholds all empirical claims made by an AI coding agent or developer before code is committed.

## How it works

1. Discovers claims JSON in standard locations (`.upheld/claims.json`, `.claude/claims.json`, `claims.json`) or via argument / `$UPHELD_CLAIMS_FILE`.
2. Runs `node dist/bin.js verify --strict` (or `npx . verify --strict`) against the claims file.
3. If all claims are upheld, the commit proceeds cleanly.
4. If any claim is unmet or tests fail, the commit is aborted. If no claims file is present, it exits gracefully (`0`).

## Setup with Git Hooks

### Native Git Hook
```bash
cp examples/pre-commit/pre-commit.sh .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

### Husky (.husky/pre-commit)

One-liner in `.husky/pre-commit`:

```bash
test -f .upheld/claims.json && npx . verify --strict .upheld/claims.json || true
```
Or using `node dist/bin.js`:
```bash
test -f .upheld/claims.json && node dist/bin.js verify --strict .upheld/claims.json || true
```
Or using the helper script:
```bash
bash examples/pre-commit/pre-commit.sh
```

### Lefthook (lefthook.yml)

One-liner in `lefthook.yml`:

```yaml
pre-commit:
  commands:
    upheld:
      run: test -f .upheld/claims.json && npx . verify --strict .upheld/claims.json || true
```

Or calling the hook script:

```yaml
pre-commit:
  commands:
    upheld:
      run: bash examples/pre-commit/pre-commit.sh
```
