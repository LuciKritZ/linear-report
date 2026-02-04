/**
 * Linear API types and Zod schemas
 */

import { z } from 'zod';

export const linearTicketActivitySchema = z.object({
  type: z.enum(['assigned', 'updated', 'commented']),
  date: z.string(),
});

export const linearTicketSchema = z.object({
  id: z.string(),
  identifier: z.string().optional(),
  title: z.string(),
  description: z.string().nullable(),
  state: z.object({
    name: z.string(),
    type: z.string(),
  }),
  assignee: z
    .object({
      id: z.string(),
      name: z.string(),
      email: z.string(),
    })
    .optional(),
  creator: z.object({
    id: z.string(),
    name: z.string(),
  }),
  labels: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
    })
  ),
  createdAt: z.string(),
  updatedAt: z.string(),
  completedAt: z.string().nullable(),
  activities: z.array(linearTicketActivitySchema),
});

export type LinearTicket = z.infer<typeof linearTicketSchema>;
export type LinearTicketActivity = z.infer<typeof linearTicketActivitySchema>;
