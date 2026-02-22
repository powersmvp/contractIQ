import type { z } from 'zod';

export interface LLMCallOptions {
  traceId?: string;
  round?: string;
}

export interface LLMResponse<T> {
  data: T;
  provider: string;
  durationMs: number;
}

export interface LLMAdapter {
  readonly name: string;
  call<T>(prompt: string, schema: z.ZodType<T>, options?: LLMCallOptions): Promise<LLMResponse<T> | null>;
}
