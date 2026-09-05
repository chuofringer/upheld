import { TamperingFinding, LintDiffResult } from './types.js';

export interface DiffHunkLine {
  type: 'add' | 'del' | 'context';
  content: string;
  oldLineNumber?: number;
  newLineNumber?: number;
}

export interface DiffFile {
  oldPath: string;
  newPath: string;
  hunks: DiffHunk[];
}

export interface DiffHunk {
  header: string;
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  lines: DiffHunkLine[];
}

/**
 * Checks if a file path represents a test file across common ecosystems
 */
export function isTestFile(filePath: string): boolean {
  const p = filePath.toLowerCase();
  // Typical test paths & extensions
  return (
    p.includes('test') ||
    p.includes('spec') ||
    p.includes('__tests__') ||
    p.includes('tests/') ||
    p.includes('test/') ||
    p.endsWith('_test.py') ||
    p.endsWith('test_.py') ||
    p.endsWith('_test.go') ||
    p.endsWith('.test.ts') ||
    p.endsWith('.spec.ts') ||
    p.endsWith('.test.js') ||
    p.endsWith('.spec.js') ||
    p.endsWith('.test.tsx') ||
    p.endsWith('.spec.tsx') ||
    p.endsWith('.test.jsx') ||
    p.endsWith('.spec.jsx') ||
    p.endsWith('test.rb') ||
    p.endsWith('_spec.rb')
  );
}

/**
 * Simple standard unified diff parser
 */
export function parseUnifiedDiff(diffText: string): DiffFile[] {
  const files: DiffFile[] = [];
  const lines = diffText.split('\n');
  let currentFile: DiffFile | null = null;
  let currentHunk: DiffHunk | null = null;
  let currentOldLine = 0;
  let currentNewLine = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith('diff --git ')) {
      if (currentHunk && currentFile) {
        currentFile.hunks.push(currentHunk);
        currentHunk = null;
      }
      if (currentFile) {
        files.push(currentFile);
      }
      currentFile = {
        oldPath: '',
        newPath: '',
        hunks: [],
      };
      // Parse a/... b/...
      const match = line.match(/^diff --git a\/(.+) b\/(.+)$/);
      if (match) {
        currentFile.oldPath = match[1];
        currentFile.newPath = match[2];
      }
      continue;
    }

    if (line.startsWith('--- ')) {
      if (currentFile && !currentFile.oldPath) {
        const p = line.slice(4).trim();
        currentFile.oldPath = p.startsWith('a/') ? p.slice(2) : p;
      }
      continue;
    }

    if (line.startsWith('+++ ')) {
      if (currentFile && !currentFile.newPath) {
        const p = line.slice(4).trim();
        currentFile.newPath = p.startsWith('b/') ? p.slice(2) : p;
      }
      continue;
    }

    if (line.startsWith('@@ ')) {
      if (currentHunk && currentFile) {
        currentFile.hunks.push(currentHunk);
      }
      const match = line.match(/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/);
      if (match) {
        currentOldLine = parseInt(match[1], 10);
        const oldLines = match[2] ? parseInt(match[2], 10) : 1;
        currentNewLine = parseInt(match[3], 10);
        const newLines = match[4] ? parseInt(match[4], 10) : 1;

        currentHunk = {
          header: line,
          oldStart: currentOldLine,
          oldLines,
          newStart: currentNewLine,
          newLines,
          lines: [],
        };
      }
      continue;
    }

    if (currentHunk) {
      if (line.startsWith('+') && !line.startsWith('+++')) {
        currentHunk.lines.push({
          type: 'add',
          content: line.slice(1),
          newLineNumber: currentNewLine,
        });
        currentNewLine++;
      } else if (line.startsWith('-') && !line.startsWith('---')) {
        currentHunk.lines.push({
          type: 'del',
          content: line.slice(1),
          oldLineNumber: currentOldLine,
        });
        currentOldLine++;
      } else if (line.startsWith(' ') || line === '') {
        currentHunk.lines.push({
          type: 'context',
          content: line.startsWith(' ') ? line.slice(1) : line,
          oldLineNumber: currentOldLine,
          newLineNumber: currentNewLine,
        });
        currentOldLine++;
        currentNewLine++;
      }
    }
  }

  if (currentHunk && currentFile) {
    currentFile.hunks.push(currentHunk);
  }
  if (currentFile) {
    files.push(currentFile);
  }

  return files;
}

export interface TamperingRule {
  id: string;
  description: string;
  check: (file: DiffFile) => TamperingFinding[];
}

