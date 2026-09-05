export type ClaimStatus = 'upheld' | 'unmet' | 'unclaimed';

export interface Claim {
  id: string;
  description: string;
  rule?: {
    type: 'file_exists' | 'command_exit_zero' | 'content_matches' | 'json_eval';
    path?: string;
    command?: string;
    pattern?: string;
    expected?: unknown;
  };
}

export interface ClaimResult {
  id: string;
  description?: string;
  status: ClaimStatus;
  reason?: string;
  evidence?: {
    type?: string;
    output?: string;
    timestamp?: string;
    [key: string]: unknown;
  };
}

export interface VerificationReport {
  timestamp: string;
  summary: {
    total: number;
    upheld: number;
    unmet: number;
    unclaimed: number;
  };
  results: ClaimResult[];
}

export interface DeltaSummary {
  newlyUpheld: ClaimResult[];
  newlyUnmet: ClaimResult[];
  newlyUnclaimed: ClaimResult[];
  unchanged: ClaimResult[];
  added: ClaimResult[];
  removed: ClaimResult[];
}

export interface DiffReport {
  baseTimestamp?: string;
  targetTimestamp?: string;
  summary: {
    newlyUpheldCount: number;
    newlyUnmetCount: number;
    newlyUnclaimedCount: number;
    unchangedCount: number;
    addedCount: number;
    removedCount: number;
  };
  delta: DeltaSummary;
}
