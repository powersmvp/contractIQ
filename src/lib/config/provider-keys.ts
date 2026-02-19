import fs from 'fs';
import path from 'path';
import { logger } from '@/lib/logger/logger';

const KEYS_FILE = path.join(process.cwd(), 'data', 'provider-keys.json');

/** New format: each entry can be a string (legacy) or an object with apiKey + model */
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

function ensureDataDir(): void {
  const dir = path.dirname(KEYS_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/** Normalize a stored entry (string or object) to ProviderEntry */
function normalizeEntry(entry: string | ProviderEntry): ProviderEntry {
  if (typeof entry === 'string') return { apiKey: entry };
  return entry;
}

export function loadStoredConfig(): StoredConfig {
  try {
    if (fs.existsSync(KEYS_FILE)) {
      const raw = fs.readFileSync(KEYS_FILE, 'utf-8');
      return JSON.parse(raw) as StoredConfig;
    }
  } catch {
    logger.warn('Failed to read provider keys file, starting fresh');
  }
  return {};
}

function saveStoredConfig(config: StoredConfig): void {
  ensureDataDir();
  fs.writeFileSync(KEYS_FILE, JSON.stringify(config, null, 2));
}

/** Get the API key for a provider (handles both legacy string and new object format) */
function getEntryApiKey(entry: string | ProviderEntry | undefined): string | undefined {
  if (!entry) return undefined;
  if (typeof entry === 'string') return entry;
  return entry.apiKey;
}

export function setProviderKey(provider: string, apiKey: string): void {
  const envKey = PROVIDER_TO_ENV[provider];
  if (!envKey) return;

  const config = loadStoredConfig();
  const existing = config[envKey];
  const entry = existing && typeof existing === 'object' ? { ...existing, apiKey } : { apiKey };
  config[envKey] = entry;
  saveStoredConfig(config);

  process.env[envKey] = apiKey;
}

export function removeProviderKey(provider: string): void {
  const envKey = PROVIDER_TO_ENV[provider];
  if (!envKey) return;

  const config = loadStoredConfig();
  delete config[envKey];
  saveStoredConfig(config);

  delete process.env[envKey];
}

export function getProviderModel(provider: string): string | undefined {
  const envKey = PROVIDER_TO_ENV[provider];
  if (!envKey) return undefined;

  const config = loadStoredConfig();
  const entry = config[envKey];
  if (entry && typeof entry === 'object') return entry.model;
  return undefined;
}

export function setProviderModel(provider: string, model: string): void {
  const envKey = PROVIDER_TO_ENV[provider];
  if (!envKey) return;

  const config = loadStoredConfig();
  const existing = config[envKey];
  const apiKey = getEntryApiKey(existing);
  if (!apiKey) return; // can't set model without an API key

  config[envKey] = { apiKey, model };
  saveStoredConfig(config);
}

export function getProviderKeyEnvName(provider: string): EnvKeyName | undefined {
  return PROVIDER_TO_ENV[provider];
}

/**
 * Load stored keys into process.env on startup.
 * Handles both legacy (string) and new (object) format.
 */
export function hydrateKeysToEnv(): void {
  const config = loadStoredConfig();
  let count = 0;
  for (const [envKey, entry] of Object.entries(config)) {
    const apiKey = getEntryApiKey(entry as string | ProviderEntry);
    if (apiKey && !process.env[envKey]) {
      process.env[envKey] = apiKey;
      count++;
    }
  }
  if (count > 0) {
    logger.info('Loaded stored provider keys', { count });
  }
}
