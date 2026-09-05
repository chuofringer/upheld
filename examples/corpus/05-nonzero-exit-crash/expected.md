# Expected Outcome

- **Status**: Unmet
- **Category**: Non-zero exit code on crash/failure
- **Explanation**: The test runner crashed or terminated with exit code 1 due to an unhandled exception or failed assertions. The agent claimed all 8 tests passed, but Upheld detects non-zero exit code 1.

## Expected Results
- `claim-1`: `unmet` (Command exited with non-zero code 1)
