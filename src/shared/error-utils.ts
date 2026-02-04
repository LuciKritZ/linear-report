/**
 * Error handling utilities - sanitize errors, never expose secrets
 */

const SECRET_PATTERNS = [
  /lin_api_[a-zA-Z0-9]+/gi,
  /ghp_[a-zA-Z0-9]+/gi,
  /gho_[a-zA-Z0-9]+/gi,
  /[a-f0-9]{32,}/gi, // long hex strings (tokens)
];

/**
 * Sanitize error message - remove API keys and tokens
 */
export function sanitizeErrorMessage(message: string): string {
  let sanitized = message;
  for (const pattern of SECRET_PATTERNS) {
    sanitized = sanitized.replace(pattern, '[REDACTED]');
  }
  return sanitized;
}

/**
 * Convert unknown error to user-friendly message
 */
export function toUserFriendlyError(err: unknown): string {
  if (err instanceof Error) {
    return sanitizeErrorMessage(err.message);
  }
  return sanitizeErrorMessage(String(err));
}

/**
 * Validate output directory - prevent path traversal
 */
export function validateOutputDir(dir: string): void {
  const normalized = dir.replace(/\\/g, '/');
  if (normalized.includes('..')) {
    throw new Error('Output directory cannot contain ".." (path traversal)');
  }
  if (normalized.startsWith('/') && !normalized.startsWith('//')) {
    // Allow absolute paths on Unix
    return;
  }
  // Relative paths are fine
}
