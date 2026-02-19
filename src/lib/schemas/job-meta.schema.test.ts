import { describe, it, expect } from 'vitest';
import { JobMetaSchema, JobStatusSchema, ContractTypeSchema, SideSchema, StageSchema } from './job-meta.schema';
import { v4 as uuid } from 'uuid';

describe('JobStatusSchema', () => {
  it.each(['created', 'processing', 'analyzed', 'completed', 'failed', 'expired'])('accepts "%s"', (status) => {
    expect(JobStatusSchema.parse(status)).toBe(status);
  });

  it('rejects invalid status', () => {
    expect(() => JobStatusSchema.parse('pending')).toThrow();
  });
});

describe('ContractTypeSchema', () => {
  it.each(['nda', 'saas', 'partnership'])('accepts "%s"', (type) => {
    expect(ContractTypeSchema.parse(type)).toBe(type);
  });
});

describe('SideSchema', () => {
  it.each(['contractor', 'contracted'])('accepts "%s"', (side) => {
    expect(SideSchema.parse(side)).toBe(side);
  });
});

describe('StageSchema', () => {
  it.each(['created', 'ingest', 'personas', 'debate', 'verdict', 'consolidate', 'render'])('accepts "%s"', (stage) => {
    expect(StageSchema.parse(stage)).toBe(stage);
  });
});

describe('JobMetaSchema', () => {
  const validJobMeta = () => ({
    jobId: uuid(),
    tenantId: 'default',
    status: 'created' as const,
    contractType: 'nda' as const,
    side: 'contractor' as const,
    jurisdiction: 'Brazil',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  it('validates a minimal valid job meta', () => {
    const meta = validJobMeta();
    expect(JobMetaSchema.parse(meta)).toEqual(meta);
  });

  it('validates job meta with all optional fields', () => {
    const meta = {
      ...validJobMeta(),
      status: 'processing' as const,
      currentStage: 'personas' as const,
      progress: { completed: 3, total: 5 },
    };
    expect(JobMetaSchema.parse(meta)).toEqual(meta);
  });

  it('validates job meta with error info', () => {
    const meta = {
      ...validJobMeta(),
      status: 'failed' as const,
      errorCode: 'INSUFFICIENT_RESPONSES',
      errorMessage: 'Only 2 of 5 LLMs responded successfully',
    };
    expect(JobMetaSchema.parse(meta)).toEqual(meta);
  });

  it('validates job meta with feedback', () => {
    const meta = {
      ...validJobMeta(),
      status: 'completed' as const,
      feedback: {
        rating: 'good' as const,
        createdAt: new Date().toISOString(),
      },
    };
    expect(JobMetaSchema.parse(meta)).toEqual(meta);
  });

  it('rejects invalid jobId', () => {
    expect(() => JobMetaSchema.parse({
      ...validJobMeta(),
      jobId: 'not-a-uuid',
    })).toThrow();
  });

  it('rejects missing required fields', () => {
    expect(() => JobMetaSchema.parse({
      jobId: uuid(),
    })).toThrow();
  });

  it('rejects invalid contract type', () => {
    expect(() => JobMetaSchema.parse({
      ...validJobMeta(),
      contractType: 'rental',
    })).toThrow();
  });
});
