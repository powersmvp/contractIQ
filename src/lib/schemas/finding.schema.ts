import { z } from 'zod';

export const SeveritySchema = z.enum(['critical', 'high', 'medium', 'low']);

export const FindingSchema = z.object({
  id: z.string().uuid(),
  blockId: z.string().min(1),
  severity: SeveritySchema,
  original: z.string(),
  suggested: z.string(),
  justification: z.string(),
  consensus: z.number().int().min(1).max(5),
  sources: z.array(z.string()),
  confidence: z.enum(['strong', 'moderate', 'weak']).optional(),
  debateNotes: z.string().optional(),
  agreesCount: z.number().int().optional(),
  disagreesCount: z.number().int().optional(),
});

export type Severity = z.infer<typeof SeveritySchema>;
export type Finding = z.infer<typeof FindingSchema>;
