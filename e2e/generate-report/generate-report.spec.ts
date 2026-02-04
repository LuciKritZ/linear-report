/**
 * E2E / Integration tests for report generation flow
 * Mocks Linear API to verify full pipeline: fetch → generate → write
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { runReportGeneration } from '@/cli-controller/cli-controller.run.js';

vi.mock('@/linear-api-service/linear-api-service.index.js', () => ({
  fetchUserTicketsForMonth: vi.fn().mockResolvedValue([
    {
      id: 'e2e-test-id',
      identifier: 'E2E-1',
      title: 'E2E Test Ticket',
      description: 'Test description for E2E',
      state: { name: 'Done', type: 'completed' },
      creator: { id: 'c1', name: 'Test User' },
      labels: [{ id: 'l1', name: 'test' }],
      createdAt: '2026-01-15T10:00:00Z',
      updatedAt: '2026-01-20T12:00:00Z',
      completedAt: null,
      activities: [{ type: 'updated', date: '2026-01-20T12:00:00Z' }],
    },
  ]),
}));

describe('generate-report E2E', () => {
  let tmpDir: string;
  const originalEnv = process.env;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'linear-e2e-'));
    process.env = { ...originalEnv, LINEAR_API_KEY: 'lin_api_e2e_test_placeholder' };
  });

  afterEach(async () => {
    process.env = originalEnv;
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('generates technical and non-technical reports in output directory', async () => {
    await runReportGeneration({
      year: 2026,
      month: 1,
      outputDir: tmpDir,
    });

    const entries = await fs.readdir(path.join(tmpDir, '01. January'));
    expect(entries.length).toBeGreaterThanOrEqual(1);

    const timestampDir = entries[0];
    const reportDir = path.join(tmpDir, '01. January', timestampDir);
    const files = await fs.readdir(reportDir);

    // Must check _non_technical first: _non_technical.txt endsWith _technical.txt
    const nonTechnicalFile = files.find((f) => f.endsWith('_non_technical.txt'));
    const technicalFile = files.find((f) =>
      f.endsWith('_technical.txt') && !f.endsWith('_non_technical.txt')
    );

    expect(technicalFile, 'technical report file should exist').toBeDefined();
    expect(nonTechnicalFile, 'non-technical report file should exist').toBeDefined();

    const technicalPath = path.join(reportDir, technicalFile!);
    const nonTechnicalPath = path.join(reportDir, nonTechnicalFile!);
    const technicalContent = await fs.readFile(technicalPath, 'utf-8');
    const nonTechnicalContent = await fs.readFile(nonTechnicalPath, 'utf-8');

    expect(technicalContent).toContain('TECHNICAL SUMMARY');
    expect(technicalContent).toContain('[E2E-1] E2E Test Ticket');
    expect(nonTechnicalContent).toContain('WORK SUMMARY');
    expect(nonTechnicalContent).toContain('• E2E Test Ticket');
  });
});
