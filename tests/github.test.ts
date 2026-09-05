import { describe, it, expect, vi } from 'vitest';
import { postGitHubCheckRun, DEFAULT_CHECK_NAME } from '../src/github.js';
import { VerifyReport } from '../src/types.js';

describe('GitHub Check Run Helper', () => {
  const mockPassingReport: VerifyReport = {
    timestamp: '2026-09-05T00:00:00.000Z',
    cwd: '/workspace',
    results: [
      {
        id: 'claim-1',
        type: 'file_written',
        status: 'upheld',
        claimSummary: 'path: README.md',
        evidenceSummary: 'exists (size: 100 B)',
      },
    ],
    summary: { total: 1, upheld: 1, unmet: 0, unclaimed: 0 },
    hasUnmet: false,
  };

  const mockFailingReport: VerifyReport = {
    timestamp: '2026-09-05T00:00:00.000Z',
    cwd: '/workspace',
    results: [
      {
        id: 'claim-1',
        type: 'file_written',
        status: 'unmet',
        claimSummary: 'path: non-existent.txt',
        evidenceSummary: 'does not exist',
        details: "File 'non-existent.txt' was not found",
      },
    ],
    summary: { total: 1, upheld: 0, unmet: 1, unclaimed: 0 },
    hasUnmet: true,
  };

  it('gracefully skips and returns no-op if GITHUB_TOKEN or GITHUB_SHA are missing', async () => {
    const result = await postGitHubCheckRun(mockPassingReport, {
      token: '',
      sha: '',
    });

    expect(result.posted).toBe(false);
    expect(result.skippedReason).toContain('Missing required environment variables');
  });

  it('gracefully skips if GITHUB_REPOSITORY is missing', async () => {
    const result = await postGitHubCheckRun(mockPassingReport, {
      token: 'fake-token',
      sha: 'fake-sha',
      repo: '',
    });

    expect(result.posted).toBe(false);
    expect(result.skippedReason).toContain('Missing GITHUB_REPOSITORY');
  });

  it('posts check run with success conclusion for passing report', async () => {
    let capturedUrl = '';
    let capturedOptions: RequestInit | undefined;

    const mockFetch = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
      capturedUrl = url;
      capturedOptions = init;
      return {
        ok: true,
        status: 201,
        json: async () => ({
          id: 123456,
          html_url: 'https://github.com/chuofringer/upheld/runs/123456',
        }),
      };
    }) as unknown as typeof fetch;

    const result = await postGitHubCheckRun(mockPassingReport, {
      token: 'ghp_secret123',
      sha: 'abcdef1234567890',
      repo: 'chuofringer/upheld',
      fetchFn: mockFetch,
    });

    expect(result.posted).toBe(true);
    expect(result.conclusion).toBe('success');
    expect(result.checkRunId).toBe(123456);
    expect(result.url).toBe('https://github.com/chuofringer/upheld/runs/123456');

    expect(capturedUrl).toBe('https://api.github.com/repos/chuofringer/upheld/check-runs');
    expect(capturedOptions?.method).toBe('POST');
    expect(capturedOptions?.headers).toMatchObject({
      'Authorization': 'Bearer ghp_secret123',
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    });

    const parsedBody = JSON.parse(capturedOptions?.body as string);
    expect(parsedBody.name).toBe(DEFAULT_CHECK_NAME);
    expect(parsedBody.head_sha).toBe('abcdef1234567890');
    expect(parsedBody.conclusion).toBe('success');
    expect(parsedBody.output.title).toContain('1 claim(s) upheld');
    expect(parsedBody.output.summary).toContain('Upheld — Claims vs evidence');
  });

  it('posts check run with failure conclusion for failing report', async () => {
    let capturedOptions: RequestInit | undefined;

    const mockFetch = vi.fn().mockImplementation(async (_url: string, init?: RequestInit) => {
      capturedOptions = init;
      return {
        ok: true,
        status: 201,
        json: async () => ({
          id: 654321,
          html_url: 'https://github.com/chuofringer/upheld/runs/654321',
        }),
      };
    }) as unknown as typeof fetch;

    const result = await postGitHubCheckRun(mockFailingReport, {
      token: 'ghp_secret123',
      sha: 'abcdef1234567890',
      repo: 'chuofringer/upheld',
      fetchFn: mockFetch,
    });

    expect(result.posted).toBe(true);
    expect(result.conclusion).toBe('failure');
    expect(result.checkRunId).toBe(654321);

    const parsedBody = JSON.parse(capturedOptions?.body as string);
    expect(parsedBody.conclusion).toBe('failure');
    expect(parsedBody.output.title).toContain('1 unmet claim(s) detected');
  });

  it('handles GitHub API error responses cleanly', async () => {
    const mockFetch = vi.fn().mockImplementation(async () => ({
      ok: false,
      status: 403,
      text: async () => 'Resource not accessible by integration',
    })) as unknown as typeof fetch;

    const result = await postGitHubCheckRun(mockPassingReport, {
      token: 'ghp_secret123',
      sha: 'abcdef1234567890',
      repo: 'chuofringer/upheld',
      fetchFn: mockFetch,
    });

    expect(result.posted).toBe(false);
    expect(result.error).toContain('GitHub API error (403)');
  });
});
