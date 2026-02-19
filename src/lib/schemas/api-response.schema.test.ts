import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { ApiErrorSchema, ApiErrorResponseSchema, createApiSuccessSchema } from './api-response.schema';

describe('ApiErrorSchema', () => {
  it('validates a valid error', () => {
    const error = { code: 'INVALID_FILE', message: 'File must be .docx format' };
    expect(ApiErrorSchema.parse(error)).toEqual(error);
  });

  it('rejects missing code', () => {
    expect(() => ApiErrorSchema.parse({ message: 'test' })).toThrow();
  });
});

describe('ApiErrorResponseSchema', () => {
  it('validates a valid error response', () => {
    const response = {
      error: { code: 'NOT_FOUND', message: 'Job not found' },
    };
    expect(ApiErrorResponseSchema.parse(response)).toEqual(response);
  });
});

describe('createApiSuccessSchema', () => {
  it('creates a success schema for a simple object', () => {
    const schema = createApiSuccessSchema(z.object({
      jobId: z.string(),
      status: z.string(),
    }));

    const response = { data: { jobId: 'abc-123', status: 'created' } };
    expect(schema.parse(response)).toEqual(response);
  });

  it('rejects response without data wrapper', () => {
    const schema = createApiSuccessSchema(z.object({
      jobId: z.string(),
    }));

    expect(() => schema.parse({ jobId: 'abc-123' })).toThrow();
  });
});
