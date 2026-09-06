# Codex CLI Stop / Session End Hook with Upheld

This adapter extracts empirical claims (`file_written`, `tests_pass`) from Codex CLI session history or tool-call traces upon session completion and formats them into an Upheld `claims.json` file.

## Overview

When OpenAI Codex CLI runs a development task, its session records tool executions (e.g., executing shell commands, writing/editing files). On session end, this hook:
1. Parses the recorded tool calls from the session.
2. Normalizes file write operations and test command executions into Upheld claims.
3. Emits `.codex/claims.json`.
4. Runs `upheld verify` to validate the claims against ground truth.

## Setup & Usage

### 1. Hook Script

Save or execute `codex-hook.mjs` at the end of a Codex session:

```bash
node examples/codex-hook/codex-hook.mjs .codex/session.json .codex/claims.json
node dist/bin.js verify .codex/claims.json
# or
npx . verify .codex/claims.json
```

### 2. Instruct Codex to Emit Claims on Session End

Add instructions to your project's agent instructions or prompt file (e.g. `AGENTS.md` / `CODEX.md`):

```markdown
When concluding a task, write tool events to `.codex/session.json` or write claims directly to `.codex/claims.json`:
```json
{
  "claims": [
    { "type": "tests_pass", "cmd": "npm test" },
    { "type": "file_written", "path": "src/feature.ts" }
  ]
}
```
Run `node dist/bin.js verify .codex/claims.json` (or `npx . verify .codex/claims.json`) to verify claims against evidence before concluding.
```

### 3. Programmatic API

You can also use Upheld's Codex adapter directly in TypeScript / JavaScript (e.g. from local build `./dist/index.js` or package imports):

```ts
import { normalizeCodexSessionToClaims } from '../../dist/index.js';

const claims = normalizeCodexSessionToClaims(sessionEvents);
console.log(claims);
// [
//   { type: 'tests_pass', cmd: 'npm test' },
//   { type: 'file_written', path: 'src/feature.ts' }
// ]
```
