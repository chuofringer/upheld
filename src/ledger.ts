import * as fs from 'node:fs';
import * as path from 'node:path';
import * as readline from 'node:readline';
import type { VerificationResult, ReceiptLedgerEntry, LedgerSummaryOptions } from './types.js';
import { claimToDigest } from './digest.js';

/**
 * Creates a receipt ledger entry from a verification result.
 */
export function createLedgerEntry(
  result: VerificationResult,
  metadata?: Record<string, unknown>
): ReceiptLedgerEntry {
  return {
    version: '1.0',
    runId: result.runId,
    timestamp: result.timestamp,
    exitMode: result.exitMode,
    passed: result.passed,
    counts: {
      total: result.summary.total,
      upheld: result.summary.upheld,
      unmet: result.summary.unmet,
      unclaimed: result.summary.unclaimed,
    },
    claims: result.claims.map(claimToDigest),
    ...(metadata && Object.keys(metadata).length > 0 ? { metadata } : {}),
  };
}

/**
 * Appends a verification receipt to a local JSONL ledger file.
 * Creates intermediate directories if they do not exist.
 */
export async function appendLedgerEntry(
  ledgerPath: string,
  entryOrResult: ReceiptLedgerEntry | VerificationResult,
  metadata?: Record<string, unknown>
): Promise<ReceiptLedgerEntry> {
  const resolvedPath = path.resolve(ledgerPath);
  const dir = path.dirname(resolvedPath);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const entry: ReceiptLedgerEntry =
    'claims' in entryOrResult &&
    entryOrResult.claims.length > 0 &&
    'hash' in entryOrResult.claims[0]
      ? (entryOrResult as ReceiptLedgerEntry)
      : createLedgerEntry(entryOrResult as VerificationResult, metadata);

  const line = JSON.stringify(entry) + '\n';
  await fs.promises.appendFile(resolvedPath, line, 'utf-8');
  return entry;
}

/**
 * Reads all entries from a local JSONL ledger file.
 */
export async function readLedgerEntries(ledgerPath: string): Promise<ReceiptLedgerEntry[]> {
  const resolvedPath = path.resolve(ledgerPath);
  if (!fs.existsSync(resolvedPath)) {
    return [];
  }

  const fileStream = fs.createReadStream(resolvedPath, 'utf-8');
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  const entries: ReceiptLedgerEntry[] = [];

  for await (const line of rl) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const parsed = JSON.parse(trimmed) as ReceiptLedgerEntry;
      entries.push(parsed);
    } catch {
      // Ignore malformed lines gracefully
    }
  }

  return entries;
}

/**
 * Retrieves the last N entries from a local JSONL ledger file.
 */
export async function getLedgerSummary(
  ledgerPath: string,
  options: LedgerSummaryOptions = {}
): Promise<ReceiptLedgerEntry[]> {
  const entries = await readLedgerEntries(ledgerPath);
  const limit = options.limit ?? 10;

  if (entries.length === 0) {
    return [];
  }

  const sliced = limit > 0 ? entries.slice(-limit) : entries;
  return options.reverse ? sliced.reverse() : sliced;
}

/**
 * Formats ledger entries into a human-readable table/summary string for terminal display.
 */
export function formatLedgerSummary(entries: ReceiptLedgerEntry[]): string {
  if (entries.length === 0) {
    return 'No verification receipts found in ledger.';
  }

  const lines: string[] = [];
  lines.push(`Receipt Ledger (${entries.length} run${entries.length === 1 ? '' : 's'}):`);
  lines.push('─'.repeat(80));
  lines.push(
    `RUN ID`.padEnd(14) +
      `TIMESTAMP`.padEnd(26) +
      `MODE`.padEnd(8) +
      `UPHELD`.padEnd(10) +
      `UNMET`.padEnd(10) +
      `UNCLAIMED`.padEnd(12)
  );
  lines.push('─'.repeat(80));

  for (const entry of entries) {
    const runId = entry.runId.substring(0, 12).padEnd(14);
    const ts = entry.timestamp.padEnd(26);
    const mode = entry.exitMode.toUpperCase().padEnd(8);
    const upheld = String(entry.counts.upheld).padEnd(10);
    const unmet = String(entry.counts.unmet).padEnd(10);
    const unclaimed = String(entry.counts.unclaimed).padEnd(12);

    lines.push(`${runId}${ts}${mode}${upheld}${unmet}${unclaimed}`);
  }
  lines.push('─'.repeat(80));

  return lines.join('\n');
}
