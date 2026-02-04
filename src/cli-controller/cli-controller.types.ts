/**
 * CLI argument types and Zod schemas
 */

import { z } from 'zod';
import { MONTH_FORMATS } from '../shared/constants.js';

export const monthSchema = z
  .string()
  .refine(
    (val) => MONTH_FORMATS.ISO.test(val) || MONTH_FORMATS.ALT.test(val),
    { message: 'Month must be YYYY-MM or MM-YYYY format' }
  );

export const cliArgsSchema = z.object({
  month: monthSchema.optional(),
  workspace: z.string().min(1).optional(),
  outputDir: z.string().min(1).optional(),
  yes: z.boolean().optional(),
});

export type CLIArgs = z.infer<typeof cliArgsSchema>;

export const confirmSchema = z
  .string()
  .transform((val) => val.toLowerCase().trim())
  .refine((val) => ['y', 'yes', 'n', 'no', ''].includes(val), {
    message: 'Please enter Y or n',
  });
