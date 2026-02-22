import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { PROVIDERS } from '@/lib/config/env.config';
import { getCustomProviders, upsertCustomProvider, deleteCustomProvider } from '@/lib/config/provider-keys';
import { logger } from '@/lib/logger/logger';

const CustomProviderSchema = z.object({
  providerName: z.string().min(2).max(30).regex(/^[a-z0-9-]+$/, 'Slug deve conter apenas letras minúsculas, números e hífens')
    .refine((n) => !(PROVIDERS as readonly string[]).includes(n), 'Slug não pode ser igual a um provider nativo'),
  displayName: z.string().min(1).max(50),
  apiKey: z.string().min(1),
  baseUrl: z.string().url(),
  model: z.string().min(1),
});

const DeleteSchema = z.object({
  providerName: z.string().min(1),
});

export async function GET() {
  try {
    const customs = await getCustomProviders();
    const providers = customs.map((c) => ({
      name: c.provider_name,
      displayName: c.display_name,
      status: 'active',
      configured: true,
      maskedKey: `${c.api_key.slice(0, 4)}..${c.api_key.slice(-4)}`,
      baseUrl: c.base_url,
      selectedModel: c.selected_model,
      isCustom: true,
    }));

    return NextResponse.json({ data: { providers } });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error('GET /api/config/custom-providers failed', { error: message });
    return NextResponse.json(
      { error: { code: 'CONFIG_ERROR', message } },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: 'INVALID_JSON', message: 'Request body must be valid JSON' } },
      { status: 400 },
    );
  }

  const parsed = CustomProviderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'INVALID_PARAMS', message: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ') } },
      { status: 422 },
    );
  }

  try {
    await upsertCustomProvider(parsed.data);
    logger.info('Custom provider saved', { provider: parsed.data.providerName });

    return NextResponse.json({
      data: { provider: parsed.data.providerName, status: 'active' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error('POST /api/config/custom-providers failed', { error: message });
    return NextResponse.json(
      { error: { code: 'SAVE_ERROR', message } },
      { status: 500 },
    );
  }
}

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

  const parsed = DeleteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'INVALID_PARAMS', message: 'providerName is required' } },
      { status: 422 },
    );
  }

  try {
    await deleteCustomProvider(parsed.data.providerName);
    logger.info('Custom provider removed', { provider: parsed.data.providerName });

    return NextResponse.json({
      data: { provider: parsed.data.providerName, status: 'removed' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error('DELETE /api/config/custom-providers failed', { error: message });
    return NextResponse.json(
      { error: { code: 'DELETE_ERROR', message } },
      { status: 500 },
    );
  }
}
