import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Document, Packer, Paragraph, HeadingLevel } from 'docx';
import { DocASTSchema } from '@/lib/schemas/docast.schema';

// ── In-memory stores ──────────────────────────────────────────────
let jobRows: Map<string, Record<string, unknown>>;
let storageFiles: Map<string, Buffer>;

// ── Supabase-style mock builder ───────────────────────────────────
vi.mock('@/lib/db/client', () => {
  const { v4: uuid } = require('uuid');

  function createBuilder() {
    let _op = '';
    let _insertValues: Record<string, unknown> | null = null;
    let _updateValues: Record<string, unknown> | null = null;
    let _eqField: string | null = null;
    let _eqValue: unknown = null;
    let _selectCols: string | null = null;
    let _hasSelectAfterMutation = false;
    let _orderCol: string | null = null;
    let _orderAsc = true;

    function execute(mode: 'array' | 'single' | 'maybeSingle' = 'array') {
      if (_op === 'insert') {
        const id = uuid();
        const now = new Date().toISOString();
        const row: Record<string, unknown> = {
          id,
          tenant_id: null, status: 'created', contract_type: null, side: null, jurisdiction: null,
          current_stage: null, progress_completed: null, progress_total: null,
          debate_mode: null, selected_providers: null,
          error_code: null, error_message: null,
          feedback_rating: null, feedback_reason: null, feedback_comment: null, feedback_created_at: null,
          docast: null, persona_outputs: null, debate_outputs: null, verdict_outputs: null,
          consolidated: null, report: null,
          created_at: now, updated_at: now,
          ..._insertValues,
        };
        jobRows.set(id, row);
        return { data: row, error: null };
      }

      if (_op === 'select') {
        if (_eqField === 'id' && _eqValue) {
          const row = jobRows.get(_eqValue as string);
          if (!row) return { data: null, error: null };
          if (_selectCols && _selectCols !== '*') {
            const cols = _selectCols.split(',').map((c: string) => c.trim());
            const projected: Record<string, unknown> = {};
            for (const c of cols) projected[c] = row[c] ?? null;
            return { data: projected, error: null };
          }
          return { data: row, error: null };
        }
        let rows = Array.from(jobRows.values());
        if (_orderCol) {
          rows.sort((a, b) => {
            const av = a[_orderCol!] as string;
            const bv = b[_orderCol!] as string;
            return _orderAsc ? av.localeCompare(bv) : bv.localeCompare(av);
          });
        }
        return { data: rows, error: null };
      }

      if (_op === 'update') {
        if (_eqField === 'id' && _eqValue) {
          const row = jobRows.get(_eqValue as string);
          if (!row) return { data: null, error: null };
          for (const [k, v] of Object.entries(_updateValues ?? {})) row[k] = v;
          jobRows.set(_eqValue as string, row);
          if (_hasSelectAfterMutation) return { data: row, error: null };
          return { data: null, error: null };
        }
        return { data: null, error: null };
      }

      if (_op === 'delete') {
        if (_eqField === 'id' && _eqValue) jobRows.delete(_eqValue as string);
        return { data: null, error: null };
      }

      return { data: null, error: null };
    }

    const builder: Record<string, unknown> = {};
    builder.insert = (values: Record<string, unknown>) => { _op = 'insert'; _insertValues = values; return builder; };
    builder.select = (cols?: string) => {
      _selectCols = cols ?? '*';
      if (!_op) { _op = 'select'; } else { _hasSelectAfterMutation = true; }
      return builder;
    };
    builder.update = (values: Record<string, unknown>) => { _op = 'update'; _updateValues = values; return builder; };
    builder.delete = () => { _op = 'delete'; return builder; };
    builder.eq = (field: string, value: unknown) => { _eqField = field; _eqValue = value; return builder; };
    builder.order = (col: string, opts?: { ascending: boolean }) => { _orderCol = col; _orderAsc = opts?.ascending ?? true; return builder; };
    builder.single = () => execute('single');
    builder.maybeSingle = () => execute('maybeSingle');
    builder.then = (
      onFulfilled?: (val: unknown) => unknown,
      onRejected?: (err: unknown) => unknown,
    ) => Promise.resolve(execute('array')).then(onFulfilled, onRejected);

    return builder;
  }

  return {
    getClient: () => ({ from: () => createBuilder() }),
    resetClient: () => {},
  };
});

vi.mock('@/lib/db/storage', () => ({
  uploadFile: async (jobId: string, filename: string, data: Buffer) => {
    storageFiles.set(`${jobId}/${filename}`, Buffer.from(data));
  },
  downloadFile: async (jobId: string, filename: string) => {
    return storageFiles.get(`${jobId}/${filename}`) ?? null;
  },
  deleteJobFiles: async () => {},
}));

