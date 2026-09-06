# Upheld vs AI PR Reviewers (CodeRabbit, Copilot, etc.)

As AI tools permeate code review, many developers ask: **How is Upheld different from AI PR review bots like CodeRabbit, GitHub Copilot PR Review, or Bito?**

The core difference is simple:

> **AI PR Reviewers read diffs and write LLM opinions.**  
> **Upheld re-runs claims and provides empirical evidence.**

---

## Direct Comparison

| Dimension | AI PR Reviewers (CodeRabbit, Copilot Review) | Upheld |
| :--- | :--- | :--- |
| **Verification Method** | **Static LLM Diff Reading**: Passes git diff + PR description to an LLM to predict bugs and suggest style improvements. | **Empirical Ground-Truth Execution**: Independently re-executes claimed test commands (`tests_pass`), checks file write evidence (`file_written`), and detects dirty git state (`unclaimed`). |
| **Susceptibility to Hallucination** | **High**: Generates false positives, hallucinated syntax errors, or misses runtime failures that look syntactically correct. | **Zero**: Does not guess or generate opinions. It executes code and inspects write evidence to report deterministic exit codes (`0` vs `1`) and exact counts. |
| **Execution Environment** | **None (Passive)**: Runs in a remote API endpoint without shell or execution access to your application or database. | **Active Execution**: Runs inside your CI runner, local workspace, or Claude Code hook where code can actually be compiled and run. |
| **Claim Verification** | **None**: Accepts the PR title and description as text context; cannot verify if the agent's claimed tests actually ran or if files were actually written during this run. | **Core Purpose**: Extracts the agent's specific claims (`tests_pass`, `file_written`) and evaluates each claim against reality. |
| **Hidden / Unclaimed Edits** | **Passive**: Summarizes all diffs equally without knowing if the agent attempted to hide test changes. | **Active Detection**: Distinguishes between what was explicitly claimed vs secret/accidental side modifications (`unclaimed`). |
| **Output Type** | Long prose PR comments with suggestions and conversational markdown. | Clean, structured Claims vs Evidence diff matrix and deterministic statuses (`upheld`, `unmet`, `unclaimed`). |

---

## Why Diff-Reading Alone Fails for AI Agents

When an AI coding agent creates a Pull Request, static diff-reading LLMs suffer from three critical blind spots:

### 1. The "Looks Right" Trap (Syntactic vs Runtime Validity)
An LLM reviewing a diff cannot know if a newly introduced database query compiles with your ORM, if types align across non-diffed files, or if unit tests pass. LLMs frequently approve diffs that look syntactically plausible but crash immediately on execution.

### 2. Sycophancy and Cascading Hallucination
If an agent writes in a PR description:
> *"Refactored auth module. All 45 integration tests passed."*

A diff-reading LLM reviewer will incorporate this premise into its prompt and praise the PR:
> *"Great job ensuring all 45 integration tests pass!"*

Neither model ever ran the tests.

### 3. Masked Regressions
An agent fixing a flaky test might alter a mock expectation or delete an assertion. An AI diff reviewer often treats this as an intentional test update. Upheld re-executes the canonical test suite to verify whether actual behavior was upheld or broken.

---

## Complementary Synergy

Upheld and AI PR Reviewers can be used together:

1. **Upheld** acts as the **deterministic ground-truth layer**: proving that tests actually run, exit codes are 0, and declared files have write evidence.
2. **AI PR Reviewers** act as the **heuristic layer**: offering subjective advice on naming, documentation clarity, and architectural style.
