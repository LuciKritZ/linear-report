/**
 * GitHub PR URL parsing and API fetch logic
 */

import { githubPrResponseSchema } from './github-api-service.types.js';
import type { GitHubPrUrl, PrDetails } from './github-api-service.types.js';

/** Regex for github.com/{owner}/{repo}/pull/{number} - allow optional trailing slash or query */
const GITHUB_PR_URL_REGEX =
  /https?:\/\/(?:www\.)?github\.com\/([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)\/pull\/(\d+)(?:\/|\?|$|\)|\s)/g;

/**
 * Extract unique GitHub PR URLs from text (description, comments, etc.)
 * Only allows github.com domain (NFR-AI-2 allowlist)
 */
export function extractGitHubPrUrls(text: string | null | undefined): GitHubPrUrl[] {
  if (!text || typeof text !== 'string') return [];

  const seen = new Set<string>();
  const result: GitHubPrUrl[] = [];
  let match: RegExpExecArray | null;

  const regex = new RegExp(GITHUB_PR_URL_REGEX.source, 'g');
  while ((match = regex.exec(text)) !== null) {
    const [, owner, repo, numStr] = match;
    if (!owner || !repo || !numStr) continue;
    const key = `${owner}/${repo}#${numStr}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push({ owner, repo, number: parseInt(numStr, 10) });
  }
  return result;
}

/** Rate limit: min delay between requests (ms). Unauthenticated: 60/min ≈ 1/s */
const RATE_LIMIT_DELAY_MS = 1100;
let lastRequestTime = 0;

async function rateLimitDelay(hasToken: boolean): Promise<void> {
  if (hasToken) return; // 5000/hour with token - no delay needed for typical usage
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < RATE_LIMIT_DELAY_MS) {
    await new Promise((r) => setTimeout(r, RATE_LIMIT_DELAY_MS - elapsed));
  }
  lastRequestTime = Date.now();
}

/**
 * Fetch PR title and body from GitHub API.
 * Gracefully returns null on missing key, API errors, or parse failure (FR-AI-1.3).
 * Never logs GITHUB_API_KEY (NFR-AI-1).
 */
export async function fetchPrDetails(
  url: GitHubPrUrl,
  apiKey: string | undefined,
  fetchFn: typeof fetch = fetch
): Promise<PrDetails | null> {
  await rateLimitDelay(!!apiKey?.trim());

  const { owner, repo, number } = url;
  const baseUrl = `https://api.github.com/repos/${owner}/${repo}/pulls/${number}`;

  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  if (apiKey?.trim()) {
    headers['Authorization'] = `Bearer ${apiKey.trim()}`;
  }

  try {
    const res = await fetchFn(baseUrl, {
      method: 'GET',
      headers,
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      // 404, 403, rate limit, etc. - proceed without PR content
      return null;
    }

    const json = await res.json();
    const parsed = githubPrResponseSchema.safeParse(json);
    if (!parsed.success) return null;

    return {
      owner,
      repo,
      number,
      title: parsed.data.title,
      body: parsed.data.body,
    };
  } catch {
    return null;
  }
}

/**
 * Fetch PR details for all unique URLs found in text blocks.
 * Deduplicates by owner/repo/number and skips failed fetches.
 */
export async function fetchPrDetailsFromText(
  textBlocks: (string | null | undefined)[],
  apiKey: string | undefined,
  fetchFn: typeof fetch = fetch
): Promise<PrDetails[]> {
  const urls = textBlocks.flatMap((t) => extractGitHubPrUrls(t));
  const seen = new Set<string>();
  const unique: GitHubPrUrl[] = [];
  for (const u of urls) {
    const key = `${u.owner}/${u.repo}#${u.number}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(u);
  }

  const results: PrDetails[] = [];
  for (const url of unique) {
    const details = await fetchPrDetails(url, apiKey, fetchFn);
    if (details) results.push(details);
  }
  return results;
}
