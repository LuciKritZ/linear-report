/**
 * Report types and Zod schemas
 */

import type { LinearTicket } from '../linear-api-service/linear-api-service.types.js';

export interface ReportData {
  month: string;
  year: number;
  tickets: LinearTicket[];
  summary: {
    totalTickets: number;
    byStatus: Record<string, number>;
    byActivityType: Record<string, number>;
  };
}
