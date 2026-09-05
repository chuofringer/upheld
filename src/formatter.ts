import { VerificationResult, VerifyReport } from './types.js';

export function formatTerminalTable(report: VerifyReport): string {
  const lines: string[] = [];

  lines.push('Upheld — Claims vs Evidence');
  lines.push('============================');
  lines.push('');

  const headers = ['Status', 'Claim Type', 'Claim', 'Evidence'];
  const rows: string[][] = report.results.map((r) => {
    const statusLabel = formatStatusLabel(r.status);
    return [
      statusLabel,
      r.type,
      truncate(r.claimSummary, 40),
      truncate(r.evidenceSummary, 45),
    ];
  });

  if (rows.length === 0) {
    lines.push('No claims or evidence found.');
  } else {
    // Calculate column widths
    const colWidths = headers.map((h, i) => {
      const maxRowLen = rows.reduce((max, row) => Math.max(max, (row[i] || '').length), 0);
      return Math.max(h.length, maxRowLen);
    });

    const formatRow = (cols: string[]) =>
      cols.map((col, i) => (col || '').padEnd(colWidths[i])).join('  |  ');

    const divider = colWidths.map((w) => '-'.repeat(w)).join('--+--');

    lines.push(formatRow(headers));
    lines.push(divider);
    for (const row of rows) {
      lines.push(formatRow(row));
    }
  }

  lines.push('');
  lines.push('Summary:');
  lines.push(`  Upheld:    ${report.summary.upheld}`);
  lines.push(`  Unmet:     ${report.summary.unmet}`);
  lines.push(`  Unclaimed: ${report.summary.unclaimed}`);
  lines.push(`  Total:     ${report.summary.total}`);

  const detailsList = report.results.filter((r) => r.details);
  if (detailsList.length > 0) {
    lines.push('');
    lines.push('Notes & Mismatches:');
    for (const item of detailsList) {
      lines.push(`  [${item.status.toUpperCase()}] ${item.id}: ${item.details}`);
    }
  }

  return lines.join('\n');
}

export function formatMarkdownSummary(report: VerifyReport): string {
  const lines: string[] = [];

  lines.push('### Upheld — Claims vs Evidence');
  lines.push('');
  lines.push('> *Claims, upheld. Done means shown.*');
  lines.push('');
  lines.push('| Status | Claim Type | Claim | Evidence |');
  lines.push('| :--- | :--- | :--- | :--- |');

  for (const r of report.results) {
    const badge = formatMarkdownBadge(r.status);
    const claimText = escapeMarkdown(r.claimSummary);
    const evidenceText = escapeMarkdown(r.evidenceSummary);
    lines.push(`| ${badge} | \`${r.type}\` | ${claimText} | ${evidenceText} |`);
  }

  if (report.results.length === 0) {
    lines.push('| — | *none* | *No claims evaluated* | — |');
  }

  lines.push('');
  lines.push(`**Summary:** ${report.summary.upheld} Upheld / ${report.summary.unmet} Unmet / ${report.summary.unclaimed} Unclaimed`);

  const detailsList = report.results.filter((r) => r.details);
  if (detailsList.length > 0) {
    lines.push('');
    lines.push('<details><summary>Discrepancy Details</summary>');
    lines.push('');
    for (const item of detailsList) {
      lines.push(`- **[${item.status.toUpperCase()}]** \`${item.id}\`: ${escapeMarkdown(item.details ?? '')}`);
    }
    lines.push('');
    lines.push('</details>');
  }

  return lines.join('\n');
}

export function formatGitHubJobSummary(report: VerifyReport): string {
  const lines: string[] = [];

  lines.push('## Upheld — Claims vs evidence');
  lines.push('');
  lines.push('> *Claims, upheld. Done means shown.*');
  lines.push('');
  lines.push('| Status | Claim Type | Claim | Evidence |');
  lines.push('| :--- | :--- | :--- | :--- |');

  for (const r of report.results) {
    const badge = formatMarkdownBadge(r.status);
    const claimText = escapeMarkdown(r.claimSummary);
    const evidenceText = escapeMarkdown(r.evidenceSummary);
    lines.push(`| ${badge} | \`${r.type}\` | ${claimText} | ${evidenceText} |`);
  }

  if (report.results.length === 0) {
    lines.push('| — | *none* | *No claims evaluated* | — |');
  }

  lines.push('');
  lines.push(`**Summary:** ${report.summary.upheld} Upheld / ${report.summary.unmet} Unmet / ${report.summary.unclaimed} Unclaimed`);

  const detailsList = report.results.filter((r) => r.details);
  if (detailsList.length > 0) {
    lines.push('');
    lines.push('### Discrepancy Details');
    lines.push('');
    for (const item of detailsList) {
      lines.push(`- **[${item.status.toUpperCase()}]** \`${item.id}\`: ${escapeMarkdown(item.details ?? '')}`);
    }
  }

  return lines.join('\n');
}

function formatStatusLabel(status: string): string {
  switch (status) {
    case 'upheld':
      return 'UPHELD';
    case 'unmet':
      return 'UNMET';
    case 'unclaimed':
      return 'UNCLAIMED';
    default:
      return status.toUpperCase();
  }
}

function formatMarkdownBadge(status: string): string {
  switch (status) {
    case 'upheld':
      return '✅ **Upheld**';
    case 'unmet':
      return '❌ **Unmet**';
    case 'unclaimed':
      return '⚠️ **Unclaimed**';
    default:
      return status;
  }
}

function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 3) + '...';
}

function escapeMarkdown(str: string): string {
  return str.replace(/\|/g, '\\|');
}
