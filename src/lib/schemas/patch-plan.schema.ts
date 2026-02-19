import { z } from 'zod';
import { SeveritySchema } from './finding.schema';

export const PatchActionSchema = z.object({
  blockId: z.string().min(1),
  original: z.string(),
  suggested: z.string(),
  justification: z.string(),
  severity: SeveritySchema,
  consensus: z.number().int().min(1).max(5),
  sources: z.array(z.string()),
});

export const PatchPlanSchema = z.object({
  tenantId: z.string(),
  jobId: z.string().uuid(),
  actions: z.array(PatchActionSchema),
  generatedAt: z.string().datetime(),
});

export type PatchAction = z.infer<typeof PatchActionSchema>;
export type PatchPlan = z.infer<typeof PatchPlanSchema>;
