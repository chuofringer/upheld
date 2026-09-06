# Expected Outcome

- **Status**: Unmet
- **Category**: Wrong pass counts in test runner summary
- **Explanation**: Jest output indicates `Tests: 2 failed, 8 passed, 10 total`. The agent claimed `passed: 10, failed: 0, total: 10`. Upheld detects both the pass count mismatch (claimed 10 vs observed 8) and fail count mismatch (claimed 0 vs observed 2).

## Expected Results
- `claim-1`: `unmet` (Claimed 10 passed but observed 8; claimed 0 failed but observed 2)
