# OpenCode Session Hook with Upheld

This adapter extracts empirical claims (`file_written`, `tests_pass`) from OpenCode agent traces or tool event logs upon session completion and formats them into an Upheld `claims.json` file.

## Overview

When OpenCode completes a workflow session, it records tool execution events (such as `write_to_file`, `execute_command`). On session end, this hook:
1. Reads the OpenCode session events.
2. Normalizes tool events into Upheld claims using `normalizeOpenCodeSessionToClaims`.
3. Writes out `.opencode/claims.json`.
4. Executes `upheld verify` to verify that claimed files exist and test commands actually pass.

## Setup & Usage

### 1. Hook Script

Execute `opencode-hook.mjs` at the end of an OpenCode session:

```bash
node examples/opencode-hook/opencode-hook.mjs .opencode/session.json .opencode/claims.json
node dist/bin.js verify .opencode/claims.json
# or
npx . verify .opencode/claims.json
```

### 2. Instruct OpenCode to Emit Claims on Session End

Add instructions to your project's instructions (e.g. `OPENCODE.md` / `AGENTS.md`):

```markdown
On task completion, write your session tool events to `.opencode/session.json` or write claims directly to `.opencode/claims.json`:
```json
{
  "claims": [
    { "type": "tests_pass", "cmd": "pytest" },
    { "type": "file_written", "path": "src/module.py" }
  ]
}
```
Run `node dist/bin.js verify .opencode/claims.json` (or `npx . verify .opencode/claims.json`) to verify claims against evidence.
```

### 3. Programmatic API

You can also use Upheld's OpenCode adapter directly in TypeScript / JavaScript (e.g. from local build `./dist/index.js` or package imports):

```ts
import { normalizeOpenCodeSessionToClaims } from '../../dist/index.js';

const claims = normalizeOpenCodeSessionToClaims(sessionEvents);
console.log(claims);
// [
//   { type: 'tests_pass', cmd: 'pytest' },
//   { type: 'file_written', path: 'src/module.py' }
// ]
```
