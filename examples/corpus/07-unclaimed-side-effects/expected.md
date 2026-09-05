# Expected Outcome

- **Status**: Upheld for explicit claims with Unclaimed side-effects detected
- **Category**: Unclaimed side effects / untracked file creation
- **Explanation**: The explicit claims (file write for `README.md` and passing tests) are verified against write evidence and passing command output. When unclaimed change detection is active (`detectUnclaimed: true`), Upheld flags any untracked or modified workspace files not covered by claims as `unclaimed`.

## Expected Results
- `claim-1`: `upheld` (`README.md` modified/written with write evidence)
- `claim-2`: `upheld` (4 passed, 0 failed, 4 total)
- `unclaimed-*`: `unclaimed` (unclaimed files detected when untracked/modified git changes exist)

