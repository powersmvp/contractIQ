import { z } from 'zod';

const EnvSchema = z.object({
  // LLM Provider API Keys (all optional - at least 3 must be configured)
  OPENAI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  GOOGLE_AI_API_KEY: z.string().optional(),
  MISTRAL_API_KEY: z.string().optional(),
  LLAMA_API_KEY: z.string().optional(),

  // LLM Provider Endpoints
  OPENAI_BASE_URL: z.string().url().default('https://api.openai.com/v1'),
  ANTHROPIC_BASE_URL: z.string().url().default('https://api.anthropic.com'),
  GOOGLE_AI_BASE_URL: z.string().url().default('https://generativelanguage.googleapis.com'),
  MISTRAL_BASE_URL: z.string().url().default('https://api.mistral.ai/v1'),
  LLAMA_BASE_URL: z.string().url().default('https://api.together.xyz/v1'),

  // Database & Storage (Supabase)
  DATABASE_URL: z.string().optional(),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_KEY: z.string().min(1),

  // Job Configuration (JOBS_DATA_DIR deprecated — kept for backward compat)
  JOBS_DATA_DIR: z.string().optional(),
  JOB_EXPIRATION_HOURS: z.coerce.number().int().positive().default(24),
  JOB_CLEANUP_INTERVAL_MINUTES: z.coerce.number().int().positive().default(30),

  // LLM Configuration
  LLM_TIMEOUT_MS: z.coerce.number().int().positive().default(300000),
  LLM_MAX_RETRIES: z.coerce.number().int().min(0).max(5).default(2),

  // Langfuse Observability (opt-in)
  LANGFUSE_SECRET_KEY: z.string().optional(),
  LANGFUSE_PUBLIC_KEY: z.string().optional(),
  LANGFUSE_BASE_URL: z.string().url().optional(),

  // Tenant
  DEFAULT_TENANT_ID: z.string().default('default'),
});

export type EnvConfig = z.infer<typeof EnvSchema>;

let cachedConfig: EnvConfig | null = null;

export function loadConfig(): EnvConfig {
  if (cachedConfig) return cachedConfig;

  const result = EnvSchema.safeParse(process.env);

  if (!result.success) {
    const formatted = result.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${formatted}`);
  }

  cachedConfig = result.data;
  return cachedConfig;
}

export function resetConfigCache(): void {
  cachedConfig = null;
}

export const PROVIDERS = ['gpt', 'claude', 'gemini', 'mistral', 'llama'] as const;
export type ProviderName = (typeof PROVIDERS)[number];

const PROVIDER_KEY_MAP: Record<ProviderName, keyof EnvConfig> = {
  gpt: 'OPENAI_API_KEY',
  claude: 'ANTHROPIC_API_KEY',
  gemini: 'GOOGLE_AI_API_KEY',
  mistral: 'MISTRAL_API_KEY',
  llama: 'LLAMA_API_KEY',
};

const PROVIDER_URL_MAP: Record<ProviderName, keyof EnvConfig> = {
  gpt: 'OPENAI_BASE_URL',
  claude: 'ANTHROPIC_BASE_URL',
  gemini: 'GOOGLE_AI_BASE_URL',
  mistral: 'MISTRAL_BASE_URL',
  llama: 'LLAMA_BASE_URL',
};

export function getProviderConfig(provider: ProviderName): { apiKey: string | undefined; baseUrl: string } {
  const config = loadConfig();
  return {
    apiKey: config[PROVIDER_KEY_MAP[provider]] as string | undefined,
    baseUrl: config[PROVIDER_URL_MAP[provider]] as string,
  };
}

export function getActiveProviders(): ProviderName[] {
  const config = loadConfig();
  return PROVIDERS.filter((p) => {
    const key = config[PROVIDER_KEY_MAP[p]];
    return typeof key === 'string' && key.length > 0;
  });
}
