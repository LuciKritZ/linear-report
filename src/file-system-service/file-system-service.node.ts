/**
 * Unit tests for file system service
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { buildOutputPaths, writeReportFile, writeReports } from './file-system-service.utils.js';

describe('buildOutputPaths', () => {
  it('builds correct path structure', () => {
    const paths = buildOutputPaths(2026, 1, './out');
    expect(paths.outputDir).toBe('./out');
    expect(paths.monthDir).toBe('01. January');
    expect(paths.technicalPath).toContain('_technical.txt');
    expect(paths.nonTechnicalPath).toContain('_non_technical.txt');
    expect(paths.technicalPath).toMatch(/\d{8}_\d{6}_\d{3}_technical\.txt$/);
  });

  it('uses default output dir when not provided', () => {
    const paths = buildOutputPaths(2026, 12);
    expect(paths.outputDir).toBe('./generated');
    expect(paths.monthDir).toBe('12. December');
  });
});

describe('writeReportFile', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'linear-test-'));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('creates directory and writes file', async () => {
    const filePath = path.join(tmpDir, 'subdir', 'report.txt');
    await writeReportFile(filePath, 'test content');
    const content = await fs.readFile(filePath, 'utf-8');
    expect(content).toBe('test content');
  });
});

describe('writeReports', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'linear-test-'));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('writes both report files', async () => {
    const paths = {
      outputDir: tmpDir,
      monthDir: '01. January',
      timestampDir: '2026-01-01 12:00',
      technicalPath: path.join(tmpDir, 'technical.txt'),
      nonTechnicalPath: path.join(tmpDir, 'non_technical.txt'),
    };
    await writeReports(paths, 'technical content', 'non-technical content');
    const tech = await fs.readFile(paths.technicalPath, 'utf-8');
    const nonTech = await fs.readFile(paths.nonTechnicalPath, 'utf-8');
    expect(tech).toBe('technical content');
    expect(nonTech).toBe('non-technical content');
  });
});
