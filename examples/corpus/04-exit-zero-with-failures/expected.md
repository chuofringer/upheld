# Expected Outcome

- **Status**: Unmet
- **Category**: Exit code 0 with hidden test failures
- **Explanation**: A test command exited with code 0 (e.g. chained with `|| true` or in an improper CI wrapper), but the vitest output shows `Tests  2 failed | 4 passed (6)`. The agent claimed `passed: 6, failed: 0`. Upheld parses the framework metrics from stdout and flags that 2 tests failed and only 4 passed.

## Expected Results
- `claim-1`: `unmet` (Claimed 6 passed but observed 4; claimed 0 failed but observed 2)
