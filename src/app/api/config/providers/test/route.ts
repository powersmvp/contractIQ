import { NextResponse } from 'next/server';
import { z } from 'zod';
import axios from 'axios';
import { getActiveProviders, getProviderConfig } from '@/lib/config/env.config';
import type { ProviderName } from '@/lib/config/env.config';

const SimpleSchema = z.object({
  status: z.string(),
}).passthrough();

async function testProvider(name: ProviderName) {
  const { apiKey, baseUrl } = getProviderConfig(name);
  if (!apiKey) return { provider: name, success: false, error: 'Sem API key' };

  const start = Date.now();

  try {
    let url: string;
    let body: unknown;
    let headers: Record<string, string> = { 'Content-Type': 'application/json' };

    if (name === 'gpt') {
      url = `${baseUrl}/chat/completions`;
      body = {
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: 'Respond with valid JSON only.' },
          { role: 'user', content: 'Respond: {"status":"ok"}' },
        ],
        response_format: { type: 'json_object' },
      };
      headers['Authorization'] = `Bearer ${apiKey}`;
    } else if (name === 'claude') {
      url = `${baseUrl}/v1/messages`;
      body = {
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 256,
        messages: [{ role: 'user', content: 'Respond with exactly: {"status":"ok"}' }],
      };
      headers['x-api-key'] = apiKey;
      headers['anthropic-version'] = '2023-06-01';
    } else if (name === 'gemini') {
      url = `${baseUrl}/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
      body = {
        contents: [{ parts: [{ text: 'Respond with exactly: {"status":"ok"}' }] }],
        generationConfig: { temperature: 0.0, responseMimeType: 'application/json' },
      };
    } else if (name === 'mistral') {
      url = `${baseUrl}/chat/completions`;
      body = {
        model: 'mistral-small-latest',
        messages: [{ role: 'user', content: 'Respond: {"status":"ok"}' }],
        response_format: { type: 'json_object' },
      };
      headers['Authorization'] = `Bearer ${apiKey}`;
    } else {
      url = `${baseUrl}/chat/completions`;
      body = {
        model: 'meta-llama/Llama-3-70b-chat-hf',
        messages: [{ role: 'user', content: 'Respond: {"status":"ok"}' }],
      };
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    const response = await axios.post(url, body, { headers, timeout: 30000 });
    const durationMs = Date.now() - start;

    // Return raw response structure (keys only, not values) + status
    const responseKeys = Object.keys(response.data);

    return {
      provider: name,
      success: true,
      httpStatus: response.status,
      responseKeys,
      rawPreview: JSON.stringify(response.data).slice(0, 500),
      durationMs,
    };
  } catch (err) {
    const durationMs = Date.now() - start;
    if (axios.isAxiosError(err)) {
      return {
        provider: name,
        success: false,
        httpStatus: err.response?.status,
        error: err.message,
        responseBody: JSON.stringify(err.response?.data)?.slice(0, 500),
        durationMs,
      };
    }
    return {
      provider: name,
      success: false,
      error: err instanceof Error ? err.message : 'Erro desconhecido',
      durationMs,
    };
  }
}

export async function GET() {
  const active = getActiveProviders();

  if (active.length === 0) {
    return NextResponse.json({ error: 'Nenhum provider configurado' }, { status: 400 });
  }

  const results = await Promise.all(active.map(testProvider));
  return NextResponse.json({ data: results });
}
