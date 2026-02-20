import { getAdapters } from '@/lib/adapters';
import { FinalVerdictOutputSchema, type FinalVerdictOutput, DebateRoundOutputSchema, type DebateRoundOutput } from '@/lib/schemas/debate.schema';
import { PersonaOutputSchema, type PersonaOutput } from '@/lib/schemas/persona-output.schema';
import { DocASTSchema, type DocAST } from '@/lib/schemas/docast.schema';
import { getJob, updateJob, getJobFile, saveJobFile } from '@/lib/jobs/job-manager';
import { buildFinalVerdictPrompt } from '@/lib/prompts/build-debate-prompt';
import { logger } from '@/lib/logger/logger';
import { PROVIDERS, type ProviderName } from '@/lib/config/env.config';

export interface VerdictResult {
  succeeded: { provider: string; output: FinalVerdictOutput }[];
  failed: { provider: string; reason: string }[];
}

/**
 * Round 3 — Final Verdict: each provider sees Round 1 + Round 2 and issues final judgment.
 */
export async function runVerdict(jobId: string, selectedProviders?: ProviderName[], traceId?: string): Promise<VerdictResult> {
  const meta = await getJob(jobId);
  if (!meta) throw new Error(`Job not found: ${jobId}`);

  const docAstRaw = await getJobFile(jobId, 'docast.json');
  if (!docAstRaw) throw new Error('docast.json not found');
  const docAst: DocAST = DocASTSchema.parse(JSON.parse(docAstRaw.toString()));

  await updateJob(jobId, { currentStage: 'verdict' });

  // Load Round 1 outputs
  const allRound1: { provider: string; output: PersonaOutput }[] = [];
  for (const provider of PROVIDERS) {
    const raw = await getJobFile(jobId, `personas/${provider}.json`);
    if (!raw) continue;
    try {
      const parsed = PersonaOutputSchema.parse(JSON.parse(raw.toString()));
      allRound1.push({ provider, output: parsed });
    } catch {
      logger.warn('Invalid Round 1 output, skipping for verdict', { jobId, provider });
    }
  }

  // Load Round 2 (debate) outputs
  const allDebate: { provider: string; output: DebateRoundOutput }[] = [];
  for (const provider of PROVIDERS) {
    const raw = await getJobFile(jobId, `personas/debate/${provider}.json`);
    if (!raw) continue;
    try {
      const parsed = DebateRoundOutputSchema.parse(JSON.parse(raw.toString()));
      allDebate.push({ provider, output: parsed });
    } catch {
      logger.warn('Invalid debate output, skipping for verdict', { jobId, provider });
    }
  }

  const adapters = getAdapters(selectedProviders);
  const params = {
    contractType: meta.contractType,
    side: meta.side,
    jurisdiction: meta.jurisdiction,
  };

  // Execute verdict for all adapters in parallel
  const results = await Promise.allSettled(
    adapters.map(async (adapter) => {
      const prompt = buildFinalVerdictPrompt(adapter.name, docAst, params, allRound1, allDebate);
      const response = await adapter.call(prompt, FinalVerdictOutputSchema, { traceId, round: 'verdict' });

      if (!response) {
        throw new Error(`${adapter.name}: verdict round returned no valid response`);
      }

      await saveJobFile(jobId, `personas/verdict/${adapter.name}.json`, JSON.stringify(response.data, null, 2));
      return { provider: adapter.name, output: response.data };
    }),
  );

  const succeeded: VerdictResult['succeeded'] = [];
  const failed: VerdictResult['failed'] = [];

  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    const provider = adapters[i].name;
    if (result.status === 'fulfilled') {
      succeeded.push(result.value);
    } else {
      const reason = result.reason instanceof Error ? result.reason.message : 'Unknown error';
      failed.push({ provider, reason });
      logger.error('Provider failed during verdict', { jobId, provider, reason });
    }
  }

  logger.info('Verdict round completed', {
    jobId,
    succeeded: succeeded.length,
    failed: failed.length,
  });

  if (succeeded.length < 2) {
    logger.warn('Verdict round had fewer than 2 successful responses', { jobId, succeeded: succeeded.length });
  }

  return { succeeded, failed };
}
