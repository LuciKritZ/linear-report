/**
 * Report formatting logic - technical and non-technical summaries
 */

import type { ReportData } from './report-generator.types.js';
import type { LinearTicket } from '../linear-api-service/linear-api-service.types.js';

/**
 * Build summary statistics from tickets
 */
export function buildReportSummary(tickets: LinearTicket[]): ReportData['summary'] {
  const byStatus: Record<string, number> = {};
  const byActivityType: Record<string, number> = {};

  for (const ticket of tickets) {
    byStatus[ticket.state.name] = (byStatus[ticket.state.name] ?? 0) + 1;
    for (const activity of ticket.activities) {
      byActivityType[activity.type] = (byActivityType[activity.type] ?? 0) + 1;
    }
  }

  return {
    totalTickets: tickets.length,
    byStatus,
    byActivityType,
  };
}

/**
 * Format a single ticket for technical summary
 */
function formatTicketTechnical(ticket: LinearTicket): string {
  const lines: string[] = [];
  const idDisplay = ticket.identifier ?? ticket.id;
  lines.push(`[${idDisplay}] ${ticket.title}`);
  lines.push(`  Status: ${ticket.state.name} (${ticket.state.type})`);
  if (ticket.description) {
    lines.push(`  Description: ${ticket.description.replace(/\n/g, ' ').slice(0, 200)}${ticket.description.length > 200 ? '...' : ''}`);
  }
  if (ticket.labels.length > 0) {
    lines.push(`  Labels: ${ticket.labels.map((l) => l.name).join(', ')}`);
  }
  if (ticket.assignee?.name) {
    lines.push(`  Assignee: ${ticket.assignee.name}${ticket.assignee.email ? ` (${ticket.assignee.email})` : ''}`);
  }
  lines.push(`  Updated: ${ticket.updatedAt}`);
  lines.push('');
  return lines.join('\n');
}

/**
 * Format a single ticket for non-technical summary
 */
function formatTicketNonTechnical(ticket: LinearTicket): string {
  const lines: string[] = [];
  lines.push(`• ${ticket.title}`);
  if (ticket.description) {
    const plainDesc = ticket.description
      .replace(/#{1,6}\s/g, '')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/\n/g, ' ')
      .slice(0, 150);
    if (plainDesc) {
      lines.push(`  ${plainDesc}${ticket.description.length > 150 ? '...' : ''}`);
    }
  }
  lines.push(`  Status: ${ticket.state.name}`);
  lines.push('');
  return lines.join('\n');
}

/**
 * Generate technical summary report content
 */
export function generateTechnicalReport(data: ReportData): string {
  const lines: string[] = [];
  lines.push(`TECHNICAL SUMMARY - ${data.month} ${data.year}`);
  lines.push('='.repeat(50));
  lines.push('');
  lines.push(`Total tickets: ${data.summary.totalTickets}`);
  lines.push(`By status: ${Object.entries(data.summary.byStatus).map(([k, v]) => `${k}: ${v}`).join(', ')}`);
  lines.push(`By activity: ${Object.entries(data.summary.byActivityType).map(([k, v]) => `${k}: ${v}`).join(', ')}`);
  lines.push('');
  lines.push('--- TICKETS ---');
  lines.push('');

  for (const ticket of data.tickets) {
    lines.push(formatTicketTechnical(ticket));
  }

  return lines.join('\n');
}

/**
 * Generate non-technical summary report content
 */
export function generateNonTechnicalReport(data: ReportData): string {
  const lines: string[] = [];
  lines.push(`WORK SUMMARY - ${data.month} ${data.year}`);
  lines.push('='.repeat(50));
  lines.push('');
  lines.push(`Completed ${data.summary.totalTickets} items this month.`);
  lines.push('');
  lines.push('--- KEY DELIVERABLES ---');
  lines.push('');

  for (const ticket of data.tickets) {
    lines.push(formatTicketNonTechnical(ticket));
  }

  return lines.join('\n');
}
