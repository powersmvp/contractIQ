import { JobMetaSchema, type JobMeta, type ContractType, type Side, type DebateMode } from '@/lib/schemas/job-meta.schema';
import { loadConfig, type ProviderName } from '@/lib/config/env.config';
import { logger } from '@/lib/logger/logger';
import { getClient } from '@/lib/db/client';
import { dbRowToJobRow, type DbJobRow, type JobRow } from '@/lib/db/schema';
import { uploadFile, downloadFile, deleteJobFiles } from '@/lib/db/storage';

export interface CreateJobParams {
  contractType: ContractType;
  side: Side;
  jurisdiction: string;
  tenantId?: string;
  debateMode?: DebateMode;
  selectedProviders?: ProviderName[];
}

/** Convert a DB row into the JobMeta shape expected by the rest of the app. */
function rowToMeta(row: JobRow): JobMeta {
  return JobMetaSchema.parse({
    jobId: row.id,
    tenantId: row.tenantId,
    status: row.status,
    contractType: row.contractType,
    side: row.side,
    jurisdiction: row.jurisdiction,
    currentStage: row.currentStage ?? undefined,
    progress:
      row.progressCompleted != null && row.progressTotal != null
        ? { completed: row.progressCompleted, total: row.progressTotal }
        : undefined,
    debateMode: row.debateMode ?? undefined,
    selectedProviders: (row.selectedProviders as string[] | null) ?? undefined,
    errorCode: row.errorCode ?? undefined,
    errorMessage: row.errorMessage ?? undefined,
    feedback:
      row.feedbackRating != null
        ? {
            rating: row.feedbackRating,
            reason: row.feedbackReason ?? undefined,
            comment: row.feedbackComment ?? undefined,
            createdAt: row.feedbackCreatedAt?.toISOString() ?? new Date().toISOString(),
          }
        : undefined,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  });
}

