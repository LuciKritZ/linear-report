/**
 * LLM Summarizer types and Zod schemas
 */

import { z } from 'zod';

/** Input for a single ticket to be summarized (technical content + optional PR context) */
export interface TicketInputForSummarization {
  identifier: string;
  title: string;
  description: string | null;
  labels: string[];
  prSummaries: string[];
}

/** Ollama generate API response (subset we need) */
export const ollamaGenerateResponseSchema = z.object({
  response: z.string(),
  done: z.boolean().optional(),
});

export type OllamaGenerateResponse = z.infer<typeof ollamaGenerateResponseSchema>;

/** Config for Ollama client (from env) */
export interface OllamaConfig {
  baseUrl: string;
  model: string;
  concurrency: number;
  timeoutMs: number;
}
