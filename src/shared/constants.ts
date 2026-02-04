/**
 * Application-wide constants
 */

export const APP_NAME = 'linear-ticket-consolidation-cli';

export const DEFAULT_OUTPUT_DIR = './generated';

export const MONTH_FORMATS = {
  /** YYYY-MM (e.g., 2026-01) */
  ISO: /^\d{4}-(0[1-9]|1[0-2])$/,
  /** MM-YYYY (e.g., 01-2026) */
  ALT: /^(0[1-9]|1[0-2])-\d{4}$/,
} as const;

export const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;
