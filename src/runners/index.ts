import { spawn } from 'node:child_process';
import { TestResultMetrics } from '../types.js';
import { parsePytestOutput } from './pytest.js';
import { parseVitestOutput } from './vitest.js';
import { parseJestOutput } from './jest.js';

export function detectFramework(cmd: string): 'pytest' | 'vitest' | 'jest' | 'generic' {
  const normalized = cmd.toLowerCase();
  if (normalized.includes('pytest') || normalized.includes('python -m pytest') || normalized.includes('py.test')) {
    return 'pytest';
  }
  if (normalized.includes('vitest')) {
    return 'vitest';
  }
  if (normalized.includes('jest')) {
    return 'jest';
  }
  return 'generic';
}

export interface RunTestOptions {
  cwd?: string;
  timeoutMs?: number;
  env?: Record<string, string | undefined>;
}

export function parseOutputMetrics(output: string): {
  passed?: number;
  failed?: number;
  skipped?: number;
  total?: number;
  framework?: 'pytest' | 'vitest' | 'jest' | 'generic';
} {
  const vitest = parseVitestOutput(output);
  if (vitest.passed !== undefined || vitest.failed !== undefined || vitest.skipped !== undefined || (vitest.total !== undefined && vitest.total > 0)) {
    return { ...vitest, framework: 'vitest' };
  }

  const jest = parseJestOutput(output);
  if (jest.passed !== undefined || jest.failed !== undefined || jest.skipped !== undefined || (jest.total !== undefined && jest.total > 0)) {
    return { ...jest, framework: 'jest' };
  }

  const pytest = parsePytestOutput(output);
  if (pytest.passed !== undefined || pytest.failed !== undefined || pytest.skipped !== undefined || (pytest.total !== undefined && pytest.total > 0)) {
    return { ...pytest, framework: 'pytest' };
  }

  return { framework: 'generic' };
}

export async function executeTestCommand(
  cmd: string,
  options: RunTestOptions = {}
): Promise<TestResultMetrics> {
  const cwd = options.cwd ?? process.cwd();
  const timeoutMs = options.timeoutMs ?? 120_000;
  let framework = detectFramework(cmd);

  const startTime = Date.now();

  return new Promise((resolve) => {
    let stdout = '';
    let stderr = '';

    const child = spawn(cmd, {
      shell: true,
      cwd,
      env: {
        ...process.env,
        ...options.env,
        CI: 'true',
        FORCE_COLOR: '0',
      },
    });

    let timer: NodeJS.Timeout | null = null;
    if (timeoutMs > 0) {
      timer = setTimeout(() => {
        child.kill('SIGKILL');
      }, timeoutMs);
    }

    child.stdout?.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr?.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', (err) => {
      if (timer) clearTimeout(timer);
      const durationMs = Date.now() - startTime;
      resolve({
        cmd,
        exitCode: 1,
        stdout,
        stderr: stderr + `\nProcess error: ${err.message}`,
        framework,
        durationMs,
      });
    });

    child.on('close', (code) => {
      if (timer) clearTimeout(timer);
      const durationMs = Date.now() - startTime;
      const combinedOutput = `${stdout}\n${stderr}`;

      let parsedMetrics: { passed?: number; failed?: number; skipped?: number; total?: number } = {};
      if (framework === 'pytest') {
        parsedMetrics = parsePytestOutput(combinedOutput);
      } else if (framework === 'vitest') {
        parsedMetrics = parseVitestOutput(combinedOutput);
      } else if (framework === 'jest') {
        parsedMetrics = parseJestOutput(combinedOutput);
      } else {
        // Try auto-detecting metrics from output if generic
        const fallback = parseOutputMetrics(combinedOutput);
        if (fallback.framework && fallback.framework !== 'generic') {
          framework = fallback.framework;
          parsedMetrics = fallback;
        }
      }

      resolve({
        cmd,
        exitCode: code ?? 1,
        passed: parsedMetrics.passed,
        failed: parsedMetrics.failed,
        skipped: parsedMetrics.skipped,
        total: parsedMetrics.total,
        framework,
        stdout,
        stderr,
        durationMs,
      });
    });
  });
}
