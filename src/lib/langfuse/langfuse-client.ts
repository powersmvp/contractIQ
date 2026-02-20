import { Langfuse } from 'langfuse';
import { loadConfig } from '@/lib/config/env.config';

let instance: Langfuse | null | undefined;

export function getLangfuse(): Langfuse | null {
  if (instance !== undefined) return instance;

  const config = loadConfig();
  const { LANGFUSE_SECRET_KEY, LANGFUSE_PUBLIC_KEY, LANGFUSE_BASE_URL } = config;

  if (!LANGFUSE_SECRET_KEY || !LANGFUSE_PUBLIC_KEY) {
    instance = null;
    return null;
  }

  instance = new Langfuse({
    secretKey: LANGFUSE_SECRET_KEY,
    publicKey: LANGFUSE_PUBLIC_KEY,
    baseUrl: LANGFUSE_BASE_URL,
  });

  return instance;
}

export function resetLangfuseClient(): void {
  instance = undefined;
}
