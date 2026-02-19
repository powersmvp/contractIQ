import { z } from 'zod';
import { SeveritySchema } from './finding.schema';

/** Individual stance on a finding from another provider */
export const DebateStanceSchema = z.object({
  originalProvider: z.string(),
  blockId: z.string().min(1),
  stance: z.enum(['agree', 'disagree', 'adjust']),
  adjustedSeverity: SeveritySchema.optional(),
  argument: z.string(),
});

/** Full debate output from one provider */
export const DebateRoundOutputSchema = z.object({
  provider: z.string(),
  responses: z.array(DebateStanceSchema),
  newFindings: z.array(z.object({
    blockId: z.string().min(1),
    severity: SeveritySchema,
    original: z.string(),
    suggested: z.string(),
    justification: z.string(),
  })).optional(),
  analyzedAt: z.string(),
});

/** Final verdict finding with confidence */
export const FinalVerdictFindingSchema = z.object({
  blockId: z.string().min(1),
  severity: SeveritySchema,
  original: z.string(),
  suggested: z.string(),
  justification: z.string(),
  confidence: z.enum(['strong', 'moderate', 'weak']),
  debateNotes: z.string().optional(),
});

/** Full verdict output from one provider */
export const FinalVerdictOutputSchema = z.object({
  provider: z.string(),
  findings: z.array(FinalVerdictFindingSchema),
  generalSuggestions: z.array(z.string()).optional(),
  analyzedAt: z.string(),
});

export type DebateStance = z.infer<typeof DebateStanceSchema>;
export type DebateRoundOutput = z.infer<typeof DebateRoundOutputSchema>;
export type FinalVerdictFinding = z.infer<typeof FinalVerdictFindingSchema>;
export type FinalVerdictOutput = z.infer<typeof FinalVerdictOutputSchema>;
