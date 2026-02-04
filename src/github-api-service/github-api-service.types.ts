/**
 * GitHub API types and Zod schemas
 */

import { z } from 'zod';

/** Parsed GitHub PR URL components */
export interface GitHubPrUrl {
  owner: string;
  repo: string;
  number: number;
}

/** GitHub API pull request response (subset we need) */
export const githubPrResponseSchema = z.object({
  title: z.string(),
  body: z.string().nullable(),
});

export type GitHubPrResponse = z.infer<typeof githubPrResponseSchema>;

/** Fetched PR details for use in summarization */
export interface PrDetails {
  owner: string;
  repo: string;
  number: number;
  title: string;
  body: string | null;
}
