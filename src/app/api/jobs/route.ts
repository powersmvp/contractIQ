import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createJob, listJobs, saveJobFile } from '@/lib/jobs/job-manager';
import { ContractTypeSchema, SideSchema, DebateModeSchema, ProviderNameSchema } from '@/lib/schemas/job-meta.schema';
import { runPipeline } from '@/lib/pipeline/run-pipeline';
import { logger } from '@/lib/logger/logger';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

const CreateJobParamsSchema = z.object({
  contractType: ContractTypeSchema,
  side: SideSchema,
  jurisdiction: z.string().min(1).default('Brazil'),
  debateMode: DebateModeSchema.optional(),
  selectedProviders: z.array(ProviderNameSchema).min(2).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const contractType = formData.get('contractType') as string | null;
    const side = formData.get('side') as string | null;
    const jurisdiction = (formData.get('jurisdiction') as string | null) ?? 'Brazil';
    const debateMode = (formData.get('debateMode') as string | null) ?? undefined;
    const selectedProvidersRaw = formData.get('selectedProviders') as string | null;
    let selectedProviders: string[] | undefined;
    if (selectedProvidersRaw) {
      try {
        selectedProviders = JSON.parse(selectedProvidersRaw);
      } catch {
        selectedProviders = undefined;
      }
    }

    // Validate file exists
    if (!file) {
      return NextResponse.json(
        { error: { code: 'MISSING_FILE', message: 'File is required' } },
        { status: 422 },
      );
    }

    // Validate file type
    if (file.type !== ALLOWED_MIME && !file.name.endsWith('.docx')) {
      return NextResponse.json(
        { error: { code: 'INVALID_FILE', message: 'Only .docx files are accepted' } },
        { status: 422 },
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: { code: 'FILE_TOO_LARGE', message: 'File must be <= 10MB' } },
        { status: 422 },
      );
    }

    // Validate params
    const params = CreateJobParamsSchema.safeParse({ contractType, side, jurisdiction, debateMode, selectedProviders });
    if (!params.success) {
      return NextResponse.json(
        { error: { code: 'MISSING_PARAMS', message: params.error.issues.map((i) => `${i.path}: ${i.message}`).join('; ') } },
        { status: 422 },
      );
    }

    // Create job
    const meta = await createJob(params.data);

    // Save uploaded file
    const buffer = Buffer.from(await file.arrayBuffer());
    await saveJobFile(meta.jobId, 'input.docx', buffer);

    logger.info('Job upload completed', { jobId: meta.jobId });

    // Fire-and-forget: start pipeline in background
    runPipeline(meta.jobId).catch(() => {
      // Error handling is done inside runPipeline
    });

    return NextResponse.json(
      { data: { jobId: meta.jobId, status: meta.status } },
      { status: 201 },
    );
  } catch (error) {
    logger.error('Job creation failed', {
      errorCode: error instanceof Error ? error.message : 'UNKNOWN',
    });
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to create job' } },
      { status: 500 },
    );
  }
}

export async function GET() {
  try {
    const jobs = await listJobs();
    const summaries = jobs.map((j) => ({
      jobId: j.jobId,
      status: j.status,
      contractType: j.contractType,
      side: j.side,
      jurisdiction: j.jurisdiction,
      currentStage: j.currentStage,
      progress: j.progress,
      createdAt: j.createdAt,
      updatedAt: j.updatedAt,
    }));

    return NextResponse.json({ data: { jobs: summaries } });
  } catch (error) {
    logger.error('Job listing failed', {
      errorCode: error instanceof Error ? error.message : 'UNKNOWN',
    });
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to list jobs' } },
      { status: 500 },
    );
  }
}
