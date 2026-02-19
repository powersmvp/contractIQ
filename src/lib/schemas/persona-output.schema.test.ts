import { describe, it, expect } from 'vitest';
import { PersonaFindingSchema, PersonaOutputSchema } from './persona-output.schema';
import { v4 as uuid } from 'uuid';

describe('PersonaFindingSchema', () => {
  it('validates a valid persona finding', () => {
    const finding = {
      blockId: uuid(),
      severity: 'medium' as const,
      original: 'Original clause text',
      suggested: 'Suggested clause text',
      justification: 'Reason for the change',
    };
    expect(PersonaFindingSchema.parse(finding)).toEqual(finding);
  });
});

describe('PersonaOutputSchema', () => {
  it('validates a valid persona output', () => {
    const output = {
      provider: 'gpt',
      findings: [
        {
          blockId: uuid(),
          severity: 'critical' as const,
          original: 'Original text',
          suggested: 'Better text',
          justification: 'This clause is problematic',
        },
      ],
      generalSuggestions: ['Consider adding a force majeure clause'],
      analyzedAt: new Date().toISOString(),
    };
    expect(PersonaOutputSchema.parse(output)).toEqual(output);
  });

  it('validates output without generalSuggestions', () => {
    const output = {
      provider: 'claude',
      findings: [],
      analyzedAt: new Date().toISOString(),
    };
    expect(PersonaOutputSchema.parse(output)).toEqual(output);
  });

  it('rejects missing provider', () => {
    expect(() => PersonaOutputSchema.parse({
      findings: [],
      analyzedAt: new Date().toISOString(),
    })).toThrow();
  });

  it('rejects missing analyzedAt', () => {
    expect(() => PersonaOutputSchema.parse({
      provider: 'gemini',
      findings: [],
    })).toThrow();
  });
});
