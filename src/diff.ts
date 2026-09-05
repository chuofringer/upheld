import { ClaimResult, VerificationReport, DiffReport, DeltaSummary } from './types.js';

export function normalizeToResults(input: VerificationReport | ClaimResult[]): { timestamp?: string; results: ClaimResult[] } {
  if (Array.isArray(input)) {
    return { results: input };
  }
  if (input && Array.isArray(input.results)) {
    return { timestamp: input.timestamp, results: input.results };
  }
  throw new Error('Invalid claim report format: expected an array of ClaimResults or a VerificationReport object with a results array.');
}

/**
 * Compares two verification reports / claim result sets and computes the delta:
 * - newlyUpheld: claims that were unmet/unclaimed (or non-existent) and are now upheld
 * - newlyUnmet: claims that were upheld/unclaimed and are now unmet
 * - newlyUnclaimed: claims that were upheld/unmet and are now unclaimed
 * - unchanged: claims that kept their status
 * - added: claims present in target but not base
 * - removed: claims present in base but not target
 */
export function diffReports(
  baseInput: VerificationReport | ClaimResult[],
  targetInput: VerificationReport | ClaimResult[]
): DiffReport {
  const base = normalizeToResults(baseInput);
  const target = normalizeToResults(targetInput);

  const baseMap = new Map<string, ClaimResult>();
  for (const item of base.results) {
    baseMap.set(item.id, item);
  }

  const targetMap = new Map<string, ClaimResult>();
  for (const item of target.results) {
    targetMap.set(item.id, item);
  }

  const newlyUpheld: ClaimResult[] = [];
  const newlyUnmet: ClaimResult[] = [];
  const newlyUnclaimed: ClaimResult[] = [];
  const unchanged: ClaimResult[] = [];
  const added: ClaimResult[] = [];
  const removed: ClaimResult[] = [];

  for (const targetItem of target.results) {
    const baseItem = baseMap.get(targetItem.id);
    if (!baseItem) {
      added.push(targetItem);
      if (targetItem.status === 'upheld') {
        newlyUpheld.push(targetItem);
      } else if (targetItem.status === 'unmet') {
        newlyUnmet.push(targetItem);
      } else if (targetItem.status === 'unclaimed') {
        newlyUnclaimed.push(targetItem);
      }
    } else {
      if (baseItem.status === targetItem.status) {
        unchanged.push(targetItem);
      } else {
        if (targetItem.status === 'upheld') {
          newlyUpheld.push(targetItem);
        } else if (targetItem.status === 'unmet') {
          newlyUnmet.push(targetItem);
        } else if (targetItem.status === 'unclaimed') {
          newlyUnclaimed.push(targetItem);
        }
      }
    }
  }

  for (const baseItem of base.results) {
    if (!targetMap.has(baseItem.id)) {
      removed.push(baseItem);
    }
  }

  const delta: DeltaSummary = {
    newlyUpheld,
    newlyUnmet,
    newlyUnclaimed,
    unchanged,
    added,
    removed
  };

  return {
    baseTimestamp: base.timestamp,
    targetTimestamp: target.timestamp,
    summary: {
      newlyUpheldCount: newlyUpheld.length,
      newlyUnmetCount: newlyUnmet.length,
      newlyUnclaimedCount: newlyUnclaimed.length,
      unchangedCount: unchanged.length,
      addedCount: added.length,
      removedCount: removed.length
    },
    delta
  };
}

export interface FormatDiffOptions {
  color?: boolean;
}

export function formatCompactDiff(diff: DiffReport, options: FormatDiffOptions = {}): string {
  const { color = false } = options;

  const green = (s: string) => (color ? `\x1b[32m${s}\x1b[0m` : s);
  const red = (s: string) => (color ? `\x1b[31m${s}\x1b[0m` : s);
  const yellow = (s: string) => (color ? `\x1b[33m${s}\x1b[0m` : s);
  const gray = (s: string) => (color ? `\x1b[90m${s}\x1b[0m` : s);
  const bold = (s: string) => (color ? `\x1b[1m${s}\x1b[0m` : s);

  const lines: string[] = [];

  lines.push(bold('=== Upheld Claim Delta ==='));
  lines.push(
    `Summary: ${green(`+${diff.summary.newlyUpheldCount} upheld`)} | ${red(`-${diff.summary.newlyUnmetCount} unmet`)} | ${yellow(`~${diff.summary.newlyUnclaimedCount} unclaimed`)} | ${gray(`${diff.summary.unchangedCount} unchanged`)}`
  );
  lines.push('');

  if (diff.delta.newlyUpheld.length > 0) {
    lines.push(green(bold('✔ Newly Upheld:')));
    for (const item of diff.delta.newlyUpheld) {
      const desc = item.description ? ` - ${item.description}` : '';
      const reason = item.reason ? ` (${item.reason})` : '';
      lines.push(green(`  + [UPHELD] ${item.id}${desc}${reason}`));
    }
    lines.push('');
  }

  if (diff.delta.newlyUnmet.length > 0) {
    lines.push(red(bold('✖ Newly Unmet (Regressions / Failures):')));
    for (const item of diff.delta.newlyUnmet) {
      const desc = item.description ? ` - ${item.description}` : '';
      const reason = item.reason ? ` (${item.reason})` : '';
      lines.push(red(`  - [UNMET] ${item.id}${desc}${reason}`));
    }
    lines.push('');
  }

  if (diff.delta.newlyUnclaimed.length > 0) {
    lines.push(yellow(bold('? Newly Unclaimed (Missing / Pending Rules):')));
    for (const item of diff.delta.newlyUnclaimed) {
      const desc = item.description ? ` - ${item.description}` : '';
      const reason = item.reason ? ` (${item.reason})` : '';
      lines.push(yellow(`  ~ [UNCLAIMED] ${item.id}${desc}${reason}`));
    }
    lines.push('');
  }

  if (
    diff.delta.newlyUpheld.length === 0 &&
    diff.delta.newlyUnmet.length === 0 &&
    diff.delta.newlyUnclaimed.length === 0
  ) {
    lines.push(gray('No status changes detected between reports.'));
    lines.push('');
  }

  return lines.join('\n');
}
