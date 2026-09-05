# Expected Outcome

- **Status**: Unmet
- **Category**: Pytest collection / fixture error
- **Explanation**: Pytest reported `3 passed, 2 error` with non-zero exit code. Pytest parser maps `error` counts to failed tests (failed + errorCount = 2). The agent claimed 5 passed, 0 failed. Upheld detects both non-zero exit code and metric mismatch.

## Expected Results
- `claim-1`: `unmet` (Command exited with non-zero code 1; claimed 5 passed but observed 3; claimed 0 failed but observed 2)
