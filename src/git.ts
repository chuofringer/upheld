import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

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
        files.push(filePath);
      }
    }
    return files;
  } catch {
    return [];
  }
}
