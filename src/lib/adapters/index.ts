import type { LLMAdapter } from './adapter.interface';
import { getActiveProviders, getProviderConfig, type ProviderName } from '@/lib/config/env.config';
import { getSelectedModel } from '@/lib/config/provider-models';
import { GptAdapter } from './gpt.adapter';
import { ClaudeAdapter } from './claude.adapter';
import { GeminiAdapter } from './gemini.adapter';
import { MistralAdapter } from './mistral.adapter';
import { LlamaAdapter } from './llama.adapter';

function createAdapter(provider: ProviderName): LLMAdapter | null {
  const { apiKey, baseUrl } = getProviderConfig(provider);
  if (!apiKey) return null;
  const model = getSelectedModel(provider);

  switch (provider) {
    case 'gpt': return new GptAdapter(apiKey, baseUrl, model);
    case 'claude': return new ClaudeAdapter(apiKey, baseUrl, model);
    case 'gemini': return new GeminiAdapter(apiKey, baseUrl, model);
    case 'mistral': return new MistralAdapter(apiKey, baseUrl, model);
    case 'llama': return new LlamaAdapter(apiKey, baseUrl, model);
  }
}

export function getAdapters(selectedProviders?: ProviderName[]): LLMAdapter[] {
  let providers = getActiveProviders();
  if (selectedProviders && selectedProviders.length > 0) {
    providers = providers.filter((p) => selectedProviders.includes(p));
  }
  return providers
    .map(createAdapter)
    .filter((a): a is LLMAdapter => a !== null);
}

export function getAdapter(provider: ProviderName): LLMAdapter | null {
  return createAdapter(provider);
}
