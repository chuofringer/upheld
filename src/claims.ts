import { readFile } from 'node:fs/promises';
import { Claim, ClaimsDocument, FileWrittenClaim, TestsPassClaim } from './types.js';

export function isClaim(obj: unknown): obj is Claim {
  if (!obj || typeof obj !== 'object') return false;
  const o = obj as Record<string, unknown>;
  if (o.type === 'tests_pass' && typeof o.cmd === 'string') {
    return true;
  }
  if (o.type === 'file_written' && typeof o.path === 'string') {
    return true;
  }
  return false;
}

export function parseClaimsJson(content: string): Claim[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Invalid JSON for claims: ${message}`);
  }

  if (Array.isArray(parsed)) {
    const claims: Claim[] = [];
    for (let i = 0; i < parsed.length; i++) {
      const item = parsed[i];
      if (isClaim(item)) {
        claims.push(item);
      } else {
        throw new Error(`Invalid claim at index ${i}: ${JSON.stringify(item)}`);
      }
    }
    return claims;
  }

  if (parsed && typeof parsed === 'object') {
    const doc = parsed as Record<string, unknown>;
    if (Array.isArray(doc.claims)) {
      const claims: Claim[] = [];
      for (let i = 0; i < doc.claims.length; i++) {
        const item = doc.claims[i];
        if (isClaim(item)) {
          claims.push(item);
        } else {
          throw new Error(`Invalid claim in claims[${i}]: ${JSON.stringify(item)}`);
        }
      }
      return claims;
    }
    // Single claim object
    if (isClaim(doc)) {
      return [doc];
    }
  }

  throw new Error('Claims input must be a JSON array of claims or an object with a "claims" array property.');
}

export async function readClaimsFromFile(filePath: string): Promise<Claim[]> {
  const content = await readFile(filePath, 'utf-8');
  return parseClaimsJson(content);
}
