/**
 * Unit tests for error utilities
 */

import { describe, it, expect } from 'vitest';
import { sanitizeErrorMessage, toUserFriendlyError, validateOutputDir } from './error-utils.js';

describe('sanitizeErrorMessage', () => {
  it('redacts Linear API key', () => {
    expect(sanitizeErrorMessage('Error: lin_api_abc123xyz')).toContain('[REDACTED]');
    expect(sanitizeErrorMessage('lin_api_abc123xyz')).not.toContain('lin_api_');
  });

  it('redacts GitHub tokens', () => {
    expect(sanitizeErrorMessage('ghp_secret123')).toContain('[REDACTED]');
  });

  it('preserves non-secret text', () => {
    expect(sanitizeErrorMessage('Connection failed')).toBe('Connection failed');
  });
});

describe('toUserFriendlyError', () => {
  it('extracts message from Error', () => {
    expect(toUserFriendlyError(new Error('Something failed'))).toBe('Something failed');
  });

  it('converts non-Error to string', () => {
    expect(toUserFriendlyError('string error')).toBe('string error');
  });
});

describe('validateOutputDir', () => {
  it('allows valid paths', () => {
    expect(() => validateOutputDir('./generated')).not.toThrow();
    expect(() => validateOutputDir('reports')).not.toThrow();
  });

  it('rejects path traversal', () => {
    expect(() => validateOutputDir('../etc')).toThrow('path traversal');
    expect(() => validateOutputDir('foo/../bar')).toThrow('path traversal');
  });
});
