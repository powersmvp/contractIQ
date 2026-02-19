import mammoth from 'mammoth';
import { v4 as uuid } from 'uuid';
import { DocASTSchema, type DocAST, type DocBlock } from '@/lib/schemas/docast.schema';
import { getJob, updateJob, getJobFile, saveJobFile } from '@/lib/jobs/job-manager';
import { logger } from '@/lib/logger/logger';

function htmlToBlocks(html: string): Omit<DocBlock, 'blockId' | 'index'>[] {
  const blocks: Omit<DocBlock, 'blockId' | 'index'>[] = [];

  // Split HTML into elements by matching tags
  const tagRegex = /<(h[1-6]|p|li|td)[^>]*>([\s\S]*?)<\/\1>/gi;
  let match: RegExpExecArray | null;

  while ((match = tagRegex.exec(html)) !== null) {
    const tag = match[1].toLowerCase();
    // Strip inner HTML tags to get plain text
    const content = match[2].replace(/<[^>]+>/g, '').trim();

    if (!content) continue;

    if (tag.startsWith('h')) {
      const level = parseInt(tag[1], 10);
      blocks.push({ type: 'heading', content, level });
    } else if (tag === 'li') {
      blocks.push({ type: 'list-item', content });
    } else if (tag === 'td') {
      blocks.push({ type: 'table-cell', content });
    } else {
      blocks.push({ type: 'paragraph', content });
    }
  }

  return blocks;
}

export async function ingestDocx(jobId: string): Promise<DocAST> {
  const start = Date.now();

  const meta = await getJob(jobId);
  if (!meta) {
    throw new Error(`Job not found: ${jobId}`);
  }

  const fileBuffer = await getJobFile(jobId, 'input.docx');
  if (!fileBuffer) {
    await updateJob(jobId, { status: 'failed', errorCode: 'MISSING_FILE', errorMessage: 'input.docx not found' });
    throw new Error('input.docx not found');
  }

  await updateJob(jobId, { status: 'processing', currentStage: 'ingest' });

  try {
    const result = await mammoth.convertToHtml({ buffer: fileBuffer });
    const rawBlocks = htmlToBlocks(result.value);

    const blocks: DocBlock[] = rawBlocks.map((block, index) => ({
      ...block,
      blockId: uuid(),
      index,
    }));

    const docAst: DocAST = {
      tenantId: meta.tenantId,
      jobId,
      blocks,
      metadata: {
        totalBlocks: blocks.length,
        parsedAt: new Date().toISOString(),
      },
    };

    const validated = DocASTSchema.parse(docAst);
    await saveJobFile(jobId, 'docast.json', JSON.stringify(validated, null, 2));

    const durationMs = Date.now() - start;
    logger.info('DocAST generated', { jobId, totalBlocks: blocks.length, durationMs });

    return validated;
  } catch (error) {
    if ((error as Error).message?.includes('Could not find')) {
      await updateJob(jobId, { status: 'failed', errorCode: 'INVALID_FORMAT', errorMessage: 'File is not a valid .docx' });
    }
    throw error;
  }
}
