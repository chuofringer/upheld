import * as fs from 'node:fs';
import * as path from 'node:path';
import * as childProcess from 'node:child_process';
import * as crypto from 'node:crypto';
import type { Claim, VerificationResult, ExitMode } from './types.js';

export interface ClaimDefinition {
  id: string;
  description: string;
  type?: 'command' | 'file_exists' | 'file_contains' | 'custom' | string;
  command?: string;
  file?: string;
  pattern?: string;
  expected?: string | number | boolean;
}

export interface VerifyConfig {
  claims: ClaimDefinition[];
  strict?: boolean;
}

/**
 * Verifies a single claim against filesystem or command execution evidence.
 */
export async function verifyClaim(claimDef: ClaimDefinition, cwd: string = process.cwd()): Promise<Claim> {
  const type = claimDef.type ?? (claimDef.command ? 'command' : claimDef.file ? 'file_exists' : 'custom');

  if (type === 'file_exists') {
    const targetFile = path.resolve(cwd, claimDef.file || claimDef.id);
    const exists = fs.existsSync(targetFile);
    return {
      id: claimDef.id,
      description: claimDef.description,
      evidenceType: 'file_exists',
      expected: true,
      actual: exists,
      status: exists ? 'upheld' : 'unmet',
      message: exists ? `File exists at ${claimDef.file || claimDef.id}` : `File missing at ${claimDef.file || claimDef.id}`,
    };
  }

  if (type === 'file_contains') {
    const targetFile = path.resolve(cwd, claimDef.file || claimDef.id);
    if (!fs.existsSync(targetFile)) {
      return {
        id: claimDef.id,
        description: claimDef.description,
        evidenceType: 'file_contains',
        expected: claimDef.pattern || '',
        actual: false,
        status: 'unmet',
        message: `File not found: ${claimDef.file || claimDef.id}`,
      };
    }
    const content = fs.readFileSync(targetFile, 'utf-8');
    const matched = claimDef.pattern ? content.includes(claimDef.pattern) : true;
    return {
      id: claimDef.id,
      description: claimDef.description,
      evidenceType: 'file_contains',
      expected: claimDef.pattern || '',
      actual: matched,
      status: matched ? 'upheld' : 'unmet',
      message: matched ? `Pattern matched in ${claimDef.file || claimDef.id}` : `Pattern not found in ${claimDef.file || claimDef.id}`,
    };
  }

  if (type === 'command') {
    if (!claimDef.command) {
      return {
        id: claimDef.id,
        description: claimDef.description,
        evidenceType: 'command',
        status: 'unclaimed',
        message: 'No command specified for verification',
      };
    }
    try {
      childProcess.execSync(claimDef.command, {
        cwd,
        stdio: 'pipe',
        timeout: 30000,
      });
      return {
        id: claimDef.id,
        description: claimDef.description,
        evidenceType: 'command',
        expected: 'exit 0',
        actual: 'exit 0',
        status: 'upheld',
        message: `Command succeeded: ${claimDef.command}`,
      };
    } catch (err: unknown) {
      const error = err as { status?: number; message?: string; stderr?: Buffer };
      const stderr = error.stderr ? error.stderr.toString().trim() : '';
      return {
        id: claimDef.id,
        description: claimDef.description,
        evidenceType: 'command',
        expected: 'exit 0',
        actual: `exit ${error.status ?? 1}`,
        status: 'unmet',
        message: stderr || error.message || `Command failed: ${claimDef.command}`,
      };
    }
  }

  return {
    id: claimDef.id,
    description: claimDef.description,
    evidenceType: type,
    status: 'unclaimed',
    message: `Unsupported claim verification type: ${type}`,
  };
}

/**
 * Runs verification across a list of claim definitions.
 */
export async function runVerification(
  claims: ClaimDefinition[],
  options: { cwd?: string; exitMode?: ExitMode } = {}
): Promise<VerificationResult> {
  const cwd = options.cwd ?? process.cwd();
  const runId = crypto.randomUUID();
  const timestamp = new Date().toISOString();

  const verifiedClaims: Claim[] = [];
  for (const claimDef of claims) {
    const verified = await verifyClaim(claimDef, cwd);
    verifiedClaims.push(verified);
  }

  let upheld = 0;
  let unmet = 0;
  let unclaimed = 0;

  for (const c of verifiedClaims) {
    if (c.status === 'upheld') upheld++;
    else if (c.status === 'unmet') unmet++;
    else unclaimed++;
  }

  const passed = unmet === 0 && (options.exitMode === 'warn' || unclaimed === 0 || upheld > 0);
  const exitMode: ExitMode = options.exitMode ?? (unmet > 0 ? 'fail' : unclaimed > 0 ? 'warn' : 'pass');

  return {
    runId,
    timestamp,
    claims: verifiedClaims,
    summary: {
      total: verifiedClaims.length,
      upheld,
      unmet,
      unclaimed,
    },
    exitMode,
    passed,
  };
}