vi.mock('@/lib/config/env.config', async (importOriginal) => {
  const orig = await importOriginal<typeof import('@/lib/config/env.config')>();
  return {
    ...orig,
    loadConfig: () => ({
      SUPABASE_URL: 'https://mock.supabase.co',
      SUPABASE_SERVICE_KEY: 'mock-key',
      DEFAULT_TENANT_ID: 'default',
      JOB_EXPIRATION_HOURS: 24,
      JOB_CLEANUP_INTERVAL_MINUTES: 30,
      LLM_TIMEOUT_MS: 300000,
      LLM_MAX_RETRIES: 2,
    }),
  };
});

import { ingestDocx } from './ingest-docx';
import { createJob, saveJobFile, getJobFile } from '@/lib/jobs/job-manager';

async function createTestDocx(): Promise<Buffer> {
  const doc = new Document({
    sections: [{
      children: [
        new Paragraph({ text: 'Non-Disclosure Agreement', heading: HeadingLevel.HEADING_1 }),
        new Paragraph({ text: 'This agreement is entered into by and between the parties.' }),
        new Paragraph({ text: 'Definitions', heading: HeadingLevel.HEADING_2 }),
        new Paragraph({ text: 'Confidential Information means any data or information.' }),
        new Paragraph({ text: 'Obligations', heading: HeadingLevel.HEADING_2 }),
        new Paragraph({ text: 'The Receiving Party shall protect all Confidential Information.' }),
      ],
    }],
  });
  return Buffer.from(await Packer.toBuffer(doc));
}

describe('ingest-docx', () => {
  beforeEach(() => {
    jobRows = new Map();
    storageFiles = new Map();
  });

  it('parses a valid .docx into DocAST', async () => {
    const meta = await createJob({ contractType: 'nda', side: 'contractor', jurisdiction: 'Brazil' });
    const docxBuffer = await createTestDocx();
    await saveJobFile(meta.jobId, 'input.docx', docxBuffer);

    const docAst = await ingestDocx(meta.jobId);

    expect(docAst.jobId).toBe(meta.jobId);
    expect(docAst.tenantId).toBe('default');
    expect(docAst.blocks.length).toBeGreaterThan(0);
    expect(docAst.metadata.totalBlocks).toBe(docAst.blocks.length);

    for (const block of docAst.blocks) {
      expect(block.blockId).toBeDefined();
      expect(block.content).toBeTruthy();
      expect(block.index).toBeGreaterThanOrEqual(0);
      expect(['heading', 'paragraph', 'list-item', 'table-cell']).toContain(block.type);
    }

    expect(() => DocASTSchema.parse(docAst)).not.toThrow();
  });

  it('saves docast.json to DB column', async () => {
    const meta = await createJob({ contractType: 'nda', side: 'contractor', jurisdiction: 'Brazil' });
    const docxBuffer = await createTestDocx();
    await saveJobFile(meta.jobId, 'input.docx', docxBuffer);

    await ingestDocx(meta.jobId);

    const saved = await getJobFile(meta.jobId, 'docast.json');
    expect(saved).not.toBeNull();
    const parsed = JSON.parse(saved!.toString());
    expect(parsed.blocks).toBeDefined();
    expect(parsed.metadata.totalBlocks).toBeGreaterThan(0);
  });

  it('throws when job does not exist', async () => {
    await expect(ingestDocx('550e8400-e29b-41d4-a716-446655440000')).rejects.toThrow('Job not found');
  });

  it('throws when input.docx is missing', async () => {
    const meta = await createJob({ contractType: 'nda', side: 'contractor', jurisdiction: 'Brazil' });
    await expect(ingestDocx(meta.jobId)).rejects.toThrow('input.docx not found');
  });

  it('assigns sequential indices to blocks', async () => {
    const meta = await createJob({ contractType: 'nda', side: 'contractor', jurisdiction: 'Brazil' });
    const docxBuffer = await createTestDocx();
    await saveJobFile(meta.jobId, 'input.docx', docxBuffer);

    const docAst = await ingestDocx(meta.jobId);

    for (let i = 0; i < docAst.blocks.length; i++) {
      expect(docAst.blocks[i].index).toBe(i);
    }
  });

  it('assigns unique blockIds', async () => {
    const meta = await createJob({ contractType: 'nda', side: 'contractor', jurisdiction: 'Brazil' });
    const docxBuffer = await createTestDocx();
    await saveJobFile(meta.jobId, 'input.docx', docxBuffer);

    const docAst = await ingestDocx(meta.jobId);
    const ids = new Set(docAst.blocks.map((b) => b.blockId));
    expect(ids.size).toBe(docAst.blocks.length);
  });
});
