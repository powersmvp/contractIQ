import { z } from 'zod';
import { PROVIDERS } from '@/lib/config/env.config';

export const ProviderNameSchema = z.enum(PROVIDERS);

export const JobStatusSchema = z.enum(['created', 'processing', 'analyzed', 'completed', 'failed', 'expired']);

export const ContractTypeSchema = z.enum(['nda', 'saas', 'partnership']);

export const SideSchema = z.enum(['contractor', 'contracted']);

export const StageSchema = z.enum(['created', 'ingest', 'personas', 'debate', 'verdict', 'consolidate', 'render']);

export const DebateModeSchema = z.enum(['single', 'debate']);

export const FeedbackReasonSchema = z.enum([
  'irrelevant_findings',
  'missed_clauses',
  'bad_suggestions',
  'wrong_severity',
  'other',
]);

export const FeedbackSchema = z.object({
  rating: z.enum(['good', 'bad']),
  reason: FeedbackReasonSchema.optional(),
  comment: z.string().optional(),
  createdAt: z.string().datetime(),
});

export const JobMetaSchema = z.object({
  jobId: z.string().uuid(),
  tenantId: z.string(),
  status: JobStatusSchema,
  contractType: ContractTypeSchema,
  side: SideSchema,
  jurisdiction: z.string(),
  currentStage: StageSchema.optional(),
  progress: z.object({
    completed: z.number().int(),
    total: z.number().int(),
  }).optional(),
  debateMode: DebateModeSchema.optional(),
  selectedProviders: z.array(ProviderNameSchema).optional(),
  errorCode: z.string().optional(),
  errorMessage: z.string().optional(),
  feedback: FeedbackSchema.optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type JobStatus = z.infer<typeof JobStatusSchema>;
export type ContractType = z.infer<typeof ContractTypeSchema>;
export type Side = z.infer<typeof SideSchema>;
export type Stage = z.infer<typeof StageSchema>;
export type DebateMode = z.infer<typeof DebateModeSchema>;
export type FeedbackReason = z.infer<typeof FeedbackReasonSchema>;
export type Feedback = z.infer<typeof FeedbackSchema>;
export type JobMeta = z.infer<typeof JobMetaSchema>;
