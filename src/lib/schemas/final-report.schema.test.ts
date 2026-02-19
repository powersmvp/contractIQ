import { describe, it, expect } from 'vitest';
import { FinalReportSchema } from './final-report.schema';
import { v4 as uuid } from 'uuid';

describe('FinalReportSchema', () => {
  const validReport = () => ({
    tenantId: 'default',
    jobId: uuid(),
    metadata: {
      contractType: 'nda',
      side: 'contractor',
      jurisdiction: 'Brazil',
      analyzedAt: new Date().toISOString(),
      providersUsed: ['gpt', 'claude', 'gemini', 'mistral', 'llama'],
    },
    summary: {
      totalFindings: 3,
      bySeverity: {
        critical: 1,
        high: 1,
        medium: 1,
        low: 0,
      },
    },
    findings: [
      {
        id: uuid(),
        blockId: uuid(),
        severity: 'critical' as const,
        original: 'Original clause',
        suggested: 'Better clause',
        justification: 'Critical risk identified',
        consensus: 5,
        sources: ['gpt', 'claude', 'gemini', 'mistral', 'llama'],
      },
      {
        id: uuid(),
        blockId: uuid(),
        severity: 'high' as const,
        original: 'Another clause',
        suggested: 'Improved clause',
        justification: 'High risk',
        consensus: 3,
        sources: ['gpt', 'claude', 'gemini'],
      },
      {
        id: uuid(),
        blockId: uuid(),
        severity: 'medium' as const,
        original: 'Third clause',
        suggested: 'Better version',
        justification: 'Medium risk',
        consensus: 2,
        sources: ['claude', 'mistral'],
      },
    ],
    generalSuggestions: [
      'Consider adding a force majeure clause.',
      'Review governing law for alignment with jurisdiction.',
    ],
  });

  it('validates a valid final report', () => {
    const report = validReport();
    expect(FinalReportSchema.parse(report)).toEqual(report);
  });

  it('validates report with zero findings', () => {
    const report = {
      ...validReport(),
      findings: [],
      generalSuggestions: [],
      summary: {
        totalFindings: 0,
        bySeverity: { critical: 0, high: 0, medium: 0, low: 0 },
      },
    };
    expect(FinalReportSchema.parse(report)).toEqual(report);
  });

  it('rejects missing metadata fields', () => {
    const report = validReport();
    const { metadata, ...rest } = report;
    expect(() => FinalReportSchema.parse(rest)).toThrow();
  });

  it('rejects missing summary', () => {
    const report = validReport();
    const { summary, ...rest } = report;
    expect(() => FinalReportSchema.parse(rest)).toThrow();
  });
});