// Check for added .only / .skip in test files
const onlyOrSkipRule: TamperingRule = {
  id: 'focused-or-skipped-tests',
  description: 'Added test focus or skip modifier (.only, .skip, fit, fdescribe, xit, xdescribe, @pytest.mark.skip)',
  check: (file: DiffFile) => {
    const findings: TamperingFinding[] = [];
    const filePath = file.newPath || file.oldPath;
    if (!isTestFile(filePath)) return findings;

    // Regexes for focus/skips added
    const focusSkipRegexes: Array<{ pattern: RegExp; reason: string }> = [
      {
        pattern: /\b(?:describe|it|test|context)\s*\.\s*(?:only|skip)\b/,
        reason: 'Added test focus/skip modifier (.only or .skip) which suppresses tests',
      },
      {
        pattern: /\b(?:fit|fdescribe|xit|xdescribe)\s*\(/,
        reason: 'Added focused or excluded test suite (fit, fdescribe, xit, or xdescribe)',
      },
      {
        pattern: /@pytest\.mark\.(?:skip|skipif|xfail)\b/,
        reason: 'Added pytest skip/xfail decorator suppressing test execution',
      },
      {
        pattern: /\bunittest\.skip\b/,
        reason: 'Added unittest skip decorator suppressing test execution',
      },
      {
        pattern: /\bt\.Skip(?:Now|f)?\s*\(/,
        reason: 'Added Go test skip call',
      },
    ];

    for (const hunk of file.hunks) {
      for (const line of hunk.lines) {
        if (line.type !== 'add') continue;
        for (const { pattern, reason } of focusSkipRegexes) {
          if (pattern.test(line.content)) {
            findings.push({
              ruleId: 'focused-or-skipped-tests',
              pattern: pattern.source,
              file: filePath,
              line: line.newLineNumber,
              snippet: line.content.trim(),
              reason,
            });
          }
        }
      }
    }
    return findings;
  },
};

// Check for weakened asserts / trivial asserts like assert True, expect(true).toBe(true), pass in test body
const weakenedAssertsRule: TamperingRule = {
  id: 'weakened-assertions',
  description: 'Added trivial or weakened assertions (assert True, expect(true).toBe(true), assert 1 == 1)',
  check: (file: DiffFile) => {
    const findings: TamperingFinding[] = [];
    const filePath = file.newPath || file.oldPath;
    if (!isTestFile(filePath)) return findings;

    const weakPatterns: Array<{ pattern: RegExp; reason: string }> = [
      {
        pattern: /\bassert\s+(?:True|1|1\s*==\s*1|True\s*==\s*True)\s*(?:#.*)?$/,
        reason: 'Added vacuous/tautological assertion (e.g., assert True)',
      },
      {
        pattern: /\bexpect\s*\(\s*(?:true|1)\s*\)\s*\.\s*(?:to(?:Be|Equal)\s*\(\s*(?:true|1)\s*\)|toBeTruthy\s*\(\s*\))/,
        reason: 'Added vacuous test assertion (expect(true).toBe(true))',
      },
      {
        pattern: /\bassert\.ok\s*\(\s*(?:true|1)\s*\)/,
        reason: 'Added trivial assertion (assert.ok(true))',
      },
      {
        pattern: /\bself\.assertTrue\s*\(\s*(?:True|1)\s*\)/,
        reason: 'Added trivial assertion (self.assertTrue(True))',
      },
    ];

    for (const hunk of file.hunks) {
      for (const line of hunk.lines) {
        if (line.type !== 'add') continue;
        for (const { pattern, reason } of weakPatterns) {
          if (pattern.test(line.content)) {
            findings.push({
              ruleId: 'weakened-assertions',
              pattern: pattern.source,
              file: filePath,
              line: line.newLineNumber,
              snippet: line.content.trim(),
              reason,
            });
          }
        }
      }
    }
    return findings;
  },
};

// Check for deleted assertions in test files
const deletedAssertionsRule: TamperingRule = {
  id: 'deleted-assertions',
  description: 'Deleted assertions in test files without replacement',
  check: (file: DiffFile) => {
    const findings: TamperingFinding[] = [];
    const filePath = file.newPath || file.oldPath;
    if (!isTestFile(filePath)) return findings;

    const assertionRegex = /\b(?:assert|expect\s*\(|assert\.[a-zA-Z]+|self\.assert[a-zA-Z]+|assert_that)\b/;

    for (const hunk of file.hunks) {
      const deletedAsserts = hunk.lines.filter(
        (l) => l.type === 'del' && assertionRegex.test(l.content)
      );
      const addedAsserts = hunk.lines.filter(
        (l) => l.type === 'add' && assertionRegex.test(l.content)
      );

      // If more assertions were deleted than added in a test hunk, flag the deleted assertions
      if (deletedAsserts.length > addedAsserts.length) {
        for (const delLine of deletedAsserts) {
          findings.push({
            ruleId: 'deleted-assertions',
            pattern: 'deleted assertion',
            file: filePath,
            line: delLine.oldLineNumber,
            snippet: delLine.content.trim(),
            reason: 'Deleted assertion in test file without equivalent replacement',
          });
        }
      }
    }
    return findings;
  },
};

// Check for mass noqa or lint suppression added in test files
const massNoqaRule: TamperingRule = {
  id: 'mass-lint-suppression',
  description: 'Mass added linter or type-checker suppressions (# noqa, eslint-disable, @ts-ignore, @ts-nocheck)',
  check: (file: DiffFile) => {
    const findings: TamperingFinding[] = [];
    const filePath = file.newPath || file.oldPath;
    if (!isTestFile(filePath)) return findings;

    const suppressionRegexes: Array<{ pattern: RegExp; reason: string }> = [
      {
        pattern: /#\s*noqa\b/i,
        reason: 'Added # noqa lint suppression comment in test file',
      },
      {
        pattern: /\/\*?\s*eslint-disable(?:-next-line|-line)?\b/,
        reason: 'Added eslint-disable comment in test file',
      },
      {
        pattern: /@ts-ignore|@ts-nocheck/,
        reason: 'Added TypeScript error suppression comment (@ts-ignore/@ts-nocheck) in test file',
      },
      {
        pattern: /#\s*type:\s*ignore/,
        reason: 'Added type: ignore suppression comment in test file',
      },
    ];

    for (const hunk of file.hunks) {
      for (const line of hunk.lines) {
        if (line.type !== 'add') continue;
        for (const { pattern, reason } of suppressionRegexes) {
          if (pattern.test(line.content)) {
            findings.push({
              ruleId: 'mass-lint-suppression',
              pattern: pattern.source,
              file: filePath,
              line: line.newLineNumber,
              snippet: line.content.trim(),
              reason,
            });
          }
        }
      }
    }
    return findings;
  },
};

// Check for changed test count denominators / fixtures / configs reducing expected count
const testCountDenominatorRule: TamperingRule = {
  id: 'changed-test-counts-denominator',
  description: 'Modified test suite config, claims, or count denominators to artificially lower expectations',
  check: (file: DiffFile) => {
    const findings: TamperingFinding[] = [];
    const filePath = file.newPath || file.oldPath;

    // Check test configurations or claim fixtures or scripts reducing counts
    const isConfigOrClaim =
      filePath.includes('claims') ||
      filePath.endsWith('.json') ||
      filePath.includes('vitest.config') ||
      filePath.includes('jest.config') ||
      filePath.includes('pytest.ini') ||
      filePath.includes('setup.cfg');

    if (!isConfigOrClaim) return findings;

    for (const hunk of file.hunks) {
      const delLines = hunk.lines.filter((l) => l.type === 'del');
      const addLines = hunk.lines.filter((l) => l.type === 'add');

      for (const del of delLines) {
        // e.g. "total": 12 -> "total": 4 or "passed": 12 -> "passed": 4
        const totalMatchDel = del.content.match(/"(total|passed|count)"\s*:\s*(\d+)/);
        if (totalMatchDel) {
          const oldCount = parseInt(totalMatchDel[2], 10);
          for (const add of addLines) {
            const totalMatchAdd = add.content.match(new RegExp(`"${totalMatchDel[1]}"\\s*:\\s*(\\d+)`));
            if (totalMatchAdd) {
              const newCount = parseInt(totalMatchAdd[1], 10);
              if (newCount < oldCount) {
                findings.push({
                  ruleId: 'changed-test-counts-denominator',
                  pattern: `reduced ${totalMatchDel[1]} count from ${oldCount} to ${newCount}`,
                  file: filePath,
                  line: add.newLineNumber,
                  snippet: add.content.trim(),
                  reason: `Reduced claimed test count denominator (${totalMatchDel[1]}: ${oldCount} -> ${newCount})`,
                });
              }
            }
          }
        }
      }
    }

    return findings;
  },
};

export const ALL_TAMPERING_RULES: TamperingRule[] = [
  onlyOrSkipRule,
  weakenedAssertsRule,
  deletedAssertionsRule,
  massNoqaRule,
  testCountDenominatorRule,
];

/**
 * Lints a git diff string for reward-hacking and claim-tampering patterns
 */
export function lintDiffString(diffText: string): LintDiffResult {
  const files = parseUnifiedDiff(diffText);
  const findings: TamperingFinding[] = [];

  for (const file of files) {
    for (const rule of ALL_TAMPERING_RULES) {
      const ruleFindings = rule.check(file);
      findings.push(...ruleFindings);
    }
  }

  return {
    tampered: findings.length > 0,
    findings,
    diffSummary: {
      filesScanned: files.length,
      findingsCount: findings.length,
    },
  };
}
