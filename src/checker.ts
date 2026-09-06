import { stat, readdir } from 'node:fs/promises';
import { resolve, relative } from 'node:path';
import { FileEvidenceMetrics, PathEvidenceResult } from './types.js';
import { isPathModifiedInGit, normalizePath } from './git.js';

export async function checkFileEvidence(
  filePath: string,
  options: {
    cwd?: string;
    sinceTimestamp?: number;
  } = {}
): Promise<FileEvidenceMetrics> {
  const cwd = options.cwd ?? process.cwd();
  const absolutePath = resolve(cwd, filePath);
  try {
    const fileStat = await stat(absolutePath);
    const exists = fileStat.isFile() || fileStat.isDirectory();
    if (!exists) {
      return {
        path: filePath,
        exists: false,
      };
    }

    const mtimeMs = fileStat.mtimeMs;
    let modifiedThisRun = false;

    // Check mtime vs sinceTimestamp if provided
    if (options.sinceTimestamp !== undefined && mtimeMs >= options.sinceTimestamp) {
      modifiedThisRun = true;
    }

    // Check git status (modified / added / untracked)
    if (!modifiedThisRun) {
      const gitModified = await isPathModifiedInGit(filePath, cwd);
      if (gitModified) {
        modifiedThisRun = true;
      }
    }

    return {
      path: filePath,
      exists: true,
      sizeBytes: fileStat.size,
      modifiedThisRun,
      mtimeMs,
    };
  } catch {
    return {
      path: filePath,
      exists: false,
    };
  }
}

export async function checkPathEvidence(
  filePath: string,
  options: {
    cwd?: string;
    sinceTimestamp?: number;
  } = {}
): Promise<PathEvidenceResult> {
  const evidence = await checkFileEvidence(filePath, options);
  if (!evidence.exists) {
    return {
      path: filePath,
      status: 'unmet',
      exists: false,
      details: `File '${filePath}' was not found`,
    };
  }

  if (!evidence.modifiedThisRun) {
    return {
      path: filePath,
      status: 'unmet',
      exists: true,
      sizeBytes: evidence.sizeBytes,
      modifiedThisRun: false,
      details: `File '${filePath}' exists but has no evidence of write or change this run (unmodified in git status and mtime prior to evaluation window)`,
    };
  }

  return {
    path: filePath,
    status: 'upheld',
    exists: true,
    sizeBytes: evidence.sizeBytes,
    modifiedThisRun: true,
  };
}

/**
 * Converts a simple glob pattern (supporting *, **, ?) into a RegExp.
 */
export function globToRegExp(pattern: string): RegExp {
  const normalized = normalizePath(pattern);
  let regexStr = '^';
  let i = 0;
  while (i < normalized.length) {
    const c = normalized[i];
    if (c === '*') {
      if (normalized[i + 1] === '*') {
        // '**/' matches 0 or more directories
        if (normalized[i + 2] === '/') {
          regexStr += '(?:.*?/)?';
          i += 3;
          continue;
        } else {
          regexStr += '.*';
          i += 2;
          continue;
        }
      } else {
        // single * matches anything except '/'
        regexStr += '[^/]*';
        i += 1;
        continue;
      }
    } else if (c === '?') {
      regexStr += '[^/]';
      i += 1;
      continue;
    } else if (['.', '+', '^', '$', '{', '}', '(', ')', '|', '[', ']', '\\'].includes(c)) {
      regexStr += `\\${c}`;
      i += 1;
      continue;
    } else {
      regexStr += c;
      i += 1;
      continue;
    }
  }
  regexStr += '$';
  return new RegExp(regexStr);
}

/**
 * Recursively find all files in cwd matching one or more glob patterns.
 */
export async function matchGlobs(
  globs: string | string[],
  cwd: string = process.cwd()
): Promise<string[]> {
  const globList = Array.isArray(globs) ? globs : [globs];
  const regexes = globList.map((g) => globToRegExp(g));

  const results: string[] = [];

  async function walk(dir: string) {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (entry.name === '.git' || entry.name === 'node_modules') {
        continue;
      }
      const fullPath = resolve(dir, entry.name);
      const relPath = normalizePath(relative(cwd, fullPath));

      if (entry.isDirectory()) {
        await walk(fullPath);
      } else if (entry.isFile()) {
        if (regexes.some((re) => re.test(relPath))) {
          results.push(relPath);
        }
      }
    }
  }

  await walk(cwd);
  return results.sort();
}

export async function checkFileExists(
  filePath: string,
  cwd: string = process.cwd()
): Promise<FileEvidenceMetrics> {
  return checkFileEvidence(filePath, { cwd });
}
