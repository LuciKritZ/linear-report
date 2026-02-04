/**
 * Unit tests for GitHub API service
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  extractGitHubPrUrls,
  fetchPrDetails,
  fetchPrDetailsFromText,
} from './github-api-service.utils.js';

describe('extractGitHubPrUrls', () => {
  it('extracts PR URL from text', () => {
    const text = 'See https://github.com/owner/repo/pull/42 for details';
    const urls = extractGitHubPrUrls(text);
    expect(urls).toHaveLength(1);
    expect(urls[0]).toEqual({ owner: 'owner', repo: 'repo', number: 42 });
  });

  it('extracts multiple unique PRs', () => {
    const text = `
      PR1: https://github.com/foo/bar/pull/1
      PR2: https://github.com/baz/qux/pull/2
    `;
    const urls = extractGitHubPrUrls(text);
    expect(urls).toHaveLength(2);
    expect(urls[0]).toEqual({ owner: 'foo', repo: 'bar', number: 1 });
    expect(urls[1]).toEqual({ owner: 'baz', repo: 'qux', number: 2 });
  });

  it('deduplicates same PR', () => {
    const text =
      'https://github.com/owner/repo/pull/1 and again https://github.com/owner/repo/pull/1';
    const urls = extractGitHubPrUrls(text);
    expect(urls).toHaveLength(1);
    expect(urls[0]).toEqual({ owner: 'owner', repo: 'repo', number: 1 });
  });

  it('handles URLs with trailing slash or query', () => {
    expect(extractGitHubPrUrls('https://github.com/a/b/pull/1/')).toHaveLength(1);
    expect(extractGitHubPrUrls('https://github.com/a/b/pull/1?foo=bar')).toHaveLength(1);
    expect(extractGitHubPrUrls('https://github.com/a/b/pull/1)')).toHaveLength(1);
  });

  it('handles www subdomain', () => {
    const urls = extractGitHubPrUrls('https://www.github.com/owner/repo/pull/99');
    expect(urls).toHaveLength(1);
    expect(urls[0]).toEqual({ owner: 'owner', repo: 'repo', number: 99 });
  });

  it('handles repo names with dots and hyphens', () => {
    const urls = extractGitHubPrUrls('https://github.com/org/my-repo.name/pull/5');
    expect(urls).toHaveLength(1);
    expect(urls[0]).toEqual({ owner: 'org', repo: 'my-repo.name', number: 5 });
  });

  it('returns empty for null or undefined', () => {
    expect(extractGitHubPrUrls(null)).toEqual([]);
    expect(extractGitHubPrUrls(undefined)).toEqual([]);
  });

  it('returns empty for empty string', () => {
    expect(extractGitHubPrUrls('')).toEqual([]);
  });

  it('ignores non-github.com URLs', () => {
    const urls = extractGitHubPrUrls('https://gitlab.com/owner/repo/-/merge_requests/1');
    expect(urls).toHaveLength(0);
  });
});

describe('fetchPrDetails', () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('returns PR details on success', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          title: 'Fix bug',
          body: 'Description here',
        }),
    });

    const result = await fetchPrDetails(
      { owner: 'owner', repo: 'repo', number: 1 },
      'ghp_test',
      mockFetch
    );

    expect(result).toEqual({
      owner: 'owner',
      repo: 'repo',
      number: 1,
      title: 'Fix bug',
      body: 'Description here',
    });
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.github.com/repos/owner/repo/pulls/1',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          Authorization: 'Bearer ghp_test',
        }),
      })
    );
  });

  it('returns null when API key is missing and request fails', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 403 });

    const result = await fetchPrDetails(
      { owner: 'owner', repo: 'repo', number: 1 },
      undefined,
      mockFetch
    );

    expect(result).toBeNull();
  });

  it('returns null on 404', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 404 });

    const result = await fetchPrDetails(
      { owner: 'owner', repo: 'repo', number: 999 },
      'ghp_test',
      mockFetch
    );

    expect(result).toBeNull();
  });

  it('returns null on invalid JSON response', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ invalid: 'shape' }),
    });

    const result = await fetchPrDetails(
      { owner: 'owner', repo: 'repo', number: 1 },
      'ghp_test',
      mockFetch
    );

    expect(result).toBeNull();
  });

  it('handles body as null', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ title: 'No body', body: null }),
    });

    const result = await fetchPrDetails(
      { owner: 'owner', repo: 'repo', number: 1 },
      'ghp_test',
      mockFetch
    );

    expect(result).toEqual({
      owner: 'owner',
      repo: 'repo',
      number: 1,
      title: 'No body',
      body: null,
    });
  });

  it('returns null on fetch throw', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));

    const result = await fetchPrDetails(
      { owner: 'owner', repo: 'repo', number: 1 },
      'ghp_test',
      mockFetch
    );

    expect(result).toBeNull();
  });
});

describe('fetchPrDetailsFromText', () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('extracts URLs from multiple text blocks and fetches', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ title: 'PR 1', body: 'Body 1' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ title: 'PR 2', body: 'Body 2' }),
      });

    const result = await fetchPrDetailsFromText(
      [
        'Description: https://github.com/a/b/pull/1',
        'Comment: https://github.com/x/y/pull/2',
      ],
      'ghp_test',
      mockFetch
    );

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ owner: 'a', repo: 'b', number: 1, title: 'PR 1' });
    expect(result[1]).toMatchObject({ owner: 'x', repo: 'y', number: 2, title: 'PR 2' });
  });

  it('deduplicates and skips failed fetches', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ title: 'OK', body: null }) })
      .mockResolvedValueOnce({ ok: false });

    const result = await fetchPrDetailsFromText(
      [
        'https://github.com/a/b/pull/1',
        'https://github.com/a/b/pull/1',
        'https://github.com/x/y/pull/2',
      ],
      'ghp_test',
      mockFetch
    );

    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('OK');
    expect(mockFetch).toHaveBeenCalledTimes(2); // 2 unique URLs
  });

  it('returns empty when no URLs in text', async () => {
    const result = await fetchPrDetailsFromText(['no urls here', null, ''], 'ghp_test', mockFetch);
    expect(result).toEqual([]);
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
