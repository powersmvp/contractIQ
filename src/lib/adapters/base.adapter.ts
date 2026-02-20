import type { z } from 'zod';
import axios, { type AxiosInstance } from 'axios';
import type { LLMAdapter, LLMCallOptions, LLMResponse } from './adapter.interface';
import type { ProviderName } from '@/lib/config/env.config';
import { loadConfig } from '@/lib/config/env.config';
import { logger } from '@/lib/logger/logger';
import { getLangfuse } from '@/lib/langfuse/langfuse-client';

export abstract class BaseLLMAdapter implements LLMAdapter {
  abstract readonly name: ProviderName;
  protected client: AxiosInstance;
  protected apiKey: string;

  protected model: string;

  constructor(apiKey: string, baseUrl: string, model: string) {
    this.apiKey = apiKey;
    this.model = model;
    this.client = axios.create({
      baseURL: baseUrl,
      timeout: loadConfig().LLM_TIMEOUT_MS,
    });
  }

  abstract buildRequest(prompt: string): { url: string; body: unknown; headers: Record<string, string> };
  abstract extractContent(response: unknown): string;

  /**
   * Strip markdown code fences and surrounding text to extract raw JSON.
   */
  protected cleanJsonContent(raw: string): string {
    let cleaned = raw.trim();

    const fenceMatch = cleaned.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
    if (fenceMatch) {
      cleaned = fenceMatch[1].trim();
    }

    if (!cleaned.startsWith('{') && !cleaned.startsWith('[')) {
      const jsonStart = cleaned.search(/[{\[]/);
      if (jsonStart !== -1) {
        cleaned = cleaned.slice(jsonStart);
      }
    }

    return cleaned;
  }

  async call<T>(prompt: string, schema: z.ZodType<T>, options?: LLMCallOptions): Promise<LLMResponse<T> | null> {
    const maxRetries = loadConfig().LLM_MAX_RETRIES;
    let lastError: string | undefined;

    const langfuse = getLangfuse();
    const generation = langfuse && options?.traceId
      ? langfuse.trace({ id: options.traceId }).generation({
          name: this.name,
          model: this.model,
          input: prompt,
          metadata: { round: options.round ?? 'round-1' },
        })
      : null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const start = Date.now();
      try {
        const retryPrompt = attempt > 0 && lastError
          ? `${prompt}\n\nIMPORTANT: Your previous response had invalid JSON. Error: ${lastError}. Please return ONLY valid JSON matching the required schema.`
          : prompt;

        const { url, body, headers } = this.buildRequest(retryPrompt);

        const response = await this.client.post(url, body, { headers });
        const rawContent = this.extractContent(response.data);
        const content = this.cleanJsonContent(rawContent);
        const durationMs = Date.now() - start;

        logger.info('LLM raw response received', {
          provider: this.name,
          attempt: attempt + 1,
          rawLength: rawContent.length,
          cleanedLength: content.length,
          preview: content.slice(0, 200),
          durationMs,
        });

        let parsed: unknown;
        try {
          parsed = JSON.parse(content);
        } catch {
          lastError = `JSON inválido (${content.length} chars): ${content.slice(0, 80)}...`;
          logger.warn('LLM returned non-JSON response', {
            provider: this.name,
            attempt: attempt + 1,
            contentPreview: content.slice(0, 300),
            durationMs,
          });
          continue;
        }

        const result = schema.safeParse(parsed);
        if (!result.success) {
          lastError = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
          logger.warn('LLM response failed Zod validation', {
            provider: this.name,
            attempt: attempt + 1,
            validationError: lastError,
            durationMs,
          });
          continue;
        }

        logger.info('LLM call succeeded', {
          provider: this.name,
          attempt: attempt + 1,
          durationMs,
        });

        generation?.end({
          output: content,
          level: 'DEFAULT',
          metadata: { attempt: attempt + 1 },
        });

        return { data: result.data, provider: this.name, durationMs };
      } catch (error) {
        const durationMs = Date.now() - start;

        if (axios.isAxiosError(error) && error.code === 'ECONNABORTED') {
          const msg = `${this.name}: timeout após ${Math.round(durationMs / 1000)}s`;
          logger.error('LLM call timed out', { provider: this.name, durationMs });
          generation?.end({ level: 'ERROR', statusMessage: msg });
          throw new Error(msg);
        }

        if (axios.isAxiosError(error)) {
          const status = error.response?.status;
          const body = JSON.stringify(error.response?.data)?.slice(0, 200);
          const msg = `${this.name}: HTTP ${status} - ${body}`;
          logger.error('LLM call failed', { provider: this.name, errorCode: String(status), responseBody: body, durationMs });
          generation?.end({ level: 'ERROR', statusMessage: msg });
          throw new Error(msg);
        }

        const msg = `${this.name}: ${error instanceof Error ? error.message : 'erro desconhecido'}`;
        logger.error('LLM call failed', { provider: this.name, errorMessage: msg, durationMs });
        generation?.end({ level: 'ERROR', statusMessage: msg });
        throw new Error(msg);
      }
    }

    const msg = `${this.name}: falhou após ${maxRetries + 1} tentativas - ${lastError}`;
    logger.error('LLM exhausted all retries', { provider: this.name, maxRetries, lastError });
    generation?.end({ level: 'ERROR', statusMessage: msg });
    throw new Error(msg);
  }
}
