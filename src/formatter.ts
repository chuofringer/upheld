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

export function formatSarifReport(report: VerifyReport): string {
  const unmetResults = report.results.filter((r) => r.status === 'unmet');

  // Rule definitions for claim types
  const rulesMap = new Map<string, { id: string; name: string; shortDescription: { text: string }; defaultConfiguration: { level: string } }>();

  rulesMap.set('tests_pass', {
    id: 'tests_pass',
    name: 'TestsPassClaimUnmet',
    shortDescription: {
      text: 'Claimed test command failed or observed metrics mismatched claimed metrics.',
    },
    defaultConfiguration: {
      level: 'error',
    },
  });

  rulesMap.set('file_written', {
    id: 'file_written',
    name: 'FileWrittenClaimUnmet',
    shortDescription: {
      text: 'Claimed file was not found or has no evidence of write/change during the run.',
    },
    defaultConfiguration: {
      level: 'error',
    },
  });

  const activeRuleIds = new Set(unmetResults.map((r) => r.type));
  const activeRules = Array.from(activeRuleIds)
    .map((type) => {
      if (rulesMap.has(type)) {
        return rulesMap.get(type)!;
      }
      return {
        id: type,
        name: `${type}Unmet`,
        shortDescription: {
          text: `Claim of type '${type}' was unmet.`,
        },
        defaultConfiguration: {
          level: 'error',
        },
      };
    });

  const sarifResults = unmetResults.map((r) => {
    const messageText = r.details || `${r.claimSummary} was unmet (${r.evidenceSummary})`;
    const resultObj: {
      ruleId: string;
      level: 'error' | 'warning' | 'note';
      message: { text: string };
      locations?: Array<{
        physicalLocation: {
          artifactLocation: { uri: string; uriBaseId?: string };
          region: { startLine: number; startColumn?: number };
        };
      }>;
    } = {
      ruleId: r.type,
      level: 'error',
      message: {
        text: messageText,
      },
    };

    // Extract path if available from file_written claim or claim object
    let filePath: string | undefined;
    if (r.claim && r.claim.type === 'file_written' && r.claim.path) {
      filePath = r.claim.path;
    }

    if (filePath) {
      // Normalize relative path if possible
      const normalizedPath = filePath.replace(/\\/g, '/').replace(/^\.\//, '');
      resultObj.locations = [
        {
          physicalLocation: {
            artifactLocation: {
              uri: normalizedPath,
              uriBaseId: '%SRCROOT%',
            },
            region: {
              startLine: 1,
              startColumn: 1,
            },
          },
        },
      ];
    }

    return resultObj;
  });

  const sarif = {
    $schema: 'https://json.schemastore.org/sarif-2.1.0.json',
    version: '2.1.0',
    runs: [
      {
        tool: {
          driver: {
            name: 'upheld',
            version: '0.0.1',
            informationUri: 'https://github.com/chuofringer/upheld',
            rules: activeRules,
          },
        },
        results: sarifResults,
      },
    ],
  };

  return JSON.stringify(sarif, null, 2);
}

export function formatHtmlReport(report: VerifyReport): string {
  const detailsList = report.results.filter((r) => r.details);
  const overallBadgeClass = report.hasUnmet ? 'badge-unmet' : 'badge-upheld';
  const overallStatusText = report.hasUnmet ? 'UNMET DISCREPANCIES DETECTED' : 'ALL CLAIMS UPHELD';

  const rowsHtml = report.results.map((r) => {
    const statusClass = `badge-${r.status}`;
    const statusText = formatStatusLabel(r.status);
    const detailsHtml = r.details
      ? `<details class="row-details"><summary>Mismatch Note</summary><div class="details-content">${escapeHtml(r.details)}</div></details>`
      : '';

    return `        <tr>
          <td><span class="badge ${statusClass}">${statusText}</span></td>
          <td><span class="type-pill">${escapeHtml(r.type)}</span></td>
          <td class="code-cell">${escapeHtml(r.claimSummary)}</td>
          <td class="code-cell">${escapeHtml(r.evidenceSummary)}${detailsHtml}</td>
        </tr>`;
  }).join('\n');

  const emptyRowHtml = report.results.length === 0
    ? '<tr><td colspan="4" class="empty-cell">No claims or evidence found.</td></tr>'
    : rowsHtml;

  const mismatchSectionHtml = detailsList.length > 0 ? `
    <section class="discrepancies-section">
      <details class="main-details" open>
        <summary class="main-details-summary">
          <span class="summary-title">Discrepancy Details &amp; Mismatch Notes</span>
          <span class="counter">${detailsList.length}</span>
        </summary>
        <div class="mismatch-list">
          ${detailsList.map((item) => `
          <div class="mismatch-item mismatch-item-${item.status}">
            <div class="mismatch-header">
              <span class="badge badge-${item.status}">${formatStatusLabel(item.status)}</span>
              <span class="mismatch-id"><code>${escapeHtml(item.id)}</code></span>
              <span class="type-pill">${escapeHtml(item.type)}</span>
            </div>
            <div class="mismatch-body">${escapeHtml(item.details ?? '')}</div>
          </div>`).join('\n')}
        </div>
      </details>
    </section>` : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Upheld — Claims vs Evidence Report</title>
  <style>
    :root {
      --bg: #0d1117;
      --card-bg: #161b22;
      --card-border: #30363d;
      --text: #e6edf3;
      --text-muted: #8b949e;
      --text-dim: #6e7681;
      --accent-green: #3fb950;
      --accent-green-bg: rgba(46, 160, 67, 0.15);
      --accent-green-border: rgba(63, 185, 80, 0.4);
      --accent-red: #f85149;
      --accent-red-bg: rgba(248, 81, 73, 0.15);
      --accent-red-border: rgba(248, 81, 73, 0.4);
      --accent-yellow: #d29922;
      --accent-yellow-bg: rgba(210, 153, 34, 0.15);
      --accent-yellow-border: rgba(210, 153, 34, 0.4);
      --accent-cyan: #58a6ff;
      --font-mono: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace;
      --font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", Helvetica, Arial, sans-serif;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      background-color: var(--bg);
      color: var(--text);
      font-family: var(--font-sans);
      line-height: 1.5;
      padding: 2rem 1.5rem;
      min-height: 100vh;
    }

    .container {
      max-width: 1100px;
      margin: 0 auto;
    }

    header {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      margin-bottom: 2rem;
      padding-bottom: 1.5rem;
      border-bottom: 1px solid var(--card-border);
    }

    .logo-area h1 {
      font-size: 1.6rem;
      font-weight: 700;
      letter-spacing: -0.02em;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .logo-area p {
      color: var(--text-muted);
      font-size: 0.9rem;
      margin-top: 0.25rem;
    }

    .timestamp-badge {
      font-family: var(--font-mono);
      font-size: 0.8rem;
      color: var(--text-muted);
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      padding: 0.35rem 0.75rem;
      border-radius: 6px;
    }

    /* Metric Cards */
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      margin-bottom: 2rem;
    }

    .metric-card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 8px;
      padding: 1.25rem;
      position: relative;
      overflow: hidden;
    }

    .metric-card.upheld { border-top: 3px solid var(--accent-green); }
    .metric-card.unmet { border-top: 3px solid var(--accent-red); }
    .metric-card.unclaimed { border-top: 3px solid var(--accent-yellow); }
    .metric-card.total { border-top: 3px solid var(--accent-cyan); }

    .metric-label {
      font-size: 0.8rem;
      text-transform: uppercase;
      font-weight: 600;
      letter-spacing: 0.05em;
      color: var(--text-muted);
    }

    .metric-value {
      font-size: 2.2rem;
      font-weight: 700;
      font-family: var(--font-mono);
      margin-top: 0.25rem;
    }

    .metric-card.upheld .metric-value { color: var(--accent-green); }
    .metric-card.unmet .metric-value { color: var(--accent-red); }
    .metric-card.unclaimed .metric-value { color: var(--accent-yellow); }
    .metric-card.total .metric-value { color: var(--text); }

    /* Main Table */
    .table-card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 8px;
      overflow: hidden;
      margin-bottom: 2rem;
    }

    .card-header {
      padding: 1rem 1.25rem;
      border-bottom: 1px solid var(--card-border);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .card-title {
      font-size: 1.05rem;
      font-weight: 600;
    }

    .table-container {
      overflow-x: auto;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
      font-size: 0.9rem;
    }

    th {
      background: rgba(255, 255, 255, 0.02);
      color: var(--text-muted);
      font-weight: 600;
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      padding: 0.75rem 1.25rem;
      border-bottom: 1px solid var(--card-border);
    }

    td {
      padding: 0.9rem 1.25rem;
      border-bottom: 1px solid rgba(48, 54, 61, 0.5);
      vertical-align: top;
    }

    tr:last-child td {
      border-bottom: none;
    }

    tr:hover td {
      background: rgba(255, 255, 255, 0.02);
    }

    .code-cell {
      font-family: var(--font-mono);
      font-size: 0.85rem;
      word-break: break-word;
    }

    .empty-cell {
      text-align: center;
      color: var(--text-muted);
      padding: 2rem;
    }

    /* Badges & Pills */
    .badge {
      display: inline-block;
      font-family: var(--font-mono);
      font-size: 0.75rem;
      font-weight: 700;
      padding: 0.2rem 0.55rem;
      border-radius: 4px;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }

    .badge-upheld {
      background: var(--accent-green-bg);
      color: var(--accent-green);
      border: 1px solid var(--accent-green-border);
    }

    .badge-unmet {
      background: var(--accent-red-bg);
      color: var(--accent-red);
      border: 1px solid var(--accent-red-border);
    }

    .badge-unclaimed {
      background: var(--accent-yellow-bg);
      color: var(--accent-yellow);
      border: 1px solid var(--accent-yellow-border);
    }

    .type-pill {
      font-family: var(--font-mono);
      font-size: 0.75rem;
      color: var(--text-muted);
      background: rgba(255, 255, 255, 0.05);
      padding: 0.2rem 0.5rem;
      border-radius: 4px;
      border: 1px solid rgba(255, 255, 255, 0.1);
    }

    /* Expandable details inside rows */
    .row-details {
      margin-top: 0.5rem;
      font-size: 0.8rem;
    }

    .row-details summary {
      cursor: pointer;
      color: var(--accent-yellow);
      font-family: var(--font-sans);
      user-select: none;
    }

    .row-details summary:hover {
      text-decoration: underline;
    }

    .details-content {
      margin-top: 0.35rem;
      padding: 0.5rem 0.75rem;
      background: rgba(0, 0, 0, 0.3);
      border-left: 2px solid var(--accent-yellow);
      border-radius: 0 4px 4px 0;
      color: var(--text);
      font-family: var(--font-mono);
      font-size: 0.8rem;
      white-space: pre-wrap;
    }

    /* Discrepancies Section */
    .discrepancies-section {
      margin-bottom: 2rem;
    }

    .main-details {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 8px;
      overflow: hidden;
    }

    .main-details-summary {
      padding: 1rem 1.25rem;
      font-size: 1.05rem;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: space-between;
      user-select: none;
    }

    .main-details-summary:hover {
      background: rgba(255, 255, 255, 0.02);
    }

    .counter {
      background: var(--accent-red-bg);
      color: var(--accent-red);
      border: 1px solid var(--accent-red-border);
      font-size: 0.75rem;
      font-family: var(--font-mono);
      padding: 0.15rem 0.5rem;
      border-radius: 12px;
      font-weight: 700;
    }

    .mismatch-list {
      padding: 1rem 1.25rem;
      border-top: 1px solid var(--card-border);
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .mismatch-item {
      background: rgba(0, 0, 0, 0.25);
      border: 1px solid var(--card-border);
      border-radius: 6px;
      padding: 0.85rem 1rem;
    }

    .mismatch-item-unmet {
      border-left: 3px solid var(--accent-red);
    }

    .mismatch-item-unclaimed {
      border-left: 3px solid var(--accent-yellow);
    }

    .mismatch-header {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      margin-bottom: 0.4rem;
    }

    .mismatch-id code {
      font-family: var(--font-mono);
      font-size: 0.85rem;
      color: var(--text-muted);
    }

    .mismatch-body {
      font-family: var(--font-mono);
      font-size: 0.85rem;
      color: var(--text);
      line-height: 1.4;
      white-space: pre-wrap;
    }

    footer {
      text-align: center;
      color: var(--text-dim);
      font-size: 0.8rem;
      margin-top: 3rem;
      padding-top: 1.5rem;
      border-top: 1px solid var(--card-border);
    }

    footer a {
      color: var(--text-muted);
      text-decoration: none;
    }

    footer a:hover {
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div class="logo-area">
        <h1>Upheld — Claims vs Evidence</h1>
        <p><em>Claims, upheld. Done means shown.</em></p>
      </div>
      <div>
        <span class="badge ${overallBadgeClass}">${overallStatusText}</span>
        <span class="timestamp-badge">${escapeHtml(report.timestamp)}</span>
      </div>
    </header>

    <div class="metrics-grid">
      <div class="metric-card upheld">
        <div class="metric-label">Upheld</div>
        <div class="metric-value">${report.summary.upheld}</div>
      </div>
      <div class="metric-card unmet">
        <div class="metric-label">Unmet</div>
        <div class="metric-value">${report.summary.unmet}</div>
      </div>
      <div class="metric-card unclaimed">
        <div class="metric-label">Unclaimed</div>
        <div class="metric-value">${report.summary.unclaimed}</div>
      </div>
      <div class="metric-card total">
        <div class="metric-label">Total Evaluated</div>
        <div class="metric-value">${report.summary.total}</div>
      </div>
    </div>

    <div class="table-card">
      <div class="card-header">
        <span class="card-title">Claims vs Evidence</span>
      </div>
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Status</th>
              <th>Type</th>
              <th>Claim</th>
              <th>Evidence</th>
            </tr>
          </thead>
          <tbody>
${emptyRowHtml}
          </tbody>
        </table>
      </div>
    </div>

    ${mismatchSectionHtml}

    <footer>
      Generated by Upheld &bull; Harness-agnostic claims-vs-evidence verification for AI coding agents
    </footer>
  </div>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
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
