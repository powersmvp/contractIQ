import { getJob, updateJob } from '@/lib/jobs/job-manager';
import { ingestDocx } from './ingest-docx';
import { runPersonas } from './run-personas';
import { runDebate } from './run-debate';
import { runVerdict } from './run-verdict';
import { consolidate } from './consolidate';
import { renderDocx } from './render-docx';
import { logger } from '@/lib/logger/logger';

export async function runPipeline(jobId: string): Promise<void> {
  const start = Date.now();
  logger.info('Pipeline started', { jobId });

  try {
    const meta = await getJob(jobId);
    if (!meta) throw new Error(`Job not found: ${jobId}`);

    await updateJob(jobId, { status: 'processing' });

    const debateMode = meta.debateMode ?? 'single';
    const selectedProviders = meta.selectedProviders;

    // Stage 1: Parse document
    await ingestDocx(jobId);

    // Stage 2: Run LLM personas (Round 1)
    await runPersonas(jobId, selectedProviders);

    // Stage 3-4: Debate rounds (only in debate mode)
    if (debateMode === 'debate') {
      logger.info('Debate mode enabled — running rounds 2 and 3', { jobId });

      // Round 2: Debate
      await runDebate(jobId, selectedProviders);

      // Round 3: Final Verdict
      await runVerdict(jobId, selectedProviders);
    }

    // Stage 5: Consolidate findings
    await consolidate(jobId);

    // Stage 6: Render outputs
    await renderDocx(jobId);

    // Mark as completed
    await updateJob(jobId, { status: 'completed', currentStage: 'render' });

    const durationMs = Date.now() - start;
    logger.info('Pipeline completed', { jobId, durationMs, debateMode });
  } catch (error) {
    const durationMs = Date.now() - start;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Only update to failed if not already failed (stage might have done it)
    try {
      const currentMeta = await getJob(jobId);
      if (currentMeta && currentMeta.status !== 'failed') {
        await updateJob(jobId, {
          status: 'failed',
          errorCode: 'PIPELINE_ERROR',
          errorMessage,
        });
      }
    } catch {
      // Ignore errors in error handler
    }

    logger.error('Pipeline failed', { jobId, durationMs, errorCode: 'PIPELINE_ERROR' });
  }
}
