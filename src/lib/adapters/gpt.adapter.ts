import { BaseLLMAdapter } from './base.adapter';
import type { ProviderName } from '@/lib/config/env.config';

export class GptAdapter extends BaseLLMAdapter {
  readonly name: ProviderName = 'gpt';

  buildRequest(prompt: string) {
    return {
      url: '/chat/completions',
      body: {
        model: this.model,
        messages: [
          { role: 'system', content: 'You are a contract analysis expert. Always respond with valid JSON only, no markdown or extra text.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.2,
        response_format: { type: 'json_object' },
      },
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
    };
  }

  extractContent(response: unknown): string {
    const data = response as { choices: { message: { content: string } }[] };
    return data.choices[0].message.content;
  }
}