export async function createJob(params: CreateJobParams): Promise<JobMeta> {
  const config = loadConfig();
  const sb = getClient();

  const { data, error } = await sb
    .from('jobs')
    .insert({
      tenant_id: params.tenantId ?? config.DEFAULT_TENANT_ID,
      status: 'created',
      contract_type: params.contractType,
      side: params.side,
      jurisdiction: params.jurisdiction,
      debate_mode: params.debateMode ?? null,
      selected_providers: params.selectedProviders ?? null,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create job: ${error.message}`);

  const meta = rowToMeta(dbRowToJobRow(data as DbJobRow));
  logger.info('Job created', { jobId: meta.jobId, status: 'created' });
  return meta;
}

export async function getJob(jobId: string): Promise<JobMeta | null> {
  const sb = getClient();

  const { data, error } = await sb
    .from('jobs')
    .select('*')
    .eq('id', jobId)
    .maybeSingle();

  if (error) throw new Error(`Failed to get job: ${error.message}`);
  if (!data) return null;

  return rowToMeta(dbRowToJobRow(data as DbJobRow));
}

export async function updateJob(
  jobId: string,
  updates: Partial<Omit<JobMeta, 'jobId' | 'tenantId' | 'createdAt'>>,
): Promise<JobMeta | null> {
  const sb = getClient();

  const set: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (updates.status !== undefined) set.status = updates.status;
  if (updates.contractType !== undefined) set.contract_type = updates.contractType;
  if (updates.side !== undefined) set.side = updates.side;
  if (updates.jurisdiction !== undefined) set.jurisdiction = updates.jurisdiction;
  if (updates.currentStage !== undefined) set.current_stage = updates.currentStage;
  if (updates.debateMode !== undefined) set.debate_mode = updates.debateMode;
  if (updates.selectedProviders !== undefined) set.selected_providers = updates.selectedProviders;
  if (updates.errorCode !== undefined) set.error_code = updates.errorCode;
  if (updates.errorMessage !== undefined) set.error_message = updates.errorMessage;

  if (updates.progress !== undefined) {
    set.progress_completed = updates.progress.completed;
    set.progress_total = updates.progress.total;
  }

  if (updates.feedback !== undefined) {
    set.feedback_rating = updates.feedback.rating;
    set.feedback_reason = updates.feedback.reason ?? null;
    set.feedback_comment = updates.feedback.comment ?? null;
    set.feedback_created_at = new Date(updates.feedback.createdAt).toISOString();
  }

  const { data, error } = await sb
    .from('jobs')
    .update(set)
    .eq('id', jobId)
    .select()
    .maybeSingle();

  if (error) throw new Error(`Failed to update job: ${error.message}`);
  if (!data) return null;

  const meta = rowToMeta(dbRowToJobRow(data as DbJobRow));
  logger.info('Job updated', { jobId, status: meta.status });
  return meta;
}

export async function listJobs(): Promise<JobMeta[]> {
  const sb = getClient();

  const { data, error } = await sb
    .from('jobs')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Failed to list jobs: ${error.message}`);

  return (data ?? []).map((r) => rowToMeta(dbRowToJobRow(r as DbJobRow)));
}

export async function deleteJob(jobId: string): Promise<boolean> {
  const sb = getClient();
  try {
    const { error } = await sb.from('jobs').delete().eq('id', jobId);
    if (error) throw error;
    await deleteJobFiles(jobId);
    logger.info('Job deleted', { jobId });
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// File routing: maps virtual filenames to DB columns or Storage
// ---------------------------------------------------------------------------

/**
 * Parses a virtual filename and returns routing info.
 *
 * Routing rules:
 *   input.docx / output.docx           → Supabase Storage
 *   docast.json                         → DB: jobs.docast
 *   personas/{provider}.json            → DB: jobs.persona_outputs → {provider} key
 *   personas/debate/{provider}.json     → DB: jobs.debate_outputs  → {provider} key
 *   personas/verdict/{provider}.json    → DB: jobs.verdict_outputs → {provider} key
 *   consolidated.json                   → DB: jobs.consolidated
 *   report.json                         → DB: jobs.report
 */
type FileRoute =
  | { target: 'storage'; filename: string }
  | { target: 'column'; column: 'docast' | 'consolidated' | 'report' }
  | { target: 'jsonb-key'; column: 'personaOutputs' | 'debateOutputs' | 'verdictOutputs'; key: string };

function routeFile(filename: string): FileRoute {
  if (filename === 'input.docx' || filename === 'output.docx') {
    return { target: 'storage', filename };
  }
  if (filename === 'docast.json') {
    return { target: 'column', column: 'docast' };
  }
  if (filename === 'consolidated.json') {
    return { target: 'column', column: 'consolidated' };
  }
  if (filename === 'report.json') {
    return { target: 'column', column: 'report' };
  }

  // personas/{provider}.json
  const personaMatch = filename.match(/^personas\/([^/]+)\.json$/);
  if (personaMatch) {
    return { target: 'jsonb-key', column: 'personaOutputs', key: personaMatch[1] };
  }

  // personas/debate/{provider}.json
  const debateMatch = filename.match(/^personas\/debate\/([^/]+)\.json$/);
  if (debateMatch) {
    return { target: 'jsonb-key', column: 'debateOutputs', key: debateMatch[1] };
  }

  // personas/verdict/{provider}.json
  const verdictMatch = filename.match(/^personas\/verdict\/([^/]+)\.json$/);
  if (verdictMatch) {
    return { target: 'jsonb-key', column: 'verdictOutputs', key: verdictMatch[1] };
  }

  // Fallback: store in Supabase Storage
  return { target: 'storage', filename };
}

/** Maps camelCase route column names to snake_case DB column names */
const COLUMN_MAP = {
  docast: 'docast',
  consolidated: 'consolidated',
  report: 'report',
  personaOutputs: 'persona_outputs',
  debateOutputs: 'debate_outputs',
  verdictOutputs: 'verdict_outputs',
} as const;

export async function saveJobFile(jobId: string, filename: string, data: Buffer | string): Promise<void> {
  const route = routeFile(filename);
  const sb = getClient();

  if (route.target === 'storage') {
    const buf = typeof data === 'string' ? Buffer.from(data) : data;
    await uploadFile(jobId, route.filename, buf);
    return;
  }

  const col = COLUMN_MAP[route.column];

  if (route.target === 'column') {
    const json = typeof data === 'string' ? JSON.parse(data) : JSON.parse(data.toString());
    const { error } = await sb
      .from('jobs')
      .update({ [col]: json, updated_at: new Date().toISOString() })
      .eq('id', jobId);
    if (error) throw new Error(`Failed to save ${filename}: ${error.message}`);
    return;
  }

  // jsonb-key: merge into the JSONB column
  const json = typeof data === 'string' ? JSON.parse(data) : JSON.parse(data.toString());

  const { data: row, error: selectError } = await sb
    .from('jobs')
    .select(col)
    .eq('id', jobId)
    .single();
  if (selectError) throw new Error(`Failed to read ${col}: ${selectError.message}`);

  const existing = ((row as Record<string, unknown>)?.[col] as Record<string, unknown>) ?? {};
  const merged = { ...existing, [route.key]: json };

  const { error: updateError } = await sb
    .from('jobs')
    .update({ [col]: merged, updated_at: new Date().toISOString() })
    .eq('id', jobId);
  if (updateError) throw new Error(`Failed to save ${filename}: ${updateError.message}`);
}

export async function getJobFile(jobId: string, filename: string): Promise<Buffer | null> {
  const route = routeFile(filename);
  const sb = getClient();

  if (route.target === 'storage') {
    return downloadFile(jobId, route.filename);
  }

  const col = COLUMN_MAP[route.column];

  if (route.target === 'column') {
    const { data: row, error } = await sb
      .from('jobs')
      .select(col)
      .eq('id', jobId)
      .maybeSingle();
    if (error) throw new Error(`Failed to get ${filename}: ${error.message}`);
    if (!row || (row as Record<string, unknown>)[col] == null) return null;
    return Buffer.from(JSON.stringify((row as Record<string, unknown>)[col]));
  }

  // jsonb-key: extract specific key
  const { data: row, error } = await sb
    .from('jobs')
    .select(col)
    .eq('id', jobId)
    .maybeSingle();
  if (error) throw new Error(`Failed to get ${filename}: ${error.message}`);
  if (!row || (row as Record<string, unknown>)[col] == null) return null;

  const obj = (row as Record<string, unknown>)[col] as Record<string, unknown>;
  const value = obj[route.key];
  if (value == null) return null;
  return Buffer.from(JSON.stringify(value));
}

export function getJobDirPath(jobId: string): string {
  return `supabase://${jobId}`;
}
