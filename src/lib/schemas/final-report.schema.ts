import { z } from 'zod';
import { FindingSchema } from './finding.schema';

export const FinalReportSchema = z.object({
  tenantId: z.string(),
  jobId: z.string().uuid(),
  metadata: z.object({
    contractType: z.string(),
    side: z.string(),
    jurisdiction: z.string(),
    analyzedAt: z.string().datetime(),
    providersUsed: z.array(z.string()),
  }),
  summary: z.object({
    totalFindings: z.number().int(),
    bySeverity: z.object({
      critical: z.number().int(),
      high: z.number().int(),
      medium: z.number().int(),
      low: z.number().int(),
    }),
  }),
  findings: z.array(FindingSchema),
  generalSuggestions: z.array(z.string()),
});

export type FinalReport = z.infer<typeof FinalReportSchema>;
