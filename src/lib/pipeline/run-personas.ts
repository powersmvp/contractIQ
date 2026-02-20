import { getAdapters } from '@/lib/adapters';
import { PersonaOutputSchema, type PersonaOutput } from '@/lib/schemas/persona-output.schema';
import { DocASTSchema, type DocAST } from '@/lib/schemas/docast.schema';
import { getJob, updateJob, getJobFile, saveJobFile } from '@/lib/jobs/job-manager';
import { buildPrompt } from '@/lib/prompts/build-prompt';
import { logger } from '@/lib/logger/logger';
import type { ProviderName } from '@/lib/config/env.config';

export interface PersonasResult {
  succeeded: { provider: string; output: PersonaOutput }[];
  failed: { provider: string; reason: string }[];
}

export async function runPersonas(jobId: string, selectedProviders?: ProviderName[], traceId?: string): Promise<PersonasResult> {
  const meta = await getJob(jobId);
  if (!meta) throw new Error(`Job not found: ${jobId}`);

  const docAstRaw = await getJobFile(jobId, 'docast.json');
  if (!docAstRaw) throw new Error('docast.json not found');

  const docAst: DocAST = DocASTSchema.parse(JSON.parse(docAstRaw.toString()));

  await updateJob(jobId, { currentStage: 'personas', progress: { completed: 0, total: 5 } });

  const adapters = await getAdapters(selectedProviders);
  const minProviders = selectedProviders ? 2 : 3;
  if (adapters.length < minProviders) {
    await updateJob(jobId, {
      status: 'failed',
      errorCode: 'INSUFFICIENT_PROVIDERS',
      errorMessage: `Only ${adapters.length} providers configured, minimum ${minProviders} required`,
    });
    throw new Error(`Insufficient providers: ${adapters.length}`);
  }

  const params = {
    contractType: meta.contractType,
    side: meta.side,
    jurisdiction: meta.jurisdiction,
  };

  // Execute all adapters in parallel
  const results = await Promise.allSettled(
    adapters.map(async (adapter) => {
      const prompt = buildPrompt(adapter.name, docAst, params);
      const response = await adapter.call(prompt, PersonaOutputSchema, { traceId, round: 'round-1' });

      if (!response) {
        throw new Error(`${adapter.name}: LLM não retornou resposta válida`);
      }

      // Save individual result
      await saveJobFile(jobId, `personas/${adapter.name}.json`, JSON.stringify(response.data, null, 2));

      return { provider: adapter.name, output: response.data };
    }),
  );

  const succeeded: PersonasResult['succeeded'] = [];
  const failed: PersonasResult['failed'] = [];

  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    const provider = adapters[i].name;
    if (result.status === 'fulfilled') {
      succeeded.push(result.value);
    } else {
      const reason = result.reason instanceof Error ? result.reason.message : 'Unknown error';
      failed.push({ provider, reason });
      logger.error('Provider failed during analysis', { jobId, provider, reason });
    }
  }

  await updateJob(jobId, { progress: { completed: succeeded.length, total: adapters.length } });

  logger.info('Personas completed', {
    jobId,
    succeeded: succeeded.length,
    failed: failed.length,
    total: adapters.length,
  });

  if (succeeded.length < minProviders) {
    const failedDetails = failed.map((f) => `${f.provider}: ${f.reason}`).join(' | ');
    const succeededNames = succeeded.map((s) => s.provider).join(', ');
    const errorMessage = `Apenas ${succeeded.length}/${adapters.length} LLMs responderam (mínimo ${minProviders}). ` +
      `Sucesso: ${succeededNames || 'nenhum'}. ` +
      `Falhas: ${failedDetails || 'nenhum'}.`;

    await updateJob(jobId, {
      status: 'failed',
      errorCode: 'INSUFFICIENT_RESPONSES',
      errorMessage,
    });
    throw new Error(errorMessage);
  }

  return { succeeded, failed };
}
