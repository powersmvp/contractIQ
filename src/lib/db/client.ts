import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { loadConfig } from '@/lib/config/env.config';

let client: SupabaseClient | null = null;

export function getClient(): SupabaseClient {
  if (!client) {
    const config = loadConfig();
    client = createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_KEY);
  }
  return client;
}

export function resetClient(): void {
  client = null;
}

/** No-op kept for backward compatibility (Supabase JS uses HTTP, no pool to close) */
export async function closeDb(): Promise<void> {}
