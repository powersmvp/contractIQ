import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { PROVIDERS, getProviderConfig, resetConfigCache } from '@/lib/config/env.config';
import { setProviderKey, removeProviderKey, setProviderModel, hydrateKeysToEnv } from '@/lib/config/provider-keys';
import { getAdapter } from '@/lib/adapters';
import { PROVIDER_MODELS, getSelectedModel } from '@/lib/config/provider-models';
import { logger } from '@/lib/logger/logger';

const TestResponseSchema = z.object({}).passthrough();

export async function GET() {
  try {
    try { await hydrateKeysToEnv(); } catch { /* Supabase may be unreachable on first call */ }
    resetConfigCache();

    const providers = await Promise.all(
      PROVIDERS.map(async (name) => {
        const { apiKey } = getProviderConfig(name);
        const hasKey = typeof apiKey === 'string' && apiKey.length > 0;
        return {
          name,
          status: hasKey ? 'active' : 'inactive',
          configured: hasKey,
          maskedKey: hasKey ? `${apiKey.slice(0, 4)}..${apiKey.slice(-4)}` : null,
          selectedModel: await getSelectedModel(name),
          availableModels: PROVIDER_MODELS[name],
        };
      }),
    );

    return NextResponse.json({ data: { providers } });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error('GET /api/config/providers failed', { error: message });
    return NextResponse.json(
      { error: { code: 'CONFIG_ERROR', message } },
      { status: 500 },
    );
  }
}

const PutBodySchema = z.object({
  provider: z.enum(PROVIDERS),
  apiKey: z.string().min(1),
  validate: z.boolean().default(false),
});

export async function PUT(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: 'INVALID_JSON', message: 'Request body must be valid JSON' } },
      { status: 400 },
    );
  }

  const parsed = PutBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'INVALID_PARAMS', message: parsed.error.issues.map((i) => i.message).join('; ') } },
      { status: 422 },
    );
  }

  const { provider, apiKey, validate } = parsed.data;

  await setProviderKey(provider, apiKey);
  resetConfigCache();

  logger.info('Provider key saved', { provider });

  if (validate) {
    try {
      const adapter = await getAdapter(provider);
      if (!adapter) {
        return NextResponse.json(
          { error: { code: 'ADAPTER_ERROR', message: 'Falha ao criar adapter para o provider' } },
          { status: 500 },
        );
      }

      const result = await adapter.call(
        'Respond with exactly this JSON: {"status": "ok"}',
        TestResponseSchema,
      );

      if (result) {
        return NextResponse.json({
          data: { provider, status: 'active', validated: true },
        });
      }

      return NextResponse.json({
        data: { provider, status: 'active', validated: false, warning: 'Chave salva, mas a validação falhou.' },
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
      logger.error('Provider key validation error', { provider, errorMsg });
      return NextResponse.json({
        data: { provider, status: 'active', validated: false, warning: `Chave salva, mas erro durante validação: ${errorMsg}` },
      });
    }
  }

  return NextResponse.json({
    data: { provider, status: 'active', validated: false },
  });
}

const PatchBodySchema = z.object({
  provider: z.enum(PROVIDERS),
  model: z.string().min(1),
});

export async function PATCH(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: 'INVALID_JSON', message: 'Request body must be valid JSON' } },
      { status: 400 },
    );
  }

  const parsed = PatchBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'INVALID_PARAMS', message: parsed.error.issues.map((i) => i.message).join('; ') } },
      { status: 422 },
    );
  }

  const { provider, model } = parsed.data;

  // Validate model exists for this provider
  const validModels = PROVIDER_MODELS[provider].map((m) => m.id);
  if (!validModels.includes(model)) {
    return NextResponse.json(
      { error: { code: 'INVALID_MODEL', message: `Modelo inválido para ${provider}. Válidos: ${validModels.join(', ')}` } },
      { status: 422 },
    );
  }

  await setProviderModel(provider, model);
  resetConfigCache();

  logger.info('Provider model updated', { provider, model });

  return NextResponse.json({
    data: { provider, selectedModel: model },
  });
}

const DeleteBodySchema = z.object({
  provider: z.enum(PROVIDERS),
});

export async function DELETE(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: 'INVALID_JSON', message: 'Request body must be valid JSON' } },
      { status: 400 },
    );
  }

  const parsed = DeleteBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'INVALID_PARAMS', message: 'Provider name is required' } },
      { status: 422 },
    );
  }

  await removeProviderKey(parsed.data.provider);
  resetConfigCache();

  logger.info('Provider key removed', { provider: parsed.data.provider });

  return NextResponse.json({
    data: { provider: parsed.data.provider, status: 'inactive' },
  });
}
