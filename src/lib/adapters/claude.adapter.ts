import { BaseLLMAdapter } from './base.adapter';
import type { ProviderName } from '@/lib/config/env.config';
import { logger } from '@/lib/logger/logger';

export class ClaudeAdapter extends BaseLLMAdapter {
  readonly name: ProviderName = 'claude';

  buildRequest(prompt: string) {
    return {
      url: '/v1/messages',
      body: {
        model: this.model,
        max_tokens: 16384,
        system: 'You are a contract analysis expert. Always respond with valid JSON only, no markdown or extra text.',
        messages: [
          { role: 'user', content: prompt },
        ],
      },
      headers: {
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
    };
  }

  extractContent(response: unknown): string {
    const data = response as {
      content: { type: string; text: string }[];
      stop_reason?: string;
      usage?: { output_tokens?: number };
    };

    if (data.stop_reason === 'max_tokens') {
      logger.warn('Claude response was truncated (max_tokens reached)', {
        provider: this.name,
        outputTokens: data.usage?.output_tokens,
      });
    }

    const textBlock = data.content.find((c) => c.type === 'text');
    return textBlock?.text ?? '';
  }
}
