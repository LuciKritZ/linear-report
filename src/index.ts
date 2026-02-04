#!/usr/bin/env node
/**
 * Linear Ticket Consolidation CLI - Entry point
 */

import { Command } from 'commander';
import { runCliController } from './cli-controller/cli-controller.index.js';

const program = new Command();

program
  .name('linear-report')
  .description(
    'Generate monthly work summary reports from Linear tickets. Fetches tickets you worked on (started, created, or commented) and outputs technical and non-technical summaries.'
  )
  .version('1.0.0')
  .option(
    '-m, --month <YYYY-MM|MM-YYYY>',
    'Month to generate report for (e.g., 2026-01 or 01-2026). Omit to use previous month.'
  )
  .option('-o, --output <dir>', 'Output directory for reports', './generated')
  .option('-y, --yes', 'Skip confirmation prompt when using default (previous) month')
  .addHelpText(
    'after',
    `
Examples:
  $ linear-report                    Prompt for previous month
  $ linear-report --yes              Previous month, no prompt
  $ linear-report --month 2026-01    Specific month
  $ linear-report -m 01-2026 -o ./reports  Custom output dir

Environment:
  LINEAR_API_KEY          Required. Get from Linear Settings → API
  LINEAR_ASSIGNEE_EMAIL    Optional. Required when using a bot/integration API key
`
  )
  .action(async (options: { month?: string; output?: string; yes?: boolean }) => {
    try {
      await runCliController({
        rawArgs: {
          month: options.month,
          outputDir: options.output,
          yes: options.yes,
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`Error: ${message}`);
      process.exit(1);
    }
  });

program.parse();
