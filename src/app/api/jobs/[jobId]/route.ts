import { NextRequest, NextResponse } from 'next/server';
import { getJob } from '@/lib/jobs/job-manager';
import { lazyCleanup } from '@/lib/jobs/job-cleanup';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await params;

  // Lazy cleanup: check if expired
  const expired = await lazyCleanup(jobId);
  if (expired) {
    return NextResponse.json(
      { error: { code: 'JOB_EXPIRED', message: 'Job has expired and data has been deleted' } },
      { status: 410 },
    );
  }

  const meta = await getJob(jobId);
  if (!meta) {
    return NextResponse.json(
      { error: { code: 'JOB_NOT_FOUND', message: 'Job not found' } },
      { status: 404 },
    );
  }

  return NextResponse.json({
    data: {
      jobId: meta.jobId,
      status: meta.status,
      contractType: meta.contractType,
      side: meta.side,
      jurisdiction: meta.jurisdiction,
      currentStage: meta.currentStage,
      progress: meta.progress,
      errorCode: meta.errorCode,
      errorMessage: meta.errorMessage,
      feedback: meta.feedback,
      createdAt: meta.createdAt,
      updatedAt: meta.updatedAt,
    },
  });
}
