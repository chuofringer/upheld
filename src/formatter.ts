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

export function formatGitHubAnnotations(report: VerifyReport): string {
  const lines: string[] = [];

  for (const r of report.results) {
    if (r.status === 'unmet') {
      const title = escapeAnnotationValue(`Unmet Claim: ${r.claimSummary}`);
      const message = escapeAnnotationData(r.details || `Unmet claim: ${r.claimSummary}. Observed: ${r.evidenceSummary}`);
      if (r.claim && r.claim.type === 'file_written' && r.claim.path) {
        lines.push(`::error file=${escapeAnnotationValue(r.claim.path)},title=${title}::${message}`);
      } else {
        lines.push(`::error title=${title}::${message}`);
      }
    } else if (r.status === 'unclaimed') {
      const title = escapeAnnotationValue('Unclaimed File Change');
      const message = escapeAnnotationData(r.details || r.evidenceSummary);
      const match = r.evidenceSummary.match(/unclaimed file written\/modified: (.+)$/);
      if (match && match[1]) {
        lines.push(`::warning file=${escapeAnnotationValue(match[1])},title=${title}::${message}`);
      } else {
        lines.push(`::warning title=${title}::${message}`);
      }
    }
  }

  return lines.join('\n');
}

export function formatSarif(report: VerifyReport): string {
  const rules = [
    {
      id: 'UPHELD001',
      name: 'UnmetClaim',
      shortDescription: {
        text: 'Agent claim was unmet by empirical evidence',
      },
      fullDescription: {
        text: 'A claimed artifact, test run, or assertion could not be empirically validated.',
      },
      defaultConfiguration: {
        level: 'error',
      },
    },
    {
      id: 'UPHELD002',
      name: 'UnclaimedChange',
      shortDescription: {
        text: 'Unclaimed file modified or created',
      },
      fullDescription: {
        text: 'A file was modified or created in git status but never claimed in the claims specification.',
      },
      defaultConfiguration: {
        level: 'warning',
      },
    },
  ];

  const sarifResults: any[] = [];

  for (const r of report.results) {
    if (r.status === 'unmet') {
      const result: any = {
        ruleId: 'UPHELD001',
        level: 'error',
        message: {
          text: r.details || `Unmet claim (${r.type}): ${r.claimSummary}. Observed: ${r.evidenceSummary}`,
        },
      };

      if (r.claim && r.claim.type === 'file_written' && r.claim.path) {
        result.locations = [
          {
            physicalLocation: {
              artifactLocation: {
                uri: r.claim.path,
              },
            },
          },
        ];
      }

      sarifResults.push(result);
    } else if (r.status === 'unclaimed') {
      const match = r.evidenceSummary.match(/unclaimed file written\/modified: (.+)$/);
      const filePath = match ? match[1] : undefined;

      const result: any = {
        ruleId: 'UPHELD002',
        level: 'warning',
        message: {
          text: r.details || r.evidenceSummary,
        },
      };

      if (filePath) {
        result.locations = [
          {
            physicalLocation: {
              artifactLocation: {
                uri: filePath,
              },
            },
          },
        ];
      }

      sarifResults.push(result);
    }
  }

  const sarifLog = {
    $schema: 'https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json',
    version: '2.1.0',
    runs: [
      {
        tool: {
          driver: {
            name: 'upheld',
            version: '0.0.1',
            informationUri: 'https://github.com/chuofringer/upheld',
            rules,
          },
        },
        results: sarifResults,
      },
    ],
  };

  return JSON.stringify(sarifLog, null, 2);
}

function escapeAnnotationValue(str: string): string {
  return str.replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A').replace(/:/g, '%3A').replace(/,/g, '%2C');
}

function escapeAnnotationData(str: string): string {
  return str.replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');
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
