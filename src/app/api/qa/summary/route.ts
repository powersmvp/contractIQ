import { NextResponse } from 'next/server';
import { listJobs } from '@/lib/jobs/job-manager';

export async function GET() {
  const jobs = await listJobs();

  const completed = jobs.filter((j) => j.status === 'completed');
  const withFeedback = completed.filter((j) => j.feedback);

  const good = withFeedback.filter((j) => j.feedback!.rating === 'good').length;
  const bad = withFeedback.filter((j) => j.feedback!.rating === 'bad').length;

  // Aggregate bad reasons
  const badReasons: Record<string, number> = {};
  for (const job of withFeedback) {
    if (job.feedback!.rating === 'bad' && job.feedback!.reason) {
      badReasons[job.feedback!.reason] = (badReasons[job.feedback!.reason] ?? 0) + 1;
    }
  }

  // Aggregate by contract type
  const byContractType: Record<string, { good: number; bad: number }> = {};
  for (const job of withFeedback) {
    if (!byContractType[job.contractType]) {
      byContractType[job.contractType] = { good: 0, bad: 0 };
    }
    byContractType[job.contractType][job.feedback!.rating]++;
  }

  // Recent bad feedback with details
  const recentBad = withFeedback
    .filter((j) => j.feedback!.rating === 'bad')
    .slice(0, 10)
    .map((j) => ({
      jobId: j.jobId,
      contractType: j.contractType,
      reason: j.feedback!.reason ?? null,
      comment: j.feedback!.comment ?? null,
      createdAt: j.feedback!.createdAt,
    }));

  return NextResponse.json({
    data: {
      totalCompleted: completed.length,
      totalWithFeedback: withFeedback.length,
      good,
      bad,
      satisfactionRate: withFeedback.length > 0
        ? Math.round((good / withFeedback.length) * 100)
        : null,
      badReasons,
      byContractType,
      recentBad,
    },
  });
}
