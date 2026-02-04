/**
 * Unit tests for date-utils
 */

import { describe, it, expect } from 'vitest';
import {
  parseMonthString,
  getMonthRange,
  getPreviousMonth,
  formatMonthDisplay,
  formatTimestamp,
  formatHumanReadableTimestamp,
} from './date-utils.js';

describe('parseMonthString', () => {
  it('parses YYYY-MM format', () => {
    expect(parseMonthString('2026-01')).toEqual({ year: 2026, month: 1 });
    expect(parseMonthString('2025-12')).toEqual({ year: 2025, month: 12 });
  });

  it('parses MM-YYYY format', () => {
    expect(parseMonthString('01-2026')).toEqual({ year: 2026, month: 1 });
    expect(parseMonthString('12-2025')).toEqual({ year: 2025, month: 12 });
  });

  it('throws for invalid format', () => {
    expect(() => parseMonthString('invalid')).toThrow('Invalid month format');
  });
});

describe('getMonthRange', () => {
  it('returns correct start and end for a month', () => {
    const range = getMonthRange(2026, 1);
    expect(range.year).toBe(2026);
    expect(range.month).toBe(1);
    expect(range.startDate.getUTCDate()).toBe(1);
    expect(range.startDate.getUTCMonth()).toBe(0);
    expect(range.endDate.getUTCDate()).toBe(31);
    expect(range.endDate.getUTCMonth()).toBe(0);
  });
});

describe('formatMonthDisplay', () => {
  it('formats month correctly', () => {
    expect(formatMonthDisplay(2026, 1)).toBe('01. January');
    expect(formatMonthDisplay(2026, 12)).toBe('12. December');
  });
});

describe('formatTimestamp', () => {
  it('produces YYYYMMDD_HHMMSS_mmm format', () => {
    const ts = formatTimestamp(new Date('2026-02-04T14:30:22.123Z'));
    expect(ts).toMatch(/^\d{8}_\d{6}_\d{3}$/);
    expect(ts.startsWith('20260204')).toBe(true);
  });
});
