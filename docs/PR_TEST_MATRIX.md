# Ship PR Test Matrix

> Generated 2026-09-06T01:23Z–01:25Z UTC by automated test runner.
> Environment: Node v22.14.0, npm 10.9.7, Linux x86_64.
> Method: for each branch, `git checkout --detach origin/<branch>`, then
> `npm install && npm run build && npm test` (and `npm run corpus` when the
> script exists). Self-verify via `node dist/bin.js verify <claims-file>` on
> any fixture/tutorial/corpus claims present.

## Summary

| Metric | Count |
|--------|-------|
| Ship PRs tested | 17 |
| Build pass | 16 |
| Test pass | 16 |
| Corpus pass | 1 (only PR #6 has the script) |
| Build/test N/A (no package.json) | 1 (PR #17 — static site only) |
| Failures | 0 |

All 16 Node-based PRs pass build and test cleanly. PR #17 is a static HTML/CSS site with no `package.json`; npm commands are not applicable.

## Full Matrix

| PR | Branch | Title | Build | Test | Corpus | Self-Verify Notes |
|----|--------|-------|-------|------|--------|-------------------|
| [#1](https://github.com/chuofringer/upheld/pull/1) | `cursor/upheld-scaffold-v0-5bfe` | feat: thin-wedge scaffold | 0 ✅ | 0 ✅ (5 files, 20 tests) | N/A | `claims-upheld.json`: 1 upheld, 1 unmet (file_written mtime-before-window); `claims-unmet.json`: 0 upheld, 2 unmet (phantom file + inflated counts). Exit 0 both. |
| [#2](https://github.com/chuofringer/upheld/pull/2) | `cursor/docs-guide-e48d` | docs: reshape guide suite | 0 ✅ | 0 ✅ (5 files, 20 tests) | N/A | Same fixture behaviour as PR #1. |
| [#3](https://github.com/chuofringer/upheld/pull/3) | `cursor/feat-init-bootstrap-d7de` | feat: upheld init bootstrap | 0 ✅ | 0 ✅ (6 files, 27 tests) | N/A | Same fixture behaviour as PR #1. `init` subcommand present in help. |
| [#4](https://github.com/chuofringer/upheld/pull/4) | `cursor/json-output-and-github-check-run-180b` | feat: GitHub check run + schema stability | 0 ✅ | 0 ✅ (7 files, 30 tests) | N/A | Same fixture behaviour. `--github-check` flag in help. |
| [#5](https://github.com/chuofringer/upheld/pull/5) | `cursor/npm-publish-prep-313b` | chore: npm publish prep | 0 ✅ | 0 ✅ (5 files, 20 tests) | N/A | Same fixture behaviour as PR #1. |
| [#6](https://github.com/chuofringer/upheld/pull/6) | `cursor/false-completion-fixture-corpus-6c33` | feat: false-completion fixture corpus | 0 ✅ | 0 ✅ (6 files, 45 tests) | 0 ✅ (1 file, 25 tests) | Fixtures: same as PR #1. Corpus 10 cases all correctly detect false claims (phantom files, inflated counts, crash exits, empty suites, etc.). All exit 0. |
| [#7](https://github.com/chuofringer/upheld/pull/7) | `cursor/pre-commit-watch-helpers-3300` | feat: pre-commit and watch helpers | 0 ✅ | 0 ✅ (5 files, 26 tests) | N/A | Same fixture behaviour. `--watch` flag in help. |
| [#10](https://github.com/chuofringer/upheld/pull/10) | `cursor/extract-claims-transcript-ecc5` | feat: extract claims from transcripts | 0 ✅ | 0 ✅ (6 files, 25 tests) | N/A | Same fixture behaviour. `extract` subcommand in help. |
| [#11](https://github.com/chuofringer/upheld/pull/11) | `cursor/feat-codex-opencode-adapters-a161` | feat: Codex and OpenCode adapters | 0 ✅ | 0 ✅ (6 files, 24 tests) | N/A | Same fixture behaviour as PR #1. |
| [#14](https://github.com/chuofringer/upheld/pull/14) | `cursor/harden-test-runners-parsers-dfc1` | fix: harden test runner parsers | 0 ✅ | 0 ✅ (5 files, 42 tests) | N/A | Same fixture behaviour as PR #1. |
| [#15](https://github.com/chuofringer/upheld/pull/15) | `cursor/visual-product-readme-ac5a` | docs: visual product README | 0 ✅ | 0 ✅ (5 files, 20 tests) | N/A | Same fixture behaviour as PR #1. |
| [#17](https://github.com/chuofringer/upheld/pull/17) | `cursor/site-homepage-255e` | Reshape homepage (static site) | N/A | N/A | N/A | Branch contains only `site/index.html` + `site/style.css` + `README.md`. No `package.json`, no Node project. npm commands not applicable. |
| [#20](https://github.com/chuofringer/upheld/pull/20) | `cursor/multi-path-file-written-605a` | feat: multi-path file_written claims | 0 ✅ | 0 ✅ (6 files, 33 tests) | N/A | `claims-upheld.json`: 1 upheld, 1 unmet (file mtime); `claims-unmet.json`: 0 upheld, 2 unmet. CLI test includes multi-path fixture. |
| [#21](https://github.com/chuofringer/upheld/pull/21) | `cursor/feat-sarif-output-16b6` | feat: SARIF output for unmet claims | 0 ✅ | 0 ✅ (5 files, 24 tests) | N/A | Same fixture behaviour. `--sarif` / `--format sarif` in help. |
| [#22](https://github.com/chuofringer/upheld/pull/22) | `cursor/html-verify-report-48ee` | feat: self-contained HTML verify report | 0 ✅ | 0 ✅ (5 files, 23 tests) | N/A | Same fixture behaviour. `--html <path>` flag in help; CLI tests write and validate HTML report. |
| [#23](https://github.com/chuofringer/upheld/pull/23) | `cursor/docs-use-cases-verification-a512` | docs: use-case verification log | 0 ✅ | 0 ✅ (5 files, 20 tests) | N/A | Same fixture behaviour as PR #1. |
| [#24](https://github.com/chuofringer/upheld/pull/24) | `cursor/runnable-tutorial-and-examples-0df4` | docs: runnable tutorial and examples | 0 ✅ | 0 ✅ (6 files, 25 tests) | N/A | Fixtures: same as PR #1. Tutorial: `claims-case-a-upheld.json` 1/1 upheld; `claims-case-e-corpus.json` 1 upheld + 1 unmet (file mtime). `tests/tutorial.test.ts` (5 tests) including `run.sh` end-to-end. |

## Skipped PRs

Per instructions, these PRs were not tested (skip-unless-quick):

| PR | Title | Reason |
|----|-------|--------|
| #8 | feat: CI annotations for unmet claims | Skipped per task |
| #9 | feat: false-claim fixture benchmark script | Skipped per task |
| #12 | feat: reward-hack lint-diff for dishonest test changes | Skipped per task |
| #13 | feat: unclaimed file change report | Skipped per task |
| #16 | feat: upheld diff for claim-result deltas | Skipped per task |
| #18 | feat: wrap and stop-hook helpers | Skipped per task |
| #19 | feat: local claim receipt ledger | Skipped per task |

## Self-Verify Detail

### How self-verify works

After build, `node dist/bin.js verify <claims-file>` is run against each claims JSON found under `examples/fixtures/`, `examples/tutorial/`, and `examples/corpus/`. The tool checks:

- **`file_written`** claims: whether the file exists and shows evidence of a recent write (git status or mtime in evaluation window).
- **`tests_pass`** claims: runs the specified command, parses test output, and compares counts to claimed values.

### Expected UNMET results in fixtures

The `claims-upheld.json` fixture has one `file_written` claim for `examples/sample-project/src/math.ts` which is marked UNMET because the file exists but was not freshly written during the test run (mtime predates the evaluation window). This is **expected** — the fixture demonstrates the tool's freshness check.

The `claims-unmet.json` fixture deliberately contains a phantom file path (`non_existent_fake_file.txt`) and inflated test counts (claims 5 passed, observes 2). Both are correctly detected as UNMET.

### Corpus verification (PR #6)

The 10-case corpus under `examples/corpus/` exercised these false-completion patterns:

| Case | Pattern | Result |
|------|---------|--------|
| 01 | Skipped tests claimed as passed | UNMET ✅ |
| 02 | Phantom file write | UNMET ✅ |
| 03 | Wrong pass counts (Jest) | UNMET ✅ |
| 04 | Exit zero with failures | UNMET ✅ |
| 05 | Non-zero exit crash | UNMET ✅ |
| 06 | Empty test suite / filter miss | UNMET ✅ |
| 07 | Unclaimed side effects | 1 UPHELD + 1 UNMET (file mtime) ✅ |
| 08 | Pytest collection error | UNMET ✅ |
| 09 | Fully upheld verification | 1 UPHELD + 1 UNMET (file mtime) ✅ |
| 10 | Multi-claim partial failure | 3 UNMET ✅ |

All corpus cases produce the expected verdicts. The "file mtime" UNMETs in cases 07/09 are expected (files exist but were not freshly written in the test run).

### Tutorial verification (PR #24)

| Claims file | Result |
|------------|--------|
| `claims-case-a-upheld.json` | 1/1 UPHELD (tests_pass) ✅ |
| `claims-case-e-corpus.json` | 1 UPHELD (tests_pass) + 1 UNMET (file mtime) |

## Commands Run

For each Node-based PR branch:

```bash
git checkout --detach origin/<branch>
npm install --no-audit --no-fund
npm run build
npm test
npm run corpus          # only if script exists in package.json
node dist/bin.js verify <claims-file>  # for each fixture/tutorial/corpus claims JSON
```

For PR #17 (static site): checkout only; no npm commands applicable.

## Timestamps

| PR | Start (UTC) | End (UTC) |
|----|-------------|-----------|
| #1 | 2026-09-06T01:23:37Z | 2026-09-06T01:23:43Z |
| #2 | 2026-09-06T01:23:43Z | 2026-09-06T01:23:47Z |
| #3 | 2026-09-06T01:23:47Z | 2026-09-06T01:23:51Z |
| #4 | 2026-09-06T01:23:51Z | 2026-09-06T01:23:57Z |
| #5 | 2026-09-06T01:23:57Z | 2026-09-06T01:24:01Z |
| #6 | 2026-09-06T01:24:01Z | 2026-09-06T01:24:06Z |
| #7 | 2026-09-06T01:24:06Z | 2026-09-06T01:24:10Z |
| #10 | 2026-09-06T01:24:10Z | 2026-09-06T01:24:15Z |
| #11 | 2026-09-06T01:24:15Z | 2026-09-06T01:24:18Z |
| #14 | 2026-09-06T01:24:18Z | 2026-09-06T01:24:22Z |
| #15 | 2026-09-06T01:24:22Z | 2026-09-06T01:24:26Z |
| #17 | 2026-09-06T01:24:26Z | 2026-09-06T01:24:26Z |
| #20 | 2026-09-06T01:24:26Z | 2026-09-06T01:24:31Z |
| #21 | 2026-09-06T01:24:31Z | 2026-09-06T01:24:36Z |
| #22 | 2026-09-06T01:24:36Z | 2026-09-06T01:24:40Z |
| #23 | 2026-09-06T01:24:40Z | 2026-09-06T01:24:44Z |
| #24 | 2026-09-06T01:24:44Z | 2026-09-06T01:24:51Z |
