import { stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { FileEvidenceMetrics } from './types.js';

export async function checkFileExists(
  filePath: string,
  cwd: string = process.cwd()
): Promise<FileEvidenceMetrics> {
  const absolutePath = resolve(cwd, filePath);
  try {
    const fileStat = await stat(absolutePath);
    if (fileStat.isFile() || fileStat.isDirectory()) {
      return {
        path: filePath,
        exists: true,
        sizeBytes: fileStat.size,
      };
    }
    return {
      path: filePath,
      exists: false,
    };
  } catch {
    return {
      path: filePath,
      exists: false,
    };
  }
}
