import type { LLMAdapter } from './adapter.interface';
import { getActiveProviders, getProviderConfig, type ProviderName } from '@/lib/config/env.config';
import { getSelectedModel } from '@/lib/config/provider-models';
import { GptAdapter } from './gpt.adapter';
import { ClaudeAdapter } from './claude.adapter';
import { GeminiAdapter } from './gemini.adapter';
import { MistralAdapter } from './mistral.adapter';
import { LlamaAdapter } from './llama.adapter';

async function createAdapter(provider: ProviderName): Promise<LLMAdapter | null> {
  const { apiKey, baseUrl } = getProviderConfig(provider);
  if (!apiKey) return null;
  const model = await getSelectedModel(provider);

  switch (provider) {
    case 'gpt': return new GptAdapter(apiKey, baseUrl, model);
    case 'claude': return new ClaudeAdapter(apiKey, baseUrl, model);
    case 'gemini': return new GeminiAdapter(apiKey, baseUrl, model);
    case 'mistral': return new MistralAdapter(apiKey, baseUrl, model);
    case 'llama': return new LlamaAdapter(apiKey, baseUrl, model);
  }
}

export async function getAdapters(selectedProviders?: ProviderName[]): Promise<LLMAdapter[]> {
  let providers = getActiveProviders();
  if (selectedProviders && selectedProviders.length > 0) {
    providers = providers.filter((p) => selectedProviders.includes(p));
  }
  const results = await Promise.all(providers.map(createAdapter));
  return results.filter((a): a is LLMAdapter => a !== null);
}

export async function getAdapter(provider: ProviderName): Promise<LLMAdapter | null> {
  return createAdapter(provider);
}
