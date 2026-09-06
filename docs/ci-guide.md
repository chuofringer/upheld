# CI/CD Integration Guide

Upheld integrates seamlessly into your continuous integration and deployment pipelines to provide automated, evidence-backed audits on every agent-generated pull request or commit.

---

## 1. GitHub Actions Integration

You can integrate Upheld into GitHub Actions by checking out the code, building Upheld, and running verification against an agent's claims manifest.

### Workflow Example: `.github/workflows/verify-claims.yml`

```yaml
name: Verify Agent Claims

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  verify:
    name: Upheld Claims Verification
    runs-on: ubuntu-latest

    steps:
      - name: Checkout Code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Install Dependencies & Build
        run: |
          npm ci
          npm run build

      - name: Run Upheld Verifier
        id: upheld
        run: |
          node dist/bin.js verify .upheld/claims.json \
            --summary \
            --strict
        env:
          GITHUB_STEP_SUMMARY: ${{ github.step_summary }}
```

---

## 2. GitHub Step Summary & PR Rendering

When invoked with `--summary` in a GitHub Actions runner, Upheld automatically formats the Claims vs Evidence table as a GitHub Job Summary Markdown report:

### Output Example in GitHub Actions:

### 🛡️ Upheld Claims vs Evidence Report

| Status | Claim Type | Claim Details | Evidence |
| :--- | :--- | :--- | :--- |
| 🟢 **UPHELD** | `file_written` | `path: src/verifier.ts` | exists (size: 2400 B, modified/created) |
| 🟢 **UPHELD** | `file_written` | `path: tests/verifier.test.ts` | exists (size: 1100 B, modified/created) |
| 🟢 **UPHELD** | `tests_pass` | `cmd: npm test, passed: 18` | exit: 0, passed: 18, failed: 0, total: 18 |
| 🔴 **UNMET** | `tests_pass` | `cmd: pytest, passed: 5` | exit: 1, passed: 3, failed: 2, total: 5 |
| ⚠️ **UNCLAIMED** | `unclaimed_file` | (none) | unclaimed file written/modified: `temp.log` |

**Summary**: 3 Upheld, 1 Unmet, 1 Unclaimed (Total: 5)

---

## 3. Posting Verification Results as PR Comments

You can capture Upheld's markdown output and post it directly to the Pull Request:

```yaml
      - name: Verify and Generate Markdown
        if: always()
        run: |
          node dist/bin.js verify .upheld/claims.json --markdown > upheld-report.md

      - name: Post PR Comment
        uses: actions/github-script@v7
        if: github.event_name == 'pull_request'
        with:
          script: |
            const fs = require('fs');
            const report = fs.readFileSync('upheld-report.md', 'utf8');
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `## 🛡️ Upheld Verification Report\n\n${report}`
            });
```

---

## 4. GitLab CI / CircleCI Integration

### GitLab CI (`.gitlab-ci.yml`)
```yaml
upheld_verify:
  image: node:20
  stage: test
  script:
    - npm ci
    - npm run build
    - node dist/bin.js verify .upheld/claims.json --strict
```

### CircleCI (`.circleci/config.yml`)
```yaml
version: 2.1
jobs:
  verify-claims:
    docker:
      - image: cimg/node:20.0
    steps:
      - checkout
      - run:
          name: Install dependencies & build
          command: |
            npm ci
            npm run build
      - run:
          name: Run Upheld
          command: node dist/bin.js verify .upheld/claims.json --strict
workflows:
  build_and_verify:
    jobs:
      - verify-claims
```
