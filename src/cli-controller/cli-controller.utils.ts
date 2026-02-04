/**
 * CLI parsing and confirmation logic
 */

import * as readline from 'readline';
import { cliArgsSchema, confirmSchema, type CLIArgs } from './cli-controller.types.js';
import { getPreviousMonth } from '../shared/date-utils.js';
import { formatMonthDisplay } from '../shared/date-utils.js';

/**
 * Parse and validate raw CLI arguments into typed CLIArgs
 */
export function parseCliArgs(raw: Record<string, unknown>): CLIArgs {
  return cliArgsSchema.parse(raw);
}

/**
 * Prompt user for confirmation (Y/n)
 */
export function promptConfirmation(question: string): Promise<boolean> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

    rl.question(`${question} (Y/n): `, (answer) => {
      rl.close();

      const result = confirmSchema.safeParse(answer);
      if (!result.success) {
        resolve(false);
        return;
      }

      const val = result.data;
      resolve(val === '' || val === 'y' || val === 'yes');
    });
  });
}

/**
 * Resolve month from CLI args - either from arg or previous month
 */
export function resolveMonth(cliArgs: CLIArgs): { year: number; month: number; fromDefault: boolean } {
  if (cliArgs.month) {
    const isoMatch = cliArgs.month.match(/^(\d{4})-(0[1-9]|1[0-2])$/);
    if (isoMatch) {
      return {
        year: Number(isoMatch[1]),
        month: Number(isoMatch[2]),
        fromDefault: false,
      };
    }

    const altMatch = cliArgs.month.match(/^(0[1-9]|1[0-2])-(\d{4})$/);
    if (altMatch) {
      return {
        year: Number(altMatch[2]),
        month: Number(altMatch[1]),
        fromDefault: false,
      };
    }
  }

  const prev = getPreviousMonth();
  return { ...prev, fromDefault: true };
}

/**
 * Get confirmation question for default month
 */
export function getConfirmationQuestion(year: number, month: number): string {
  const monthDisplay = formatMonthDisplay(year, month);
  return `Generate report for ${monthDisplay} ${year}?`;
}
