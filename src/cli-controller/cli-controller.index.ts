/**
 * Main CLI controller - orchestrates the report generation flow
 */

import { parseCliArgs, promptConfirmation, resolveMonth, getConfirmationQuestion } from './cli-controller.utils.js';
import { runReportGeneration } from './cli-controller.run.js';

export interface CliControllerOptions {
  rawArgs: Record<string, unknown>;
}

/**
 * Main entry point for CLI - parses args, confirms month, runs report generation
 */
export async function runCliController(options: CliControllerOptions): Promise<void> {
  const cliArgs = parseCliArgs(options.rawArgs);
  const { year, month, fromDefault } = resolveMonth(cliArgs);

  if (fromDefault && !cliArgs.yes) {
    const question = getConfirmationQuestion(year, month);
    const confirmed = await promptConfirmation(question);
    if (!confirmed) {
      console.log('Report generation cancelled.');
      process.exit(0);
    }
  }

  await runReportGeneration({
    year,
    month,
    outputDir: cliArgs.outputDir,
  });
}
