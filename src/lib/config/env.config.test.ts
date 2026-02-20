import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { loadConfig, resetConfigCache, getActiveProviders, getProviderConfig } from './env.config';

describe('env.config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    resetConfigCache();
    process.env = { ...originalEnv };
    // Remove any keys hydrated from provider config so tests start clean
    delete process.env.OPENAI_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.GOOGLE_AI_API_KEY;
    delete process.env.MISTRAL_API_KEY;
    delete process.env.LLAMA_API_KEY;
    // Required Supabase vars for config validation
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
    process.env.SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_KEY = 'test-service-key';
  });

  afterEach(() => {
    process.env = originalEnv;
    resetConfigCache();
  });

  describe('loadConfig', () => {
    it('loads config with defaults when no env vars set', () => {
      const config = loadConfig();
      expect(config.DATABASE_URL).toBe('postgresql://test:test@localhost:5432/test');
      expect(config.SUPABASE_URL).toBe('https://test.supabase.co');
      expect(config.SUPABASE_SERVICE_KEY).toBe('test-service-key');
      expect(config.JOB_EXPIRATION_HOURS).toBe(24);
      expect(config.LLM_TIMEOUT_MS).toBe(300000);
      expect(config.LLM_MAX_RETRIES).toBe(2);
      expect(config.DEFAULT_TENANT_ID).toBe('default');
    });

    it('reads API keys from env', () => {
      process.env.OPENAI_API_KEY = 'sk-test-123';
      process.env.ANTHROPIC_API_KEY = 'sk-ant-test';
      const config = loadConfig();
      expect(config.OPENAI_API_KEY).toBe('sk-test-123');
      expect(config.ANTHROPIC_API_KEY).toBe('sk-ant-test');
    });

    it('uses custom values from env', () => {
      process.env.LLM_TIMEOUT_MS = '60000';
      process.env.JOB_EXPIRATION_HOURS = '12';
      const config = loadConfig();
      expect(config.LLM_TIMEOUT_MS).toBe(60000);
      expect(config.JOB_EXPIRATION_HOURS).toBe(12);
    });

    it('caches config on subsequent calls', () => {
      const config1 = loadConfig();
      process.env.LLM_TIMEOUT_MS = '999';
      const config2 = loadConfig();
      expect(config1).toBe(config2);
      expect(config2.LLM_TIMEOUT_MS).toBe(config1.LLM_TIMEOUT_MS);
    });

    it('rejects invalid base URL', () => {
      process.env.OPENAI_BASE_URL = 'not-a-url';
      expect(() => loadConfig()).toThrow('Invalid environment configuration');
    });
  });

  describe('getActiveProviders', () => {
    it('returns empty when no keys configured', () => {
      expect(getActiveProviders()).toEqual([]);
    });

    it('returns providers with configured keys', () => {
      process.env.OPENAI_API_KEY = 'sk-test';
      process.env.ANTHROPIC_API_KEY = 'sk-ant';
      process.env.GOOGLE_AI_API_KEY = 'gai-key';
      const active = getActiveProviders();
      expect(active).toContain('gpt');
      expect(active).toContain('claude');
      expect(active).toContain('gemini');
      expect(active).not.toContain('mistral');
      expect(active).not.toContain('llama');
    });

    it('ignores empty string keys', () => {
      process.env.OPENAI_API_KEY = '';
      expect(getActiveProviders()).toEqual([]);
    });
  });

  describe('getProviderConfig', () => {
    it('returns API key and base URL for a provider', () => {
      process.env.OPENAI_API_KEY = 'sk-test';
      const config = getProviderConfig('gpt');
      expect(config.apiKey).toBe('sk-test');
      expect(config.baseUrl).toBe('https://api.openai.com/v1');
    });

    it('returns undefined apiKey when not configured', () => {
      const config = getProviderConfig('mistral');
      expect(config.apiKey).toBeUndefined();
      expect(config.baseUrl).toBe('https://api.mistral.ai/v1');
    });
  });
});
