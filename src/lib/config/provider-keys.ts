import { getClient } from '@/lib/db/client';
import { logger } from '@/lib/logger/logger';
import type { DbProviderConfigRow } from '@/lib/db/schema';

/** Shape kept for backward-compat with callers */
export interface ProviderEntry {
  apiKey: string;
  model?: string;
  baseUrl?: string;
}

type EnvKeyName = 'OPENAI_API_KEY' | 'ANTHROPIC_API_KEY' | 'GOOGLE_AI_API_KEY' | 'MISTRAL_API_KEY' | 'LLAMA_API_KEY';
type EnvUrlName = 'OPENAI_BASE_URL' | 'ANTHROPIC_BASE_URL' | 'GOOGLE_AI_BASE_URL' | 'MISTRAL_BASE_URL' | 'LLAMA_BASE_URL';

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

const PROVIDER_TO_URL_ENV: Record<string, EnvUrlName> = {
  gpt: 'OPENAI_BASE_URL',
  claude: 'ANTHROPIC_BASE_URL',
  gemini: 'GOOGLE_AI_BASE_URL',
  mistral: 'MISTRAL_BASE_URL',
  llama: 'LLAMA_BASE_URL',
};

const TENANT_ID = 'default';
const TABLE = 'provider_config';

export async function loadStoredConfig(): Promise<StoredConfig> {
  try {
    const client = getClient();
    const { data, error } = await client
      .from(TABLE)
      .select('*')
      .eq('tenant_id', TENANT_ID)
      .eq('is_custom', false);

    if (error) {
      logger.warn('Failed to load provider config from Supabase', { error: error.message });
      return {};
    }

    const config: StoredConfig = {};
    for (const row of (data ?? []) as DbProviderConfigRow[]) {
      const envKey = PROVIDER_TO_ENV[row.provider_name];
      if (envKey) {
        config[envKey] = {
          apiKey: row.api_key,
          model: row.selected_model ?? undefined,
          baseUrl: row.base_url ?? undefined,
        };
      }
    }
    return config;
  } catch (err) {
    logger.warn('Failed to read provider config, starting fresh', { error: err instanceof Error ? err.message : String(err) });
    return {};
  }
}

export async function setProviderKey(provider: string, apiKey: string, baseUrl?: string | null): Promise<void> {
  const envKey = PROVIDER_TO_ENV[provider];
  if (!envKey) return;

  const row: Record<string, unknown> = {
    tenant_id: TENANT_ID,
    provider_name: provider,
    api_key: apiKey,
    is_custom: false,
    updated_at: new Date().toISOString(),
  };

  // Include base_url in the upsert (null clears it)
  if (baseUrl !== undefined) {
    row.base_url = baseUrl || null;
  }

  const { error } = await getClient()
    .from(TABLE)
    .upsert(row, { onConflict: 'tenant_id,provider_name' });

  if (error) {
    logger.error('Failed to save provider key', { provider, error: error.message });
    throw new Error(`Failed to save provider key: ${error.message}`);
  }

  process.env[envKey] = apiKey;

  // Hydrate base URL env var
  const urlEnv = PROVIDER_TO_URL_ENV[provider];
  if (urlEnv && baseUrl) {
    process.env[urlEnv] = baseUrl;
  } else if (urlEnv && baseUrl === null) {
    delete process.env[urlEnv];
  }
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

  const urlEnv = PROVIDER_TO_URL_ENV[provider];
  if (urlEnv) delete process.env[urlEnv];
}

export async function getProviderModel(provider: string): Promise<string | undefined> {
  try {
    const { data, error } = await getClient()
      .from(TABLE)
      .select('selected_model')
      .eq('tenant_id', TENANT_ID)
      .eq('provider_name', provider)
      .maybeSingle();

    if (error || !data) return undefined;
    return (data as Pick<DbProviderConfigRow, 'selected_model'>).selected_model ?? undefined;
  } catch {
    return undefined;
  }
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

export async function getProviderBaseUrl(provider: string): Promise<string | null> {
  try {
    const { data, error } = await getClient()
      .from(TABLE)
      .select('base_url')
      .eq('tenant_id', TENANT_ID)
      .eq('provider_name', provider)
      .maybeSingle();

    if (error || !data) return null;
    return (data as Pick<DbProviderConfigRow, 'base_url'>).base_url;
  } catch {
    return null;
  }
}

export async function setProviderBaseUrl(provider: string, baseUrl: string | null): Promise<void> {
  const urlEnv = PROVIDER_TO_URL_ENV[provider];
  if (!urlEnv) return;

  const { error } = await getClient()
    .from(TABLE)
    .update({ base_url: baseUrl, updated_at: new Date().toISOString() })
    .eq('tenant_id', TENANT_ID)
    .eq('provider_name', provider);

  if (error) {
    logger.error('Failed to update provider base URL', { provider, error: error.message });
  }

  if (baseUrl) {
    process.env[urlEnv] = baseUrl;
  } else {
    delete process.env[urlEnv];
  }
}

export function getProviderKeyEnvName(provider: string): EnvKeyName | undefined {
  return PROVIDER_TO_ENV[provider];
}

// --- Custom Provider CRUD ---

export async function getCustomProviders(): Promise<DbProviderConfigRow[]> {
  try {
    const { data, error } = await getClient()
      .from(TABLE)
      .select('*')
      .eq('tenant_id', TENANT_ID)
      .eq('is_custom', true)
      .order('created_at', { ascending: true });

    if (error) {
      logger.warn('Failed to load custom providers', { error: error.message });
      return [];
    }
    return (data ?? []) as DbProviderConfigRow[];
  } catch {
    return [];
  }
}

export async function upsertCustomProvider(params: {
  providerName: string;
  displayName: string;
  apiKey: string;
  baseUrl: string;
  model: string;
}): Promise<void> {
  const row = {
    tenant_id: TENANT_ID,
    provider_name: params.providerName,
    api_key: params.apiKey,
    base_url: params.baseUrl,
    selected_model: params.model,
    display_name: params.displayName,
    is_custom: true,
    updated_at: new Date().toISOString(),
  };

  const { error } = await getClient()
    .from(TABLE)
    .upsert(row, { onConflict: 'tenant_id,provider_name' });

  if (error) {
    logger.error('Failed to save custom provider', { provider: params.providerName, error: error.message });
    throw new Error(`Failed to save custom provider: ${error.message}`);
  }
}

export async function deleteCustomProvider(providerName: string): Promise<void> {
  const { error } = await getClient()
    .from(TABLE)
    .delete()
    .eq('tenant_id', TENANT_ID)
    .eq('provider_name', providerName)
    .eq('is_custom', true);

  if (error) {
    logger.error('Failed to delete custom provider', { provider: providerName, error: error.message });
    throw new Error(`Failed to delete custom provider: ${error.message}`);
  }
}

/**
 * Load stored keys and base URLs from Supabase into process.env.
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

    // Hydrate base URL if custom
    if (typeof entry === 'object' && entry?.baseUrl) {
      // Find the provider name from the env key to get the URL env var
      const providerName = Object.entries(PROVIDER_TO_ENV).find(([, v]) => v === envKey)?.[0];
      if (providerName) {
        const urlEnv = PROVIDER_TO_URL_ENV[providerName];
        if (urlEnv) {
          process.env[urlEnv] = entry.baseUrl;
        }
      }
    }
  }
  if (count > 0) {
    logger.info('Loaded stored provider keys', { count });
  }
}
