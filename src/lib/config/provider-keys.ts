import { getClient } from '@/lib/db/client';
import { logger } from '@/lib/logger/logger';
import type { DbProviderConfigRow } from '@/lib/db/schema';

/** Shape kept for backward-compat with callers */
export interface ProviderEntry {
  apiKey: string;
  model?: string;
}

type EnvKeyName = 'OPENAI_API_KEY' | 'ANTHROPIC_API_KEY' | 'GOOGLE_AI_API_KEY' | 'MISTRAL_API_KEY' | 'LLAMA_API_KEY';

export interface StoredConfig {
  OPENAI_API_KEY?: string | ProviderEntry;
  ANTHROPIC_API_KEY?: string | ProviderEntry;
  GOOGLE_AI_API_KEY?: string | ProviderEntry;
  MISTRAL_API_KEY?: string | ProviderEntry;
  LLAMA_API_KEY?: string | ProviderEntry;
}

const PROVIDER_TO_ENV: Record<string, EnvKeyName> = {
  gpt: 'OPENAI_API_KEY',
  claude: 'ANTHROPIC_API_KEY',
  gemini: 'GOOGLE_AI_API_KEY',
  mistral: 'MISTRAL_API_KEY',
  llama: 'LLAMA_API_KEY',
};

const TENANT_ID = 'default';
const TABLE = 'provider_config';

export async function loadStoredConfig(): Promise<StoredConfig> {
  try {
    const { data, error } = await getClient()
      .from(TABLE)
      .select('*')
      .eq('tenant_id', TENANT_ID);

    if (error) {
      logger.warn('Failed to load provider config from Supabase', { error: error.message });
      return {};
    }

    const config: StoredConfig = {};
    for (const row of (data ?? []) as DbProviderConfigRow[]) {
      const envKey = PROVIDER_TO_ENV[row.provider_name];
      if (envKey) {
        config[envKey] = { apiKey: row.api_key, model: row.selected_model ?? undefined };
      }
    }
    return config;
  } catch {
    logger.warn('Failed to read provider config, starting fresh');
    return {};
  }
}

export async function setProviderKey(provider: string, apiKey: string): Promise<void> {
  const envKey = PROVIDER_TO_ENV[provider];
  if (!envKey) return;

  const { error } = await getClient()
    .from(TABLE)
    .upsert(
      { tenant_id: TENANT_ID, provider_name: provider, api_key: apiKey, updated_at: new Date().toISOString() },
      { onConflict: 'tenant_id,provider_name' },
    );

  if (error) {
    logger.error('Failed to save provider key', { provider, error: error.message });
    throw new Error(`Failed to save provider key: ${error.message}`);
  }

  process.env[envKey] = apiKey;
}

export async function removeProviderKey(provider: string): Promise<void> {
  const envKey = PROVIDER_TO_ENV[provider];
  if (!envKey) return;

  const { error } = await getClient()
    .from(TABLE)
    .delete()
    .eq('tenant_id', TENANT_ID)
    .eq('provider_name', provider);

  if (error) {
    logger.error('Failed to remove provider key', { provider, error: error.message });
  }

  delete process.env[envKey];
}

export async function getProviderModel(provider: string): Promise<string | undefined> {
  const envKey = PROVIDER_TO_ENV[provider];
  if (!envKey) return undefined;

  const { data, error } = await getClient()
    .from(TABLE)
    .select('selected_model')
    .eq('tenant_id', TENANT_ID)
    .eq('provider_name', provider)
    .maybeSingle();

  if (error || !data) return undefined;
  return (data as Pick<DbProviderConfigRow, 'selected_model'>).selected_model ?? undefined;
}

export async function setProviderModel(provider: string, model: string): Promise<void> {
  const envKey = PROVIDER_TO_ENV[provider];
  if (!envKey) return;

  const { error } = await getClient()
    .from(TABLE)
    .update({ selected_model: model, updated_at: new Date().toISOString() })
    .eq('tenant_id', TENANT_ID)
    .eq('provider_name', provider);

  if (error) {
    logger.error('Failed to update provider model', { provider, error: error.message });
  }
}

export function getProviderKeyEnvName(provider: string): EnvKeyName | undefined {
  return PROVIDER_TO_ENV[provider];
}

/**
 * Load stored keys from Supabase into process.env.
 * Must be awaited before accessing provider config.
 */
export async function hydrateKeysToEnv(): Promise<void> {
  const config = await loadStoredConfig();
  let count = 0;
  for (const [envKey, entry] of Object.entries(config)) {
    const apiKey = typeof entry === 'string' ? entry : entry?.apiKey;
    if (apiKey && !process.env[envKey]) {
      process.env[envKey] = apiKey;
      count++;
    }
  }
  if (count > 0) {
    logger.info('Loaded stored provider keys', { count });
  }
}
