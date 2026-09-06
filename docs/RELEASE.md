# Releasing Upheld v0.1.0 — First Public Release

> **Honesty rule:** Do NOT claim `npm i -g upheld` works until `npm view upheld` returns `0.1.0`.
> This checklist exists so the first release lands cleanly and every public claim is verifiable.

---

## Prerequisites

| Requirement | Why |
|---|---|
| Node.js >= 20.0.0 | Engine field in `package.json` |
| npm account with publish rights | `npm whoami` must resolve; 2FA recommended |
| All CI green on `main` | `verify.yml` must pass after merges |
| npm name `upheld` is available | Run `npm view upheld` — must return 404 before first publish |

---

## PRs That Should Land Before Release

Merge order matters because later PRs may depend on earlier ones.

### Suggested merge order

| Order | PR | Title | Required? | Notes |
|---|---|---|---|---|
| 1 | [#1](https://github.com/chuofringer/upheld/pull/1) | feat: thin-wedge scaffold | **Yes** | Foundation — core engine, CLI, tests, action.yml |
| 2 | [#5](https://github.com/chuofringer/upheld/pull/5) | chore: npm publish prep | **Yes** | `.npmignore`, `files` field, `prepublishOnly` |
| 3 | [#6](https://github.com/chuofringer/upheld/pull/6) | feat: false-completion fixture corpus | Recommended | Validates verifier against 10 real failure modes |
| 4 | [#15](https://github.com/chuofringer/upheld/pull/15) | docs: visual product README | **Yes** | Public README must be honest before publish |
| 5 | [#17](https://github.com/chuofringer/upheld/pull/17) | site: homepage reshape | Optional | GitHub Pages site; can ship post-release |
| 6 | [#24](https://github.com/chuofringer/upheld/pull/24) | docs: runnable tutorial | Optional | Nice-to-have for launch; can follow as 0.1.1 |

> After each merge, wait for CI (`verify.yml`) to pass on `main` before merging the next PR.
> Resolve any merge conflicts incrementally — do not batch-merge without CI confirmation.

---

## Version

- **Target version:** `0.1.0`
- **Package name:** `upheld`
- **Scope:** unscoped (public)
- **Registry:** https://registry.npmjs.org

### Verify npm name availability

```bash
npm view upheld
# Expected: 404 / "Not Found" if unclaimed
# If the name is taken, stop and choose an alternative before proceeding.
```

---

## Release Checklist

Run every step in order. Do not skip the dry-run stages.

### 1. Prepare the tree

```bash
git checkout main
git pull origin main
```

Confirm the working tree is clean (`git status` shows nothing).

### 2. Bump version

```bash
npm version 0.1.0 --no-git-tag-version
# Manually verify package.json shows "version": "0.1.0"
git add package.json package-lock.json
git commit -m "chore: bump version to 0.1.0"
```

### 3. Build

```bash
npm run build
```

Confirm `dist/` contains `bin.js`, `index.js`, `cli.js`, and type declarations.

### 4. Test

```bash
npm test
```

All tests must pass. Zero failures, zero skips.

### 5. Corpus validation (if PR #6 landed)

```bash
npm run corpus
```

All 10 corpus fixtures must produce expected verdicts.

### 6. Tutorial smoke test (if PR #24 landed)

```bash
cd examples/tutorial && bash run.sh
```

Every case must exit 0 (upheld) or match expected unmet/unclaimed verdicts.

### 7. Self-verify with fixtures

```bash
node dist/bin.js verify examples/fixtures/claims-upheld.json --since 0
# Expected: all claims UPHELD, exit 0

node dist/bin.js verify examples/fixtures/claims-unmet.json --since 0 --strict
# Expected: UNMET claims detected, exit non-zero
```

### 8. Dry-run publish

```bash
npm pack --dry-run
# Review the file list — should match the `files` field in package.json:
#   dist/, action.yml, README.md, LICENSE

npm publish --access public --dry-run
# Confirm: no errors, tarball size is reasonable (< 50 kB)
```

### 9. Publish for real

```bash
npm publish --access public
```

### 10. Verify the publish succeeded

```bash
npm view upheld version
# Must print: 0.1.0
```

**Only after this command returns `0.1.0`** may you update any documentation to claim `npm i -g upheld` works.

### 11. Tag and push

```bash
git tag v0.1.0
git push origin main
git push origin v0.1.0
```

### 12. Create GitHub Release

Go to https://github.com/chuofringer/upheld/releases/new (or use `gh`):

```bash
gh release create v0.1.0 \
  --title "v0.1.0 — First Public Release" \
  --notes "First claimable install of Upheld.

## Highlights
- Core engine: \`upheld verify\` with \`tests_pass\` and \`file_written\` evaluators
- Strict mode (\`--strict\`) and report mode (default)
- Test runner parsers: pytest, vitest, jest
- Unclaimed file detection via git status
- GitHub Action composite action (\`action.yml\`)
- Claude Code stop-hook example

## Install
\`\`\`bash
npm i -g upheld
\`\`\`

Full changelog: https://github.com/chuofringer/upheld/blob/main/CHANGELOG.md"
```

---

## Post-Release

These steps happen **only after `npm view upheld version` returns `0.1.0`**.

### Flip README install instructions

Update `README.md` to replace the clone-only install block:

```diff
- > **Note**: Upheld is currently in active development. NPM package publishing
- > is planned for a future release. For now, run Upheld directly from source.
+ ## Install
+
+ ```bash
+ npm i -g upheld
+ ```
```

Commit and push:

```bash
git add README.md
git commit -m "docs: flip install to npm after v0.1.0 publish"
git push origin main
```

### GitHub Pages (if PR #17 landed)

Enable GitHub Pages on the repo (Settings → Pages → Source: `main`, folder: `/site`).

### Update badges

Add to `README.md` after confirming CI is green on `main`:

```markdown
[![npm version](https://img.shields.io/npm/v/upheld)](https://www.npmjs.com/package/upheld)
[![CI](https://github.com/chuofringer/upheld/actions/workflows/verify.yml/badge.svg)](https://github.com/chuofringer/upheld/actions/workflows/verify.yml)
```

---

## Honesty Gates — What NOT To Do

| Do NOT | Until |
|---|---|
| Claim `npm i -g upheld` works in README | `npm view upheld version` returns `0.1.0` |
| Add npm version badge | Package is live on registry |
| Add CI badge | `verify.yml` passes on `main` with merged code |
| Reference "stable" or "production" | Enough real-world usage to justify the claim |
| Enable GitHub Pages | `site/` directory is on `main` and renders correctly |

---

## Rollback

If the publish is botched or a critical bug is found immediately:

```bash
npm unpublish upheld@0.1.0 --force   # Only within 72 hours of publish
git tag -d v0.1.0
git push origin :refs/tags/v0.1.0
```

Then revert the README install flip and re-enter "clone-only" mode until the fix ships.
