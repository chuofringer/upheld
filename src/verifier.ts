import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { Claim, ClaimsFile, VerificationResult, VerificationSummary } from './types.js';

export const DEFAULT_CLAIMS_FILES = [
  '.upheld.json',
  'claims.json',
  '.claims.json',
  'upheld.json'
];

export function findClaimsFile(explicitPath?: string, cwd: string = process.cwd()): string | null {
  if (explicitPath) {
    const resolved = path.resolve(cwd, explicitPath);
    return fs.existsSync(resolved) ? resolved : null;
  }

  for (const filename of DEFAULT_CLAIMS_FILES) {
    const candidate = path.resolve(cwd, filename);
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
}

export function loadClaims(filePath: string): ClaimsFile {
  const content = fs.readFileSync(filePath, 'utf-8');
  try {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed)) {
      return { claims: parsed };
    }
    if (parsed && Array.isArray(parsed.claims)) {
      return parsed as ClaimsFile;
    }
    throw new Error('Claims file must contain a "claims" array or be an array of claims.');
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to parse claims file at ${filePath}: ${msg}`);
  }
}

export function verifyClaim(claim: Claim, cwd: string = process.cwd()): VerificationResult {
  // If command verification is specified
  if (claim.command) {
    try {
      const stdout = execSync(claim.command, {
        cwd,
        encoding: 'utf-8',
        stdio: ['ignore', 'pipe', 'pipe'],
        timeout: 30000
      }).trim();

      if (claim.expected !== undefined) {
        const passed = stdout.includes(claim.expected);
        return {
          claim,
          passed,
          status: passed ? 'verified' : 'failed',
          message: passed
            ? `Output matched expectation`
            : `Output did not contain expected: "${claim.expected}"`,
          evidence: stdout
        };
      }

      // If command exited 0 with no specific expected string
      return {
        claim,
        passed: true,
        status: 'verified',
        message: `Command completed with exit code 0`,
        evidence: stdout
      };
    } catch (err: any) {
      const output = err.stdout?.toString?.() || err.stderr?.toString?.() || err.message || '';
      return {
        claim,
        passed: false,
        status: 'failed',
        message: `Command failed (exit code ${err.status ?? 1})`,
        evidence: output.trim()
      };
    }
  }

  // If file verification is specified
  if (claim.file) {
    const resolved = path.resolve(cwd, claim.file);
    if (!fs.existsSync(resolved)) {
      return {
        claim,
        passed: false,
        status: 'failed',
        message: `File not found: ${claim.file}`,
        evidence: 'File does not exist'
      };
    }

    if (claim.expected !== undefined) {
      const content = fs.readFileSync(resolved, 'utf-8');
      const passed = content.includes(claim.expected);
      return {
        claim,
        passed,
        status: passed ? 'verified' : 'failed',
        message: passed
          ? `File content matched expectation`
          : `File did not contain expected content`,
        evidence: `File exists (${content.length} bytes)`
      };
    }

    return {
      claim,
      passed: true,
      status: 'verified',
      message: `File exists`,
      evidence: `File exists: ${claim.file}`
    };
  }

  // If claim is pre-marked or status-based
  if (claim.status === 'verified') {
    return {
      claim,
      passed: true,
      status: 'verified',
      message: 'Claim recorded as verified',
      evidence: claim.actual || claim.notes || 'Recorded verified'
    };
  }

  if (claim.status === 'failed') {
    return {
      claim,
      passed: false,
      status: 'failed',
      message: 'Claim recorded as failed',
      evidence: claim.actual || claim.notes || 'Recorded failed'
    };
  }

  // Default: pending / unverified
  return {
    claim,
    passed: false,
    status: 'failed',
    message: 'No verifiable command/file or verified status provided',
    evidence: claim.actual || claim.notes || 'No evidence provided'
  };
}

export function verifyAllClaims(claimsFile: ClaimsFile, cwd: string = process.cwd()): VerificationSummary {
  const results = claimsFile.claims.map(c => verifyClaim(c, cwd));
  const verified = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  return {
    total: claimsFile.claims.length,
    verified,
    failed,
    results
  };
}
