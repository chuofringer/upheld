import { Claim, ClaimResult, VerificationReport } from './types.js';
import * as fs from 'node:fs';
import { execSync } from 'node:child_process';

export function verifyClaim(claim: Claim): ClaimResult {
  if (!claim.rule) {
    return {
      id: claim.id,
      description: claim.description,
      status: 'unclaimed',
      reason: 'No rule defined for claim'
    };
  }

  const { rule } = claim;
  try {
    switch (rule.type) {
      case 'file_exists': {
        if (!rule.path) {
          return {
            id: claim.id,
            description: claim.description,
            status: 'unmet',
            reason: 'Missing file path in rule'
          };
        }
        const exists = fs.existsSync(rule.path);
        return {
          id: claim.id,
          description: claim.description,
          status: exists ? 'upheld' : 'unmet',
          reason: exists ? `File exists at ${rule.path}` : `File not found at ${rule.path}`,
          evidence: { path: rule.path, exists }
        };
      }
      case 'command_exit_zero': {
        if (!rule.command) {
          return {
            id: claim.id,
            description: claim.description,
            status: 'unmet',
            reason: 'Missing command in rule'
          };
        }
        try {
          const output = execSync(rule.command, { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'] });
          return {
            id: claim.id,
            description: claim.description,
            status: 'upheld',
            reason: 'Command executed with exit code 0',
            evidence: { command: rule.command, output: output.trim() }
          };
        } catch (err: unknown) {
          const execError = err as { stdout?: string; stderr?: string; status?: number; message?: string };
          return {
            id: claim.id,
            description: claim.description,
            status: 'unmet',
            reason: `Command failed with exit code ${execError.status ?? 'non-zero'}`,
            evidence: {
              command: rule.command,
              error: execError.stderr || execError.message || String(err)
            }
          };
        }
      }
      case 'content_matches': {
        if (!rule.path || !rule.pattern) {
          return {
            id: claim.id,
            description: claim.description,
            status: 'unmet',
            reason: 'Missing path or pattern in content_matches rule'
          };
        }
        if (!fs.existsSync(rule.path)) {
          return {
            id: claim.id,
            description: claim.description,
            status: 'unmet',
            reason: `Target file not found at ${rule.path}`,
            evidence: { path: rule.path }
          };
        }
        const content = fs.readFileSync(rule.path, 'utf-8');
        const regex = new RegExp(rule.pattern);
        const matches = regex.test(content);
        return {
          id: claim.id,
          description: claim.description,
          status: matches ? 'upheld' : 'unmet',
          reason: matches ? `Pattern /${rule.pattern}/ matched` : `Pattern /${rule.pattern}/ did not match`,
          evidence: { path: rule.path, pattern: rule.pattern }
        };
      }
      default:
        return {
          id: claim.id,
          description: claim.description,
          status: 'unclaimed',
          reason: `Unsupported rule type: ${(rule as { type: string }).type}`
        };
    }
  } catch (err: unknown) {
    return {
      id: claim.id,
      description: claim.description,
      status: 'unmet',
      reason: `Verification encountered an error: ${(err as Error).message}`
    };
  }
}

export function verifyClaims(claims: Claim[]): VerificationReport {
  const results = claims.map(verifyClaim);
  const summary = {
    total: results.length,
    upheld: results.filter(r => r.status === 'upheld').length,
    unmet: results.filter(r => r.status === 'unmet').length,
    unclaimed: results.filter(r => r.status === 'unclaimed').length
  };

  return {
    timestamp: new Date().toISOString(),
    summary,
    results
  };
}
