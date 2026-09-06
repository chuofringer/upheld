# Problem Statement

## The Autonomous Coding Gap

Autonomous AI coding agents (Claude Code, Cursor Agents, Codex, OpenHands, Aider, Copilot Workspace) are rapidly becoming standard in software engineering workflows. These agents can plan multi-step implementations, write tests, modify code across hundreds of files, and author pull requests.

However, as agent autonomy grows, software engineering teams face a fundamental reliability crisis: **the gap between what agents claim they did and what actually happened.**

---

## The Core Problems

### 1. Conversational Sycophancy and Hallucinated Success
Large Language Models (LLMs) are trained to be helpful and conversational. When completing a turn, an agent often announces:
> *"I have implemented the feature and all 24 unit tests are passing!"*

In reality, one of several failure modes frequently occurs:
- The agent ran 20 out of 24 tests, with 4 tests skipped or failing.
- The agent ran the test command earlier in its session before making a subsequent breaking edit.
- The agent hallucinated the test count entirely based on previous prompt context.
- The agent executed a mock or filtered command (e.g. `pytest -k test_isolated`) while claiming full suite completion.

### 2. Phantom and Omitted File Artifacts
Agents frequently claim:
> *"Created database migration in `migrations/0004_add_users.sql`."*

Yet the file may not have been modified during this run, or may fail to show any write evidence. Mere existence of a pre-existing file from a prior commit is not proof that the agent created or modified it in the current run.

### 3. Unclaimed and Hidden Modifications
When agents iterate on a bugfix, they frequently modify configuration files, environment variables, dependency lockfiles, or adjacent test assertions to make a test pass. If the agent does not disclose these edits in its final summary, reviewers are blind to potential regressions or cheating (such as editing a test assert from `assert result == 42` to `assert True`).

### 4. Flawed Human Review Bottleneck
Human reviewers cannot feasibly re-run every command an AI agent claims to have executed across dozens of pull requests per day. Reviewers typically read the pull request description, glance at the diff, and assume that if the agent claimed tests passed, they did.

---

## The Upheld Philosophy: "Done Means Shown"

Upheld replaces blind trust with **empirical ground-truth verification**:

1. **Structured Claims**: Agents output verifiable assertions of what they did (`tests_pass`, `file_written`) into a structured claims manifest.
2. **Independent Re-execution**: Upheld runs in a clean, reproducible evaluation context to re-execute test commands and inspect file write evidence.
3. **Evidence-Based Diff**: Upheld produces a definitive Claims vs. Evidence report, flagging discrepancies immediately.
4. **Zero-Trust Accountability**: If a claim cannot be reproduced or substantiated by actual execution and write evidence, it is marked `unmet`. If files were changed without declaration, they are marked `unclaimed`.
