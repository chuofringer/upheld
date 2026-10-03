# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed
- (none yet — awaiting first public publish)

## [0.1.0] — TBD

> Package version and local verify path are prepared on `main` via the release prep PR.
> Date and install claims stay TBD until `npm view upheld version` returns `0.1.0`.

### Added
- Core engine and CLI (`upheld verify`) for claims-vs-evidence verification.
- Claim evaluators: `tests_pass` (cmd, passed, failed, total) and `file_written` (path).
- Test runner output parsers with auto-detection for pytest, vitest, and jest.
- Unclaimed file modification / untracked detection via git status.
- Report mode (default, exit 0) and strict mode (`--strict`, exit non-zero on unmet).
- Table and Markdown formatters for CLI output.
- GitHub Action job summary formatter and reusable composite action (`action.yml`).
- Claude Code stop-hook example script and integration docs.
- Fixtures and test suite covering upheld, unmet, and deliberate discrepancy claims.
- `.npmignore` and publish-prep configuration for clean tarball.

### Fixed
- CLI `--version` / `-v` and SARIF `tool.driver.version` now read from `package.json` instead of a hardcoded `0.0.1`.

[Unreleased]: https://github.com/chuofringer/upheld/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/chuofringer/upheld/releases/tag/v0.1.0
