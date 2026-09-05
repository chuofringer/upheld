import * as crypto from 'node:crypto';
import type { Claim, ClaimDigest } from './types.js';

export function computeClaimHash(claim: Claim): string {
  const content = JSON.stringify({
    id: claim.id,
    description: claim.description,
    evidenceType: claim.evidenceType ?? '',
    expected: claim.expected ?? '',
    actual: claim.actual ?? '',
    status: claim.status,
  });
  return crypto.createHash('sha256').update(content).digest('hex').substring(0, 12);
}

export function claimToDigest(claim: Claim): ClaimDigest {
  return {
    id: claim.id,
    status: claim.status,
    hash: computeClaimHash(claim),
    description: claim.description,
  };
}
