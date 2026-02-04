/**
 * File system types and Zod schemas
 */

import { z } from 'zod';

export const outputPathSchema = z.object({
  outputDir: z.string(),
  monthDir: z.string(),
  timestampDir: z.string(),
  technicalPath: z.string(),
  nonTechnicalPath: z.string(),
});

export type OutputPath = z.infer<typeof outputPathSchema>;
