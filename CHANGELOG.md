# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Thin-wedge core engine and CLI (`upheld verify`) for claims-vs-evidence verification.
- Claim evaluators for `tests_pass{cmd,passed,failed,total}` and `file_written{path}`.
- Test runner output parsers and auto-detection for `pytest`, `vitest`, and `jest`.
- Unclaimed file modification / untracked detection via Git status.
- Report mode (default exit 0) and strict mode (`--strict` exit non-zero on unmet claims).
- Table and Markdown formatters for CLI outputs.
- GitHub Action job summary formatter and reusable composite action (`action.yml`).
- Claude Code Stop-hook example script and integration documentation.
- Fixtures and test suite covering upheld, unmet, and deliberate discrepancy claims.
