/**
 * Ollama HTTP client, prompt building, and per-ticket summarization
 */

import pLimit from 'p-limit';
import { ollamaGenerateResponseSchema } from './llm-summarizer-service.types.js';
import type {
  TicketInputForSummarization,
  OllamaConfig,
} from './llm-summarizer-service.types.js';

/** Default timeout per ticket (NFR-AI-3: 60s) */
const DEFAULT_TIMEOUT_MS = 60_000;

/**
 * Build per-ticket prompt for 2–3 line plain-language summary.
 * Input: technical ticket content + PR summaries (if available).
 */
export function buildSummarizationPrompt(ticket: TicketInputForSummarization): string {
  const parts: string[] = [];

  parts.push(`Ticket [${ticket.identifier}]: ${ticket.title}`);
  if (ticket.description) {
    parts.push(`Description: ${ticket.description}`);
  }
  if (ticket.labels.length > 0) {
    parts.push(`Labels: ${ticket.labels.join(', ')}`);
  }
  if (ticket.prSummaries.length > 0) {
    parts.push('Related PR(s):');
    parts.push(ticket.prSummaries.map((s) => `- ${s}`).join('\n'));
  }

  const context = parts.join('\n');
  return `Summarize this technical ticket in 2–3 short sentences for a non-technical stakeholder. Use plain language, focus on business outcomes and user impact. Avoid jargon.

${context}

Summary:`;
}

/**
 * Call Ollama /api/generate endpoint.
 * Throws on network error, timeout, or invalid response.
 * Never logs prompt/response content (NFR-AI-1).
 */
export async function callOllamaGenerate(
  prompt: string,
  config: OllamaConfig,
  fetchFn: typeof fetch = fetch
): Promise<string> {
  const url = `${config.baseUrl.replace(/\/$/, '')}/api/generate`;
  const timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  const res = await fetchFn(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: config.model,
      prompt,
      stream: false,
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!res.ok) {
    throw new Error(`Ollama API error: ${res.status} ${res.statusText}`);
  }

  const json = await res.json();
  const parsed = ollamaGenerateResponseSchema.safeParse(json);
  if (!parsed.success) {
    throw new Error('Ollama API returned invalid response');
  }

  return parsed.data.response.trim();
}

/**
 * Summarize a single ticket via Ollama.
 */
export async function summarizeTicket(
  ticket: TicketInputForSummarization,
  config: OllamaConfig,
  fetchFn: typeof fetch = fetch
): Promise<string> {
  const prompt = buildSummarizationPrompt(ticket);
  return callOllamaGenerate(prompt, config, fetchFn);
}

/**
 * Summarize multiple tickets with concurrency control.
 * Returns array of summaries in same order as input.
 * Throws if any ticket fails (caller handles fallback to template).
 */
export async function summarizeTickets(
  tickets: TicketInputForSummarization[],
  config: OllamaConfig,
  fetchFn: typeof fetch = fetch
): Promise<string[]> {
  const limit = pLimit(config.concurrency);
  const tasks = tickets.map((ticket) =>
    limit(() => summarizeTicket(ticket, config, fetchFn))
  );
  return Promise.all(tasks);
}

/**
 * Load Ollama config from environment variables.
 */
export function loadOllamaConfig(): OllamaConfig {
  const baseUrl = process.env.OLLAMA_BASE_URL?.trim() || 'http://localhost:11434';
  const model = process.env.OLLAMA_SUMMARY_MODEL?.trim() || 'qwen2.5:1.5b';
  const concurrencyRaw = process.env.OLLAMA_CONCURRENCY?.trim();
  const parsed = concurrencyRaw ? parseInt(concurrencyRaw, 10) : NaN;
  const concurrency = Number.isNaN(parsed) || parsed < 1 ? 1 : parsed;

  return {
    baseUrl,
    model,
    concurrency,
    timeoutMs: DEFAULT_TIMEOUT_MS,
  };
}
