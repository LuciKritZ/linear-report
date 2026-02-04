/**
 * Date formatting and parsing utilities
 */

import { MONTH_NAMES } from './constants.js';

export interface MonthRange {
  year: number;
  month: number;
  startDate: Date;
  endDate: Date;
}

/**
 * Parse month string (YYYY-MM or MM-YYYY) into year and month numbers
 */
export function parseMonthString(monthStr: string): { year: number; month: number } {
  const isoMatch = monthStr.match(/^(\d{4})-(0[1-9]|1[0-2])$/);
  if (isoMatch) {
    return { year: Number(isoMatch[1]), month: Number(isoMatch[2]) };
  }

  const altMatch = monthStr.match(/^(0[1-9]|1[0-2])-(\d{4})$/);
  if (altMatch) {
    return { year: Number(altMatch[2]), month: Number(altMatch[1]) };
  }

  throw new Error(`Invalid month format: ${monthStr}. Use YYYY-MM or MM-YYYY`);
}

/**
 * Get the date range for a given month (start and end of month)
 */
export function getMonthRange(year: number, month: number): MonthRange {
  const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
  const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

  return { year, month, startDate, endDate };
}

/**
 * Get previous month's year and month
 */
export function getPreviousMonth(): { year: number; month: number } {
  const now = new Date();
  const year = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
  const month = now.getMonth() === 0 ? 12 : now.getMonth();

  return { year, month };
}

/**
 * Format month for display: "02. February"
 */
export function formatMonthDisplay(_year: number, month: number): string {
  const monthName = MONTH_NAMES[month - 1];
  const monthPadded = String(month).padStart(2, '0');
  return `${monthPadded}. ${monthName}`;
}

/**
 * Format month for directory: "02. February" (same as display)
 */
export function formatMonthDirectory(year: number, month: number): string {
  return formatMonthDisplay(year, month);
}

/**
 * Format timestamp for filenames: YYYYMMDD_HHMMSS_mmm
 */
export function formatTimestamp(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const h = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  const s = String(date.getSeconds()).padStart(2, '0');
  const ms = String(date.getMilliseconds()).padStart(3, '0');

  return `${y}${m}${d}_${h}${min}${s}_${ms}`;
}

/**
 * Format date for human-readable directory: e.g., "2026-02-04 14:30"
 */
export function formatHumanReadableTimestamp(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const h = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');

  return `${y}-${m}-${d} ${h}:${min}`;
}
