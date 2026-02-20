import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { z } from 'zod';
import axios from 'axios';
import { GptAdapter } from './gpt.adapter';
import { ClaudeAdapter } from './claude.adapter';
import { GeminiAdapter } from './gemini.adapter';
import { MistralAdapter } from './mistral.adapter';
import { LlamaAdapter } from './llama.adapter';
import { getAdapters } from './index';
import { resetConfigCache } from '@/lib/config/env.config';

vi.mock('axios', async () => {
  const create = vi.fn(() => ({
    post: vi.fn(),
  }));
  return {
    default: {
      create,
      isAxiosError: vi.fn((err: unknown) => err && typeof err === 'object' && 'isAxiosError' in err),
    },
  };
});

vi.mock('@/lib/config/provider-keys', () => ({
  getProviderModel: vi.fn().mockResolvedValue(undefined),
  getProviderKeyEnvName: vi.fn(),
  hydrateKeysToEnv: vi.fn().mockResolvedValue(undefined),
  loadStoredConfig: vi.fn().mockResolvedValue({}),
  setProviderKey: vi.fn().mockResolvedValue(undefined),
  removeProviderKey: vi.fn().mockResolvedValue(undefined),
  setProviderModel: vi.fn().mockResolvedValue(undefined),
}));

const TestSchema = z.object({
  result: z.string(),
  score: z.number(),
});

describe('GptAdapter', () => {
  let adapter: GptAdapter;
  let mockPost: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    resetConfigCache();
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
    process.env.SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_KEY = 'test-service-key';
    process.env.LLM_TIMEOUT_MS = '90000';
    process.env.LLM_MAX_RETRIES = '2';
    adapter = new GptAdapter('sk-test', 'https://api.openai.com/v1', 'gpt-4o');
    mockPost = (adapter as unknown as { client: { post: ReturnType<typeof vi.fn> } }).client.post;
  });

  it('returns parsed data on successful call', async () => {
    mockPost.mockResolvedValueOnce({
      data: {
        choices: [{ message: { content: JSON.stringify({ result: 'ok', score: 95 }) } }],
      },
    });

    const response = await adapter.call('Analyze this', TestSchema);
    expect(response).not.toBeNull();
    expect(response!.data).toEqual({ result: 'ok', score: 95 });
    expect(response!.provider).toBe('gpt');
    expect(response!.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('retries on invalid JSON and succeeds', async () => {
    mockPost
      .mockResolvedValueOnce({
        data: { choices: [{ message: { content: 'not json' } }] },
      })
      .mockResolvedValueOnce({
        data: { choices: [{ message: { content: JSON.stringify({ result: 'ok', score: 80 }) } }] },
      });

    const response = await adapter.call('Analyze this', TestSchema);
    expect(response).not.toBeNull();
    expect(response!.data.result).toBe('ok');
    expect(mockPost).toHaveBeenCalledTimes(2);
  });

  it('retries on Zod validation failure', async () => {
    mockPost
      .mockResolvedValueOnce({
        data: { choices: [{ message: { content: JSON.stringify({ result: 'ok' }) } }] }, // missing score
      })
      .mockResolvedValueOnce({
        data: { choices: [{ message: { content: JSON.stringify({ result: 'ok', score: 90 }) } }] },
      });

    const response = await adapter.call('Analyze this', TestSchema);
    expect(response).not.toBeNull();
    expect(response!.data.score).toBe(90);
  });

  it('throws after exhausting retries', async () => {
    mockPost
      .mockResolvedValueOnce({ data: { choices: [{ message: { content: 'bad1' } }] } })
      .mockResolvedValueOnce({ data: { choices: [{ message: { content: 'bad2' } }] } })
      .mockResolvedValueOnce({ data: { choices: [{ message: { content: 'bad3' } }] } });

    await expect(adapter.call('Analyze this', TestSchema)).rejects.toThrow('falhou após 3 tentativas');
    expect(mockPost).toHaveBeenCalledTimes(3);
  });

  it('throws on timeout (no retry)', async () => {
    const timeoutError = new Error('timeout');
    Object.assign(timeoutError, { code: 'ECONNABORTED', isAxiosError: true });
    vi.mocked(axios.isAxiosError).mockReturnValueOnce(true);
    mockPost.mockRejectedValueOnce(timeoutError);

    await expect(adapter.call('Analyze this', TestSchema)).rejects.toThrow('timeout');
    expect(mockPost).toHaveBeenCalledTimes(1);
  });

  it('throws on HTTP error (no retry)', async () => {
    const httpError = new Error('Server Error');
    Object.assign(httpError, { response: { status: 500 }, isAxiosError: true });
    vi.mocked(axios.isAxiosError).mockReturnValueOnce(false);
    mockPost.mockRejectedValueOnce(httpError);

    await expect(adapter.call('Analyze this', TestSchema)).rejects.toThrow();
    expect(mockPost).toHaveBeenCalledTimes(1);
  });
});

describe('ClaudeAdapter', () => {
  let adapter: ClaudeAdapter;
  let mockPost: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    resetConfigCache();
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
    process.env.SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_KEY = 'test-service-key';
    process.env.LLM_TIMEOUT_MS = '90000';
    process.env.LLM_MAX_RETRIES = '2';
    adapter = new ClaudeAdapter('sk-ant-test', 'https://api.anthropic.com', 'claude-haiku-4-5-20251001');
    mockPost = (adapter as unknown as { client: { post: ReturnType<typeof vi.fn> } }).client.post;
  });

  it('extracts text from Anthropic response format', async () => {
    mockPost.mockResolvedValueOnce({
      data: {
        content: [{ type: 'text', text: JSON.stringify({ result: 'good', score: 88 }) }],
      },
    });

    const response = await adapter.call('Analyze', TestSchema);
    expect(response).not.toBeNull();
    expect(response!.data).toEqual({ result: 'good', score: 88 });
    expect(response!.provider).toBe('claude');
  });
});

