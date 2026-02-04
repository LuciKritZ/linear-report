/**
 * Report generation orchestration - fetches data and writes reports
 */

import { config } from 'dotenv';
import { fetchUserTicketsForMonth } from '../linear-api-service/linear-api-service.index.js';
import {
  buildReportSummary,
  generateTechnicalReport,
  generateNonTechnicalReport,
} from '../report-generator/report-generator.index.js';
import { buildOutputPaths, writeReports } from '../file-system-service/file-system-service.index.js';
import { formatMonthDisplay } from '../shared/date-utils.js';
import { DEFAULT_OUTPUT_DIR } from '../shared/constants.js';
import { validateOutputDir, toUserFriendlyError } from '../shared/error-utils.js';

config();

export interface RunReportOptions {
  year: number;
  month: number;
  outputDir?: string;
}

/**
 * Run the full report generation flow
 */
export async function runReportGeneration(options: RunReportOptions): Promise<void> {
  const apiKey = process.env.LINEAR_API_KEY;
  if (!apiKey || apiKey.trim() === '') {
    throw new Error(
      'LINEAR_API_KEY is not set. Add it to your .env file (see .env.example).'
    );
  }

  const { year, month, outputDir = DEFAULT_OUTPUT_DIR } = options;
  validateOutputDir(outputDir);

  const assigneeEmail = process.env.LINEAR_ASSIGNEE_EMAIL?.trim();
  const monthLabel = formatMonthDisplay(year, month);

  console.log(`Fetching tickets for ${monthLabel} ${year}...`);
  let tickets;
  try {
    tickets = await fetchUserTicketsForMonth(apiKey, year, month, assigneeEmail || undefined);
  } catch (err) {
    throw new Error(`Failed to fetch Linear tickets: ${toUserFriendlyError(err)}`);
  }

  if (tickets.length === 0) {
    console.log('No tickets found for this month.');
    return;
  }

  console.log(`✓ Found ${tickets.length} ticket(s)`);
  console.log('Generating reports...');

  const summary = buildReportSummary(tickets);
  const reportData = {
    month: formatMonthDisplay(year, month),
    year,
    tickets,
    summary,
  };

  const technicalContent = generateTechnicalReport(reportData);
  const nonTechnicalContent = generateNonTechnicalReport(reportData);

  const paths = buildOutputPaths(year, month, outputDir);
  try {
    await writeReports(paths, technicalContent, nonTechnicalContent);
  } catch (err) {
    throw new Error(`Failed to write reports: ${toUserFriendlyError(err)}`);
  }

  console.log('✓ Reports saved to:');
  console.log(`  ${paths.technicalPath}`);
  console.log(`  ${paths.nonTechnicalPath}`);
}
