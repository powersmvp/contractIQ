import { BaseLLMAdapter } from './base.adapter';
import type { ProviderName } from '@/lib/config/env.config';

export class GeminiAdapter extends BaseLLMAdapter {
  readonly name: ProviderName = 'gemini';

  buildRequest(prompt: string) {
    return {
      url: `/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`,
      body: {
        contents: [
          {
            parts: [
              { text: `You are a contract analysis expert. Always respond with valid JSON only, no markdown or extra text.\n\n${prompt}` },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: 'application/json',
        },
      },
      headers: {
        'Content-Type': 'application/json',
      },
    };
  }

  extractContent(response: unknown): string {
    const data = response as { candidates: { content: { parts: { text: string }[] } }[] };
    return data.candidates[0].content.parts[0].text;
  }
}
