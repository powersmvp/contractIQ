import { describe, it, expect } from 'vitest';
import { PatchActionSchema, PatchPlanSchema } from './patch-plan.schema';
import { v4 as uuid } from 'uuid';

describe('PatchActionSchema', () => {
  it('validates a valid patch action', () => {
    const action = {
      blockId: uuid(),
      original: 'The term shall be 5 years.',
      suggested: 'The initial term shall be 2 years, with automatic renewal for successive 1-year periods.',
      justification: 'Long fixed term without exit clause.',
      severity: 'high' as const,
      consensus: 3,
      sources: ['gpt', 'claude', 'gemini'],
    };
    expect(PatchActionSchema.parse(action)).toEqual(action);
  });
});

describe('PatchPlanSchema', () => {
  it('validates a valid patch plan', () => {
    const plan = {
      tenantId: 'default',
      jobId: uuid(),
      actions: [
        {
          blockId: uuid(),
          original: 'Original text',
          suggested: 'Suggested text',
          justification: 'Reason',
          severity: 'critical' as const,
          consensus: 5,
          sources: ['gpt', 'claude', 'gemini', 'mistral', 'llama'],
        },
      ],
      generatedAt: new Date().toISOString(),
    };
    expect(PatchPlanSchema.parse(plan)).toEqual(plan);
  });

  it('validates a plan with no actions', () => {
    const plan = {
      tenantId: 'default',
      jobId: uuid(),
      actions: [],
      generatedAt: new Date().toISOString(),
    };
    expect(PatchPlanSchema.parse(plan)).toEqual(plan);
  });

  it('rejects missing tenantId', () => {
    expect(() => PatchPlanSchema.parse({
      jobId: uuid(),
      actions: [],
      generatedAt: new Date().toISOString(),
    })).toThrow();
  });
});
