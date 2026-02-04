/**
 * Unit tests for CLI controller
 */

import { describe, it, expect } from 'vitest';
import { parseCliArgs, resolveMonth, getConfirmationQuestion } from './cli-controller.utils.js';

describe('parseCliArgs', () => {
  it('parses valid month YYYY-MM', () => {
    expect(parseCliArgs({ month: '2026-01' })).toEqual({ month: '2026-01' });
  });

  it('parses valid month MM-YYYY', () => {
    expect(parseCliArgs({ month: '01-2026' })).toEqual({ month: '01-2026' });
  });

  it('parses outputDir', () => {
    expect(parseCliArgs({ outputDir: './reports' })).toMatchObject({ outputDir: './reports' });
  });

  it('parses yes flag', () => {
    expect(parseCliArgs({ yes: true })).toMatchObject({ yes: true });
  });

  it('throws for invalid month format', () => {
    expect(() => parseCliArgs({ month: 'invalid' })).toThrow();
    expect(() => parseCliArgs({ month: '2026/01' })).toThrow();
  });
});

describe('resolveMonth', () => {
  it('returns month from arg when provided', () => {
    const result = resolveMonth({ month: '2026-01' });
    expect(result).toEqual({ year: 2026, month: 1, fromDefault: false });
  });

  it('returns fromDefault true when no month arg', () => {
    const result = resolveMonth({});
    expect(result.fromDefault).toBe(true);
    expect(result.year).toBeGreaterThan(0);
    expect(result.month).toBeGreaterThanOrEqual(1);
    expect(result.month).toBeLessThanOrEqual(12);
  });
});

describe('getConfirmationQuestion', () => {
  it('formats question correctly', () => {
    expect(getConfirmationQuestion(2026, 1)).toBe('Generate report for 01. January 2026?');
  });
});
