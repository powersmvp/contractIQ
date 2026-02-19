import { getAdapters } from '@/lib/adapters';
import { DebateRoundOutputSchema, type DebateRoundOutput } from '@/lib/schemas/debate.schema';
import { PersonaOutputSchema, type PersonaOutput } from '@/lib/schemas/persona-output.schema';
import { DocASTSchema, type DocAST } from '@/lib/schemas/docast.schema';
import { getJob, updateJob, getJobFile, saveJobFile } from '@/lib/jobs/job-manager';
import { buildDebatePrompt } from '@/lib/prompts/build-debate-prompt';
import { logger } from '@/lib/logger/logger';
import { PROVIDERS, type ProviderName } from '@/lib/config/env.config';

export interface DebateResult {
  succeeded: { provider: string; output: DebateRoundOutput }[];
  failed: { provider: string; reason: string }[];
}

/**
 * Round 2 — Debate: each active provider sees ALL Round 1 findings and argues.
 */
export async function runDebate(jobId: string, selectedProviders?: ProviderName[]): Promise<DebateResult> {
  const meta = await getJob(jobId);
  if (!meta) throw new Error(`Job not found: ${jobId}`);

  const docAstRaw = await getJobFile(jobId, 'docast.json');
  if (!docAstRaw) throw new Error('docast.json not found');
  const docAst: DocAST = DocASTSchema.parse(JSON.parse(docAstRaw.toString()));

  await updateJob(jobId, { currentStage: 'debate' });

  // Load all Round 1 outputs
  const allRound1: { provider: string; output: PersonaOutput }[] = [];
  for (const provider of PROVIDERS) {
    const raw = await getJobFile(jobId, `personas/${provider}.json`);
    if (!raw) continue;
    try {
      const parsed = PersonaOutputSchema.parse(JSON.parse(raw.toString()));
      allRound1.push({ provider, output: parsed });
    } catch {
      logger.warn('Invalid Round 1 output, skipping for debate', { jobId, provider });
    }
  }

  if (allRound1.length < 2) {
    throw new Error(`Need at least 2 Round 1 outputs for debate, found ${allRound1.length}`);
  }

  const adapters = getAdapters(selectedProviders);
  const params = {
    contractType: meta.contractType,
    side: meta.side,
    jurisdiction: meta.jurisdiction,
  };

  // Execute debate for all adapters in parallel
  const results = await Promise.allSettled(
    adapters.map(async (adapter) => {
      const prompt = buildDebatePrompt(adapter.name, docAst, params, allRound1);
      const response = await adapter.call(prompt, DebateRoundOutputSchema);

      if (!response) {
        throw new Error(`${adapter.name}: debate round returned no valid response`);
      }

      await saveJobFile(jobId, `personas/debate/${adapter.name}.json`, JSON.stringify(response.data, null, 2));
      return { provider: adapter.name, output: response.data };
    }),
  );

  const succeeded: DebateResult['succeeded'] = [];
  const failed: DebateResult['failed'] = [];

  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    const provider = adapters[i].name;
    if (result.status === 'fulfilled') {
      succeeded.push(result.value);
    } else {
      const reason = result.reason instanceof Error ? result.reason.message : 'Unknown error';
      failed.push({ provider, reason });
      logger.error('Provider failed during debate', { jobId, provider, reason });
    }
  }

  logger.info('Debate round completed', {
    jobId,
    succeeded: succeeded.length,
    failed: failed.length,
  });

  // Debate is optional enrichment — don't fail the pipeline if some providers fail
  // but log a warning if fewer than 2 succeeded
  if (succeeded.length < 2) {
    logger.warn('Debate round had fewer than 2 successful responses', { jobId, succeeded: succeeded.length });
  }

  return { succeeded, failed };
}
