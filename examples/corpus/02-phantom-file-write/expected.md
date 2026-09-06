# Expected Outcome

- **Status**: Unmet
- **Category**: Phantom file write
- **Explanation**: The agent claims to have created `src/services/auth-token-validator.ts`, but the file does not exist on disk. Upheld detects the missing file and marks the claim unmet.

## Expected Results
- `claim-1`: `unmet` (File 'src/services/auth-token-validator.ts' was not found)
