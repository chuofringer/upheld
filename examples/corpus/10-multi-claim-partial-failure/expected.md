# Expected Outcome

- **Status**: Unmet
- **Category**: Multi-claim partial failure (compound claims)
- **Explanation**: Demonstrates a multi-step completion claim where some actions succeeded but others were fabricated or failed. Claim 1 (`src/types.ts`) exists and is upheld. Claim 2 is a phantom file and unmet. Claim 3 is a test suite with 1 failure and non-zero exit code, which is unmet.

## Expected Results
- `claim-1`: `upheld` (`src/types.ts` exists)
- `claim-2`: `unmet` (File 'src/generated/non_existent_client.ts' was not found)
- `claim-3`: `unmet` (Command exited with non-zero code 1; claimed 6 passed but observed 5; claimed 0 failed but observed 1)
