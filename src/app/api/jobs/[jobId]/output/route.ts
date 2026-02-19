import { NextRequest, NextResponse } from 'next/server';
import { getJob, getJobFile } from '@/lib/jobs/job-manager';
import { lazyCleanup } from '@/lib/jobs/job-cleanup';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await params;

  const expired = await lazyCleanup(jobId);
  if (expired) {
    return NextResponse.json(
      { error: { code: 'JOB_EXPIRED', message: 'Job has expired' } },
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

  if (meta.status !== 'completed') {
    return NextResponse.json(
      { error: { code: 'NOT_READY', message: 'Job analysis not yet completed' } },
      { status: 404 },
    );
  }

  const file = await getJobFile(jobId, 'output.docx');
  if (!file) {
    return NextResponse.json(
      { error: { code: 'FILE_NOT_FOUND', message: 'Output file not found' } },
      { status: 404 },
    );
  }

  return new NextResponse(new Uint8Array(file), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="output-${jobId.slice(0, 8)}.docx"`,
    },
  });
}
