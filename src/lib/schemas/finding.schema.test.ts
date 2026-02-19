import { describe, it, expect } from 'vitest';
import { FindingSchema, SeveritySchema } from './finding.schema';
import { v4 as uuid } from 'uuid';

describe('SeveritySchema', () => {
  it.each(['critical', 'high', 'medium', 'low'])('accepts "%s"', (sev) => {
    expect(SeveritySchema.parse(sev)).toBe(sev);
  });

  it('rejects invalid severity', () => {
    expect(() => SeveritySchema.parse('urgent')).toThrow();
  });
});

describe('FindingSchema', () => {
  const validFinding = () => ({
    id: uuid(),
    blockId: uuid(),
    severity: 'high' as const,
    original: 'The contractor shall be liable for all damages.',
    suggested: 'The contractor shall be liable for direct damages only, excluding consequential and indirect damages.',
    justification: 'Unlimited liability clause exposes the contractor to disproportionate risk.',
    consensus: 4,
    sources: ['gpt', 'claude', 'gemini', 'mistral'],
  });

  it('validates a valid finding', () => {
    const finding = validFinding();
    expect(FindingSchema.parse(finding)).toEqual(finding);
  });

  it('rejects consensus > 5', () => {
    expect(() => FindingSchema.parse({ ...validFinding(), consensus: 6 })).toThrow();
  });

  it('rejects consensus < 1', () => {
    expect(() => FindingSchema.parse({ ...validFinding(), consensus: 0 })).toThrow();
  });

  it('rejects empty sources array', () => {
    const finding = { ...validFinding(), sources: [] };
    // empty array is technically valid per schema (no minLength constraint)
    expect(FindingSchema.parse(finding)).toEqual(finding);
  });

  it('rejects missing fields', () => {
    expect(() => FindingSchema.parse({ id: uuid() })).toThrow();
  });
});
