export type ClaimType = 'tests_pass' | 'file_written';

export interface TestsPassClaim {
  type: 'tests_pass';
  cmd: string;
  passed?: number;
  failed?: number;
  skipped?: number;
  total?: number;
  description?: string;
}

export interface FileWrittenClaim {
  type: 'file_written';
  path: string;
  description?: string;
}

export type Claim = TestsPassClaim | FileWrittenClaim;

export interface ClaimsDocument {
  version?: string;
  claims: Claim[];
}

export type VerificationStatus = 'upheld' | 'unmet' | 'unclaimed';

export interface TestResultMetrics {
  cmd: string;
  exitCode: number;
  passed?: number;
  failed?: number;
  skipped?: number;
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
  modifiedThisRun?: boolean;
  mtimeMs?: number;
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
  timeoutMs?: number;
  env?: Record<string, string | undefined>;
  sinceTimestamp?: number;
}

export interface GitHubCheckOptions {
  token?: string;
  repo?: string;
  sha?: string;
  apiUrl?: string;
  checkName?: string;
  fetchFn?: typeof fetch;
}

export interface GitHubCheckResult {
  posted: boolean;
  checkRunId?: number;
  url?: string;
  conclusion?: 'success' | 'failure' | 'neutral';
  skippedReason?: string;
  error?: string;
}
