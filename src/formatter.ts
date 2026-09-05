import { VerificationResult, VerificationSummary } from './types.js';

function pad(str: string, length: number): string {
  return str.length >= length ? str.slice(0, length) : str + ' '.repeat(length - str.length);
}

function truncate(str: string, maxLen: number): string {
  const clean = str.replace(/[\r\n]+/g, ' ').trim();
  if (clean.length <= maxLen) return clean;
  return clean.slice(0, maxLen - 3) + '...';
}

export function formatClaimsTable(summary: VerificationSummary): string {
  const idColWidth = 14;
  const claimColWidth = 36;
  const statusColWidth = 10;
  const evidenceColWidth = 32;

  const header = `| ${pad('Claim ID', idColWidth)} | ${pad('Claim / Description', claimColWidth)} | ${pad('Status', statusColWidth)} | ${pad('Evidence / Details', evidenceColWidth)} |`;
  const separator = `|-${'-'.repeat(idColWidth)}-|-${'-'.repeat(claimColWidth)}-|-${'-'.repeat(statusColWidth)}-|-${'-'.repeat(evidenceColWidth)}-|`;

  const rows = summary.results.map((res: VerificationResult) => {
    const id = truncate(res.claim.id || '-', idColWidth);
    const desc = truncate(res.claim.description || '-', claimColWidth);
    const statusText = res.passed ? 'VERIFIED' : 'FAILED';
    const evidence = truncate(res.evidence || res.message || '-', evidenceColWidth);

    return `| ${pad(id, idColWidth)} | ${pad(desc, claimColWidth)} | ${pad(statusText, statusColWidth)} | ${pad(evidence, evidenceColWidth)} |`;
  });

  const banner = '\n=== Upheld: Claims vs Evidence Verification ===\n';
  const table = [banner, header, separator, ...rows].join('\n');
  const footer = `\nSummary: ${summary.verified}/${summary.total} verified (${summary.failed} failed)\n`;

  return table + footer;
}