describe('GeminiAdapter', () => {
  let adapter: GeminiAdapter;
  let mockPost: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    resetConfigCache();
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
    process.env.SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_KEY = 'test-service-key';
    process.env.LLM_TIMEOUT_MS = '90000';
    process.env.LLM_MAX_RETRIES = '2';
    adapter = new GeminiAdapter('gai-test', 'https://generativelanguage.googleapis.com', 'gemini-2.0-flash');
    mockPost = (adapter as unknown as { client: { post: ReturnType<typeof vi.fn> } }).client.post;
  });

  it('extracts text from Gemini response format', async () => {
    mockPost.mockResolvedValueOnce({
      data: {
        candidates: [{ content: { parts: [{ text: JSON.stringify({ result: 'ok', score: 77 }) }] } }],
      },
    });

    const response = await adapter.call('Analyze', TestSchema);
    expect(response).not.toBeNull();
    expect(response!.data).toEqual({ result: 'ok', score: 77 });
    expect(response!.provider).toBe('gemini');
  });
});

describe('MistralAdapter', () => {
  it('has correct provider name', () => {
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
    process.env.SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_KEY = 'test-service-key';
    process.env.LLM_TIMEOUT_MS = '90000';
    process.env.LLM_MAX_RETRIES = '2';
    resetConfigCache();
    const adapter = new MistralAdapter('key', 'https://api.mistral.ai/v1', 'mistral-small-latest');
    expect(adapter.name).toBe('mistral');
  });
});

describe('LlamaAdapter', () => {
  it('has correct provider name', () => {
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
    process.env.SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_KEY = 'test-service-key';
    process.env.LLM_TIMEOUT_MS = '90000';
    process.env.LLM_MAX_RETRIES = '2';
    resetConfigCache();
    const adapter = new LlamaAdapter('key', 'https://api.together.xyz/v1', 'meta-llama/Llama-3.1-8B-Instruct-Turbo');
    expect(adapter.name).toBe('llama');
  });
});

describe('getAdapters', () => {
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
    // Required Supabase vars
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
    process.env.SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_KEY = 'test-service-key';
  });

  afterEach(() => {
    process.env = originalEnv;
    resetConfigCache();
  });

  it('returns empty array when no keys configured', async () => {
    const adapters = await getAdapters();
    expect(adapters).toHaveLength(0);
  });

  it('returns adapters for configured providers', async () => {
    process.env.OPENAI_API_KEY = 'sk-test';
    process.env.ANTHROPIC_API_KEY = 'sk-ant';
    process.env.GOOGLE_AI_API_KEY = 'gai';
    const adapters = await getAdapters();
    expect(adapters).toHaveLength(3);
    expect(adapters.map((a) => a.name)).toEqual(['gpt', 'claude', 'gemini']);
  });
});
