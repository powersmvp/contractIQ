import type { LLMAdapter } from './adapter.interface';
import { getActiveProviders, getProviderConfig, isNativeProvider, type NativeProviderName } from '@/lib/config/env.config';
import { getSelectedModel } from '@/lib/config/provider-models';
import { getCustomProviders } from '@/lib/config/provider-keys';
import { GptAdapter } from './gpt.adapter';
import { ClaudeAdapter } from './claude.adapter';
import { GeminiAdapter } from './gemini.adapter';
import { MistralAdapter } from './mistral.adapter';
import { LlamaAdapter } from './llama.adapter';
import { GenericAdapter } from './generic.adapter';

function createNativeAdapter(provider: NativeProviderName, apiKey: string, baseUrl: string, model: string): LLMAdapter {
  switch (provider) {
    case 'gpt': return new GptAdapter(apiKey, baseUrl, model);
    case 'claude': return new ClaudeAdapter(apiKey, baseUrl, model);
    case 'gemini': return new GeminiAdapter(apiKey, baseUrl, model);
    case 'mistral': return new MistralAdapter(apiKey, baseUrl, model);
    case 'llama': return new LlamaAdapter(apiKey, baseUrl, model);
  }
}

async function createAdapter(provider: string): Promise<LLMAdapter | null> {
  if (isNativeProvider(provider)) {
    const { apiKey, baseUrl } = getProviderConfig(provider);
    if (!apiKey) return null;
    const model = await getSelectedModel(provider);
    return createNativeAdapter(provider, apiKey, baseUrl, model);
  }

  // Custom provider — look up from DB
  const customs = await getCustomProviders();
  const custom = customs.find((c) => c.provider_name === provider);
  if (!custom) return null;
  return new GenericAdapter(custom.provider_name, custom.api_key, custom.base_url!, custom.selected_model!);
}

export async function getAllActiveProviderNames(): Promise<string[]> {
  const native = getActiveProviders();
  const customs = await getCustomProviders();
  return [...native, ...customs.map((c) => c.provider_name)];
}

export async function getAdapters(selectedProviders?: string[]): Promise<LLMAdapter[]> {
  let providers = await getAllActiveProviderNames();
  if (selectedProviders && selectedProviders.length > 0) {
    providers = providers.filter((p) => selectedProviders.includes(p));
  }
  const results = await Promise.all(providers.map(createAdapter));
  return results.filter((a): a is LLMAdapter => a !== null);
}

export async function getAdapter(provider: string): Promise<LLMAdapter | null> {
  return createAdapter(provider);
}
