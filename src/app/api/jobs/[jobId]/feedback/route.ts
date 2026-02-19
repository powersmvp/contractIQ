import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getJob, updateJob } from '@/lib/jobs/job-manager';
import { FeedbackReasonSchema } from '@/lib/schemas/job-meta.schema';
import { logger } from '@/lib/logger/logger';

const FeedbackBodySchema = z.object({
  rating: z.enum(['good', 'bad']),
  reason: FeedbackReasonSchema.optional(),
  comment: z.string().max(500).optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await params;

  const meta = await getJob(jobId);
  if (!meta) {
    return NextResponse.json(
      { error: { code: 'JOB_NOT_FOUND', message: 'Job not found' } },
      { status: 404 },
    );
  }

  if (meta.status !== 'completed') {
    return NextResponse.json(
      { error: { code: 'JOB_NOT_COMPLETED', message: 'Feedback can only be submitted for completed jobs' } },
      { status: 422 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: 'INVALID_JSON', message: 'Request body must be valid JSON' } },
      { status: 400 },
    );
  }

  const parsed = FeedbackBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'INVALID_RATING', message: 'Rating must be "good" or "bad"' } },
      { status: 422 },
    );
  }

  await updateJob(jobId, {
    feedback: {
      rating: parsed.data.rating,
      reason: parsed.data.reason,
      comment: parsed.data.comment,
      createdAt: new Date().toISOString(),
    },
  });

  logger.info('Feedback received', { jobId, rating: parsed.data.rating, reason: parsed.data.reason });

  return NextResponse.json({
    data: { jobId, feedback: parsed.data.rating },
  });
}
