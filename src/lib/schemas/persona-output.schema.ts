import { z } from 'zod';
import { SeveritySchema } from './finding.schema';

export const PersonaFindingSchema = z.object({
  blockId: z.string().min(1),
  severity: SeveritySchema,
  original: z.string(),
  suggested: z.string(),
  justification: z.string(),
});

export const PersonaOutputSchema = z.object({
  provider: z.string(),
  findings: z.array(PersonaFindingSchema),
  generalSuggestions: z.array(z.string()).optional(),
  analyzedAt: z.string(),
});

export type PersonaFinding = z.infer<typeof PersonaFindingSchema>;
export type PersonaOutput = z.infer<typeof PersonaOutputSchema>;
