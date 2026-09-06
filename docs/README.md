# Upheld Documentation

Welcome to the **Upheld** documentation. Upheld is an independent, harness-agnostic claims-vs-evidence verifier for AI coding agents.

> **"Claims, upheld."** / **"Done means shown."**

---

## Documentation Index

1. [Problem Statement & Motivation](./problem-statement.md)
   - The hallucination and silent failure problem in autonomous coding agents.
   - Why LLMs overstate accomplishments and why passive diff-reading is insufficient.
2. [How Verification Works](./how-verify-works.md)
   - The claims-vs-evidence verification architecture, claim schema, execution engine, write evidence evaluation, and test output parsers.
3. [Honesty Rules & Taxonomy](./honesty-rules.md)
   - Ground truth status taxonomy (`upheld`, `unmet`, `unclaimed`), evaluation rules, and integrity principles.
4. [Claude Code Hook Integration](./claude-code-hook.md)
   - Step-by-step setup guide for Claude Code Stop-hooks and subagent verification flows.
5. [CI/CD Integration Guide](./ci-guide.md)
   - Adding Upheld to GitHub Actions, GitLab CI, CircleCI, Report Mode vs Strict Mode, and PR job summaries.
6. [Comparison vs AI PR Review](./comparison-vs-ai-pr-review.md)
   - Why active claim re-execution and empirical evaluation differs fundamentally from static LLM diff reviewers like CodeRabbit.
