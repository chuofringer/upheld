# Expected Outcome

- **Status**: Upheld for explicit claims (with unclaimed file detection if git changes exist)
- **Category**: Unclaimed side effects / untracked file creation
- **Explanation**: The explicit claims (file write for `README.md` and passing tests) are upheld. When strict git unclaimed file detection is run in a repo with untracked artifacts, Upheld highlights extra files that were touched but never documented in claims.

## Expected Results
- `claim-1`: `upheld` (`README.md` exists)
- `claim-2`: `upheld` (4 passed, 0 failed)
