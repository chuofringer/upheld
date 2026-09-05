import { GitHubCheckOptions, GitHubCheckResult, VerifyReport } from './types.js';
import { formatGitHubJobSummary } from './formatter.js';

export const DEFAULT_CHECK_NAME = 'Upheld — Claims vs evidence';

export async function postGitHubCheckRun(
  report: VerifyReport,
  options: GitHubCheckOptions = {}
): Promise<GitHubCheckResult> {
  const token = options.token ?? process.env.GITHUB_TOKEN;
  const sha = options.sha ?? process.env.GITHUB_SHA;
  const repo = options.repo ?? process.env.GITHUB_REPOSITORY;
  const apiUrl = options.apiUrl ?? process.env.GITHUB_API_URL ?? 'https://api.github.com';
  const checkName = options.checkName ?? DEFAULT_CHECK_NAME;
  const customFetch = options.fetchFn ?? globalThis.fetch;

  if (!token || !sha) {
    const missing: string[] = [];
    if (!token) missing.push('GITHUB_TOKEN');
    if (!sha) missing.push('GITHUB_SHA');
    return {
      posted: false,
      skippedReason: `Missing required environment variables/options: ${missing.join(', ')}`,
    };
  }

  if (!repo) {
    return {
      posted: false,
      skippedReason: 'Missing GITHUB_REPOSITORY (format: owner/repo)',
    };
  }

  const conclusion: 'success' | 'failure' = report.hasUnmet ? 'failure' : 'success';
  const summaryTitle = report.hasUnmet
    ? `${report.summary.unmet} unmet claim(s) detected`
    : `${report.summary.upheld} claim(s) upheld`;

  const summaryMarkdown = formatGitHubJobSummary(report);

  const payload = {
    name: checkName,
    head_sha: sha,
    status: 'completed',
    conclusion,
    completed_at: new Date().toISOString(),
    output: {
      title: summaryTitle,
      summary: summaryMarkdown,
    },
  };

  const endpoint = `${apiUrl.replace(/\/$/, '')}/repos/${repo}/check-runs`;

  try {
    const response = await customFetch(endpoint, {
      method: 'POST',
      headers: {
        'Accept': 'application/vnd.github+json',
        'Authorization': `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'upheld-verifier',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        posted: false,
        conclusion,
        error: `GitHub API error (${response.status}): ${errorText}`,
      };
    }

    const data = await response.json() as Record<string, unknown>;
    const checkRunId = typeof data.id === 'number' ? data.id : undefined;
    const htmlUrl = typeof data.html_url === 'string' ? data.html_url : undefined;

    return {
      posted: true,
      checkRunId,
      url: htmlUrl,
      conclusion,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      posted: false,
      conclusion,
      error: `Network error posting check run: ${message}`,
    };
  }
}
