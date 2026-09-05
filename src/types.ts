export interface Claim {
  id: string;
  description: string;
  status?: 'pending' | 'verified' | 'failed';
  command?: string;
  expected?: string;
  actual?: string;
  file?: string;
  notes?: string;
}

export interface ClaimsFile {
  version?: string;
  title?: string;
  claims: Claim[];
}

export interface VerificationResult {
  claim: Claim;
  passed: boolean;
  status: 'verified' | 'failed';
  message: string;
  evidence?: string;
}

export interface VerificationSummary {
  total: number;
  verified: number;
  failed: number;
  results: VerificationResult[];
}
