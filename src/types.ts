export type ClaimStatus = 'upheld' | 'unmet' | 'unclaimed';

export type ExitMode = 'pass' | 'fail' | 'warn';

export interface Claim {
  id: string;
  description: string;
  evidenceType?: 'command' | 'file_exists' | 'file_contains' | 'custom' | string;
  expected?: string | number | boolean;
  actual?: string | number | boolean;
  status: ClaimStatus;
  message?: string;
}

export interface ClaimDigest {
  id: string;
  status: ClaimStatus;
  hash: string;
  description?: string;
}

export interface VerificationResult {
  runId: string;
  timestamp: string;
  claims: Claim[];
  summary: {
    total: number;
    upheld: number;
    unmet: number;
    unclaimed: number;
  };
  exitMode: ExitMode;
  passed: boolean;
}

export interface ReceiptLedgerEntry {
  version: '1.0';
  runId: string;
  timestamp: string;
  exitMode: ExitMode;
  passed: boolean;
  counts: {
    total: number;
    upheld: number;
    unmet: number;
    unclaimed: number;
  };
  claims: ClaimDigest[];
  metadata?: Record<string, unknown>;
}

export interface LedgerSummaryOptions {
  limit?: number;
  reverse?: boolean;
}
