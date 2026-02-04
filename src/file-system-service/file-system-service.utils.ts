/**
 * File I/O operations for report output
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { DEFAULT_OUTPUT_DIR } from '../shared/constants.js';
import {
  formatMonthDirectory,
  formatTimestamp,
  formatHumanReadableTimestamp,
} from '../shared/date-utils.js';
import type { OutputPath } from './file-system-service.types.js';

/**
 * Build output paths for reports
 */
export function buildOutputPaths(
  year: number,
  month: number,
  outputDir: string = DEFAULT_OUTPUT_DIR
): OutputPath {
  const monthDir = formatMonthDirectory(year, month);
  const now = new Date();
  const timestampDir = formatHumanReadableTimestamp(now);
  const timestamp = formatTimestamp(now);

  const basePath = path.join(outputDir, monthDir, timestampDir);
  const technicalPath = path.join(basePath, `${timestamp}_technical.txt`);
  const nonTechnicalPath = path.join(basePath, `${timestamp}_non_technical.txt`);

  return {
    outputDir,
    monthDir,
    timestampDir,
    technicalPath,
    nonTechnicalPath,
  };
}

/**
 * Ensure directory exists and write file
 */
export async function writeReportFile(filePath: string, content: string): Promise<void> {
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(filePath, content, 'utf-8');
}

/**
 * Write both technical and non-technical reports
 */
export async function writeReports(
  paths: OutputPath,
  technicalContent: string,
  nonTechnicalContent: string
): Promise<void> {
  await Promise.all([
    writeReportFile(paths.technicalPath, technicalContent),
    writeReportFile(paths.nonTechnicalPath, nonTechnicalContent),
  ]);
}
