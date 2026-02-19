import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { loadConfig } from '@/lib/config/env.config';

const BUCKET = 'job-files';

let client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (!client) {
    const config = loadConfig();
    client = createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_KEY);
  }
  return client;
}

export async function uploadFile(jobId: string, filename: string, data: Buffer | Uint8Array): Promise<void> {
  const path = `${jobId}/${filename}`;
  const { error } = await getClient().storage.from(BUCKET).upload(path, data, {
    upsert: true,
    contentType: filename.endsWith('.docx')
      ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      : 'application/octet-stream',
  });
  if (error) throw new Error(`Storage upload failed for ${path}: ${error.message}`);
}

export async function downloadFile(jobId: string, filename: string): Promise<Buffer | null> {
  const path = `${jobId}/${filename}`;
  const { data, error } = await getClient().storage.from(BUCKET).download(path);
  if (error) {
    if (error.message.includes('not found') || error.message.includes('Object not found')) {
      return null;
    }
    throw new Error(`Storage download failed for ${path}: ${error.message}`);
  }
  const arrayBuffer = await data.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export async function deleteJobFiles(jobId: string): Promise<void> {
  const { data: files, error: listError } = await getClient().storage.from(BUCKET).list(jobId);
  if (listError) {
    if (listError.message.includes('not found')) return;
    throw new Error(`Storage list failed for ${jobId}: ${listError.message}`);
  }
  if (!files || files.length === 0) return;

  const paths = files.map((f) => `${jobId}/${f.name}`);
  const { error: removeError } = await getClient().storage.from(BUCKET).remove(paths);
  if (removeError) throw new Error(`Storage delete failed for ${jobId}: ${removeError.message}`);
}

export function resetStorageClient(): void {
  client = null;
}
