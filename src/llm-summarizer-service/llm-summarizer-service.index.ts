/**
 * LLM Summarizer Service entry - exports public API
 */

export {
  buildSummarizationPrompt,
  callOllamaGenerate,
  summarizeTicket,
  summarizeTickets,
  loadOllamaConfig,
} from './llm-summarizer-service.utils.js';
export type {
  TicketInputForSummarization,
  OllamaConfig,
  OllamaGenerateResponse,
} from './llm-summarizer-service.types.js';
