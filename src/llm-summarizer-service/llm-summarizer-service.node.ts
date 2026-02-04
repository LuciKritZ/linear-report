/**
 * Unit tests for LLM Summarizer service
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  buildSummarizationPrompt,
  callOllamaGenerate,
  summarizeTicket,
  summarizeTickets,
  loadOllamaConfig,
} from './llm-summarizer-service.utils.js';
import type { TicketInputForSummarization, OllamaConfig } from './llm-summarizer-service.types.js';

const mockTicket = (overrides: Partial<TicketInputForSummarization> = {}): TicketInputForSummarization => ({
  identifier: 'TST-1',
  title: 'Fix login bug',
  description: 'Users cannot log in when 2FA is enabled.',
  labels: ['bug', 'auth'],
  prSummaries: [],
  ...overrides,
});

describe('buildSummarizationPrompt', () => {
  it('includes ticket identifier, title, and description', () => {
    const ticket = mockTicket();
    const prompt = buildSummarizationPrompt(ticket);
    expect(prompt).toContain('Ticket [TST-1]: Fix login bug');
    expect(prompt).toContain('Description: Users cannot log in when 2FA is enabled.');
    expect(prompt).toContain('Labels: bug, auth');
    expect(prompt).toContain('2–3 short sentences');
    expect(prompt).toContain('plain language');
  });

  it('includes PR summaries when present', () => {
    const ticket = mockTicket({
      prSummaries: ['PR #42: Fixed 2FA validation logic', 'PR #43: Added fallback flow'],
    });
    const prompt = buildSummarizationPrompt(ticket);
    expect(prompt).toContain('Related PR(s):');
    expect(prompt).toContain('- PR #42: Fixed 2FA validation logic');
    expect(prompt).toContain('- PR #43: Added fallback flow');
  });

  it('handles null description', () => {
    const ticket = mockTicket({ description: null });
    const prompt = buildSummarizationPrompt(ticket);
    expect(prompt).toContain('Ticket [TST-1]: Fix login bug');
    expect(prompt).not.toContain('Description:');
  });

  it('handles empty labels', () => {
    const ticket = mockTicket({ labels: [] });
    const prompt = buildSummarizationPrompt(ticket);
    expect(prompt).not.toContain('Labels:');
  });
});

describe('callOllamaGenerate', () => {
  const config: OllamaConfig = {
    baseUrl: 'http://localhost:11434',
    model: 'qwen2.5:1.5b',
    concurrency: 1,
    timeoutMs: 5000,
  };

  const mockFetch = vi.fn();

  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('returns response text on success', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          response: '  Fixed the login flow for 2FA users.  ',
          done: true,
        }),
    });

    const result = await callOllamaGenerate('Summarize this.', config, mockFetch);

    expect(result).toBe('Fixed the login flow for 2FA users.');
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:11434/api/generate',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'qwen2.5:1.5b',
          prompt: 'Summarize this.',
          stream: false,
        }),
      })
    );
  });

  it('strips trailing base URL slash', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ response: 'OK', done: true }),
    });

    await callOllamaGenerate('x', { ...config, baseUrl: 'http://localhost:11434/' }, mockFetch);

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:11434/api/generate',
      expect.any(Object)
    );
  });

  it('throws on non-ok response', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 500, statusText: 'Internal Server Error' });

    await expect(callOllamaGenerate('x', config, mockFetch)).rejects.toThrow(
      'Ollama API error: 500 Internal Server Error'
    );
  });

  it('throws on invalid response shape', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ noResponse: 'invalid' }),
    });

    await expect(callOllamaGenerate('x', config, mockFetch)).rejects.toThrow(
      'Ollama API returned invalid response'
    );
  });

  it('throws on fetch rejection', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));

    await expect(callOllamaGenerate('x', config, mockFetch)).rejects.toThrow('Network error');
  });
});

describe('summarizeTicket', () => {
  const config: OllamaConfig = {
    baseUrl: 'http://localhost:11434',
    model: 'qwen2.5:1.5b',
    concurrency: 1,
    timeoutMs: 5000,
  };

  const mockFetch = vi.fn();

  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('builds prompt and returns Ollama response', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          response: 'Resolved login issues for users with two-factor authentication enabled.',
          done: true,
        }),
    });

    const result = await summarizeTicket(mockTicket(), config, mockFetch);

    expect(result).toBe('Resolved login issues for users with two-factor authentication enabled.');
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.prompt).toContain('Ticket [TST-1]: Fix login bug');
  });
});

describe('summarizeTickets', () => {
  const config: OllamaConfig = {
    baseUrl: 'http://localhost:11434',
    model: 'qwen2.5:1.5b',
    concurrency: 2,
    timeoutMs: 5000,
  };

  const mockFetch = vi.fn();

  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('returns summaries in same order as input', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ response: 'Summary 1', done: true }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ response: 'Summary 2', done: true }),
      });

    const tickets = [mockTicket({ identifier: 'A' }), mockTicket({ identifier: 'B' })];
    const result = await summarizeTickets(tickets, config, mockFetch);

    expect(result).toEqual(['Summary 1', 'Summary 2']);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('returns empty array for empty input', async () => {
    const result = await summarizeTickets([], config, mockFetch);
    expect(result).toEqual([]);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('propagates error when one ticket fails', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ response: 'OK', done: true }),
      })
      .mockResolvedValueOnce({ ok: false, status: 500 });

    const tickets = [mockTicket({ identifier: 'A' }), mockTicket({ identifier: 'B' })];

    await expect(summarizeTickets(tickets, config, mockFetch)).rejects.toThrow('Ollama API error');
  });
});

describe('loadOllamaConfig', () => {
  const envKeys = ['OLLAMA_BASE_URL', 'OLLAMA_SUMMARY_MODEL', 'OLLAMA_CONCURRENCY'] as const;
  const saved: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const key of envKeys) {
      saved[key] = process.env[key];
      delete process.env[key];
    }
  });

  afterEach(() => {
    for (const key of envKeys) {
      if (saved[key] !== undefined) {
        process.env[key] = saved[key];
      } else {
        delete process.env[key];
      }
    }
  });

  it('returns defaults when env not set', () => {
    const config = loadOllamaConfig();
    expect(config.baseUrl).toBe('http://localhost:11434');
    expect(config.model).toBe('qwen2.5:1.5b');
    expect(config.concurrency).toBe(1);
    expect(config.timeoutMs).toBe(60_000);
  });

  it('reads from env when set', () => {
    process.env.OLLAMA_BASE_URL = 'http://custom:11434';
    process.env.OLLAMA_SUMMARY_MODEL = 'llama3';
    process.env.OLLAMA_CONCURRENCY = '3';

    const config = loadOllamaConfig();

    expect(config.baseUrl).toBe('http://custom:11434');
    expect(config.model).toBe('llama3');
    expect(config.concurrency).toBe(3);
  });

  it('clamps concurrency to at least 1', () => {
    process.env.OLLAMA_CONCURRENCY = '0';

    const config = loadOllamaConfig();

    expect(config.concurrency).toBe(1);
  });

  it('handles invalid concurrency', () => {
    process.env.OLLAMA_CONCURRENCY = 'abc';

    const config = loadOllamaConfig();

    expect(config.concurrency).toBe(1); // NaN from parseInt, we use default
  });
});
