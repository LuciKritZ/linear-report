/**
 * Unit tests for report generator
 */

import { describe, it, expect } from 'vitest';
import {
  buildReportSummary,
  generateTechnicalReport,
  generateNonTechnicalReport,
} from './report-generator.utils.js';
import type { LinearTicket } from '../linear-api-service/linear-api-service.types.js';

const mockTicket = (overrides: Partial<LinearTicket> = {}): LinearTicket => ({
  id: 'test-id',
  identifier: 'TST-1',
  title: 'Test ticket',
  description: 'Test description',
  state: { name: 'Done', type: 'completed' },
  creator: { id: 'c1', name: 'Creator' },
  labels: [{ id: 'l1', name: 'bug' }],
  createdAt: '2026-01-15T10:00:00Z',
  updatedAt: '2026-01-20T12:00:00Z',
  completedAt: null,
  activities: [{ type: 'updated', date: '2026-01-20T12:00:00Z' }],
  ...overrides,
});

describe('buildReportSummary', () => {
  it('counts tickets by status', () => {
    const tickets = [
      mockTicket({ state: { name: 'Done', type: 'completed' } }),
      mockTicket({ state: { name: 'Done', type: 'completed' } }),
      mockTicket({ state: { name: 'In Progress', type: 'started' } }),
    ];
    const summary = buildReportSummary(tickets);
    expect(summary.totalTickets).toBe(3);
    expect(summary.byStatus['Done']).toBe(2);
    expect(summary.byStatus['In Progress']).toBe(1);
  });

  it('counts activities by type', () => {
    const tickets = [
      mockTicket({ activities: [{ type: 'assigned', date: 'x' }, { type: 'updated', date: 'x' }] }),
    ];
    const summary = buildReportSummary(tickets);
    expect(summary.byActivityType['assigned']).toBe(1);
    expect(summary.byActivityType['updated']).toBe(1);
  });

  it('handles empty tickets', () => {
    const summary = buildReportSummary([]);
    expect(summary.totalTickets).toBe(0);
    expect(Object.keys(summary.byStatus)).toHaveLength(0);
  });
});

describe('generateTechnicalReport', () => {
  it('includes header and ticket details', () => {
    const data = {
      month: '01. January',
      year: 2026,
      tickets: [mockTicket()],
      summary: buildReportSummary([mockTicket()]),
    };
    const report = generateTechnicalReport(data);
    expect(report).toContain('TECHNICAL SUMMARY - 01. January 2026');
    expect(report).toContain('[TST-1] Test ticket');
    expect(report).toContain('Status: Done');
    expect(report).toContain('Labels: bug');
  });
});

describe('generateNonTechnicalReport', () => {
  it('includes header and plain-language bullets', () => {
    const data = {
      month: '01. January',
      year: 2026,
      tickets: [mockTicket()],
      summary: buildReportSummary([mockTicket()]),
    };
    const report = generateNonTechnicalReport(data);
    expect(report).toContain('WORK SUMMARY - 01. January 2026');
    expect(report).toContain('• Test ticket');
    expect(report).toContain('Test description');
  });
});
