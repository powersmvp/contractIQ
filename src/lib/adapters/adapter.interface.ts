import type { z } from 'zod';
import type { ProviderName } from '@/lib/config/env.config';

export interface LLMResponse<T> {
  data: T;
  provider: ProviderName;
  durationMs: number;
}

export interface LLMAdapter {
  readonly name: ProviderName;
  call<T>(prompt: string, schema: z.ZodType<T>): Promise<LLMResponse<T> | null>;
}
