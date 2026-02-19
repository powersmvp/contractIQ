import type { ProviderName } from './env.config';
import { getProviderModel } from './provider-keys';

export interface ModelOption {
  id: string;
  label: string;
  tier: 'economy' | 'standard' | 'premium';
  isDefault: boolean;
}

export const PROVIDER_MODELS: Record<ProviderName, ModelOption[]> = {
  gpt: [
    { id: 'gpt-4o-mini', label: 'GPT-4o Mini', tier: 'economy', isDefault: true },
    { id: 'gpt-4o', label: 'GPT-4o', tier: 'standard', isDefault: false },
    { id: 'gpt-4.1-mini', label: 'GPT-4.1 Mini', tier: 'economy', isDefault: false },
    { id: 'gpt-4.1', label: 'GPT-4.1', tier: 'premium', isDefault: false },
  ],
  claude: [
    { id: 'claude-haiku-4-5-20251001', label: 'Claude 4.5 Haiku', tier: 'economy', isDefault: true },
    { id: 'claude-sonnet-4-5-20250929', label: 'Claude 4.5 Sonnet', tier: 'standard', isDefault: false },
    { id: 'claude-opus-4-6', label: 'Claude Opus 4.6', tier: 'premium', isDefault: false },
  ],
  gemini: [
    { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash', tier: 'economy', isDefault: true },
    { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro', tier: 'standard', isDefault: false },
  ],
  mistral: [
    { id: 'mistral-small-latest', label: 'Mistral Small', tier: 'economy', isDefault: true },
    { id: 'mistral-large-latest', label: 'Mistral Large', tier: 'standard', isDefault: false },
  ],
  llama: [
    { id: 'meta-llama/Llama-3.1-8B-Instruct-Turbo', label: 'Llama 3.1 8B', tier: 'economy', isDefault: true },
    { id: 'meta-llama/Llama-3.3-70B-Instruct-Turbo', label: 'Llama 3.3 70B', tier: 'standard', isDefault: false },
  ],
};

export function getDefaultModel(provider: ProviderName): string {
  return PROVIDER_MODELS[provider].find((m) => m.isDefault)!.id;
}

export function getSelectedModel(provider: ProviderName): string {
  return getProviderModel(provider) ?? getDefaultModel(provider);
}
