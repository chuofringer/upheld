import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { resolve, relative } from 'node:path';

const execAsync = promisify(exec);

export function normalizePath(p: string): string {
  return p.replace(/\\/g, '/').replace(/^\.\//, '');
}

export async function detectUntrackedAndModifiedFiles(cwd: string): Promise<string[]> {
  try {
    const { stdout } = await execAsync('git status --porcelain', { cwd });
    if (!stdout.trim()) return [];

    const lines = stdout.trim().split('\n');
    const files: string[] = [];
    for (const line of lines) {
      const trimmed = line.trim();
      // Format: XY PATH or XY "PATH"
      // e.g., '?? src/foo.ts', 'M  src/bar.ts', 'A  src/baz.ts'
      const match = trimmed.match(/^([MADRCU?!\s]{1,2})\s+(.+)$/);
      if (match) {
        let filePath = match[2];
        if (filePath.startsWith('"') && filePath.endsWith('"')) {
          filePath = filePath.slice(1, -1);
        }
        // If rename, take destination path
        if (filePath.includes(' -> ')) {
          filePath = filePath.split(' -> ')[1];
        }
        files.push(normalizePath(filePath));
      }
    }
    return files;
  } catch {
    return [];
  }
}

export async function isPathModifiedInGit(filePath: string, cwd: string): Promise<boolean> {
  const modifiedFiles = await detectUntrackedAndModifiedFiles(cwd);
  const normalizedTarget = normalizePath(filePath);
  
  // Also check relative path from cwd if absolute or differently rooted
  const absTarget = resolve(cwd, filePath);
  const relTarget = normalizePath(relative(cwd, absTarget));

  return modifiedFiles.some((f) => {
    const normalizedF = normalizePath(f);
    // Direct match
    if (normalizedF === normalizedTarget || normalizedF === relTarget) return true;
    // If git reported a directory (e.g. "dir/") and filePath is inside it
    if (normalizedF.endsWith('/') && (normalizedTarget.startsWith(normalizedF) || relTarget.startsWith(normalizedF))) {
      return true;
    }
    // If filePath is a directory and f is inside it
    const targetWithSlash = normalizedTarget.endsWith('/') ? normalizedTarget : `${normalizedTarget}/`;
    if (normalizedF.startsWith(targetWithSlash)) return true;

    return false;
  });
}
