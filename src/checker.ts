import { stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { FileEvidenceMetrics } from './types.js';
import { isPathModifiedInGit } from './git.js';

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

export async function checkFileExists(
  filePath: string,
  cwd: string = process.cwd()
): Promise<FileEvidenceMetrics> {
  return checkFileEvidence(filePath, { cwd });
}
