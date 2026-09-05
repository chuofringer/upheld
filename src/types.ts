export type ClaimType = 'tests_pass' | 'file_written' | 'diff_tampering';

export interface TestsPassClaim {
  type: 'tests_pass';
  cmd: string;
  passed?: number;
  failed?: number;
  total?: number;
  description?: string;
}

export interface FileWrittenClaim {
  type: 'file_written';
  path: string;
  description?: string;
}

export interface DiffTamperingClaim {
  type: 'diff_tampering';
  description?: string;
  base?: string;
}

export type Claim = TestsPassClaim | FileWrittenClaim | DiffTamperingClaim;

export interface ClaimsDocument {
  version?: string;
  claims: Claim[];
}

export type VerificationStatus = 'upheld' | 'unmet' | 'unclaimed';

export interface TamperingFinding {
  ruleId: string;
  pattern: string;
  file: string;
  line?: number;
  snippet?: string;
  reason: string;
}

export interface LintDiffResult {
  tampered: boolean;
  findings: TamperingFinding[];
  diffSummary: {
    filesScanned: number;
    findingsCount: number;
  };
}

export interface TestResultMetrics {
  cmd: string;
  exitCode: number;
  passed?: number;
  failed?: number;
  total?: number;
  framework?: 'pytest' | 'vitest' | 'jest' | 'generic';
  stdout: string;
  stderr: string;
  durationMs: number;
}

export interface FileEvidenceMetrics {
  path: string;
  exists: boolean;
  sizeBytes?: number;
}

export interface VerificationResult {
  id: string;
  type: ClaimType | 'unclaimed_file';
  status: VerificationStatus;
  claim?: Claim;
  claimSummary: string;
  evidenceSummary: string;
  details?: string;
}

export interface VerifyReport {
  timestamp: string;
  cwd: string;
  results: VerificationResult[];
  summary: {
    total: number;
    upheld: number;
    unmet: number;
    unclaimed: number;
  };
  hasUnmet: boolean;
}

export interface VerifyOptions {
  cwd?: string;
  strict?: boolean;
  detectUnclaimed?: boolean;
  lintDiff?: boolean;
  diffBase?: string;
  patch?: string;
  timeoutMs?: number;
  env?: Record<string, string | undefined>;
}

export interface LintDiffOptions {
  cwd?: string;
  base?: string;
  patch?: string;
  strict?: boolean;
}
