import { listJobs, deleteJob, getJob } from './job-manager';
import { loadConfig } from '@/lib/config/env.config';
import { logger } from '@/lib/logger/logger';

export function isJobExpired(createdAt: string): boolean {
  const config = loadConfig();
  const expirationMs = config.JOB_EXPIRATION_HOURS * 60 * 60 * 1000;
  const age = Date.now() - new Date(createdAt).getTime();
  return age > expirationMs;
}

export async function lazyCleanup(jobId: string): Promise<boolean> {
  const meta = await getJob(jobId);
  if (!meta) return false;

  if (isJobExpired(meta.createdAt)) {
    await deleteJob(jobId);
    logger.info('Job expired (lazy cleanup)', { jobId });
    return true;
  }
  return false;
}

export async function scheduledCleanup(): Promise<number> {
  const jobs = await listJobs();
  let cleaned = 0;

  for (const job of jobs) {
    if (isJobExpired(job.createdAt)) {
      await deleteJob(job.jobId);
      logger.info('Job expired (scheduled cleanup)', { jobId: job.jobId });
      cleaned++;
    }
  }

  if (cleaned > 0) {
    logger.info('Scheduled cleanup completed', { cleaned });
  }
  return cleaned;
}

let cleanupInterval: ReturnType<typeof setInterval> | null = null;

export function startScheduledCleanup(): void {
  if (cleanupInterval) return;
  const config = loadConfig();
  const intervalMs = config.JOB_CLEANUP_INTERVAL_MINUTES * 60 * 1000;
  cleanupInterval = setInterval(scheduledCleanup, intervalMs);
  logger.info('Scheduled cleanup started', { intervalMinutes: config.JOB_CLEANUP_INTERVAL_MINUTES });
}

export function stopScheduledCleanup(): void {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
  }
}
