import { describe, it, expect, beforeEach, vi } from 'vitest';
import { resetConfigCache } from '@/lib/config/env.config';

// ── In-memory stores for mocking ──────────────────────────────────
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
          if (!row) {
            if (mode === 'maybeSingle') return { data: null, error: null };
            return { data: null, error: null };
          }
          if (_selectCols && _selectCols !== '*') {
            const cols = _selectCols.split(',').map((c: string) => c.trim());
            const projected: Record<string, unknown> = {};
            for (const c of cols) projected[c] = row[c] ?? null;
            return { data: projected, error: null };
          }
          return { data: row, error: null };
        }
        // No eq filter — return all rows
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
          if (!row) {
            if (mode === 'maybeSingle') return { data: null, error: null };
            return { data: null, error: null };
          }
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

    builder.insert = (values: Record<string, unknown>) => {
      _op = 'insert'; _insertValues = values; return builder;
    };
    builder.select = (cols?: string) => {
      _selectCols = cols ?? '*';
      if (!_op) { _op = 'select'; } else { _hasSelectAfterMutation = true; }
      return builder;
    };
    builder.update = (values: Record<string, unknown>) => {
      _op = 'update'; _updateValues = values; return builder;
    };
    builder.delete = () => { _op = 'delete'; return builder; };
    builder.eq = (field: string, value: unknown) => {
      _eqField = field; _eqValue = value; return builder;
    };
    builder.order = (col: string, opts?: { ascending: boolean }) => {
      _orderCol = col; _orderAsc = opts?.ascending ?? true; return builder;
    };
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

// ── Mock Storage ──────────────────────────────────────────────────
vi.mock('@/lib/db/storage', () => ({
  uploadFile: async (_jobId: string, filename: string, data: Buffer) => {
    storageFiles.set(`${_jobId}/${filename}`, data);
  },
  downloadFile: async (_jobId: string, filename: string) => {
    return storageFiles.get(`${_jobId}/${filename}`) ?? null;
  },
  deleteJobFiles: async (_jobId: string) => {
    for (const key of storageFiles.keys()) {
      if (key.startsWith(`${_jobId}/`)) storageFiles.delete(key);
    }
  },
}));

// ── Mock env config ───────────────────────────────────────────────
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

// ── Import after mocks ────────────────────────────────────────────
import { createJob, getJob, updateJob, listJobs, deleteJob, saveJobFile, getJobFile } from './job-manager';

describe('job-manager', () => {
  beforeEach(() => {
    jobRows = new Map();
    storageFiles = new Map();
    resetConfigCache();
  });

  describe('createJob', () => {
    it('creates a job with correct fields', async () => {
      const meta = await createJob({
        contractType: 'nda',
        side: 'contractor',
        jurisdiction: 'Brazil',
      });

      expect(meta.jobId).toBeDefined();
      expect(meta.status).toBe('created');
      expect(meta.contractType).toBe('nda');
      expect(meta.side).toBe('contractor');
      expect(meta.jurisdiction).toBe('Brazil');
      expect(meta.tenantId).toBe('default');
      expect(meta.createdAt).toBeDefined();
      expect(meta.updatedAt).toBeDefined();
    });

    it('uses custom tenantId', async () => {
      const meta = await createJob({
        contractType: 'saas',
        side: 'contracted',
        jurisdiction: 'USA',
        tenantId: 'tenant-abc',
      });
      expect(meta.tenantId).toBe('tenant-abc');
    });
  });

  describe('getJob', () => {
    it('returns job meta for existing job', async () => {
      const created = await createJob({
        contractType: 'partnership',
        side: 'contractor',
        jurisdiction: 'Brazil',
      });

      const fetched = await getJob(created.jobId);
      expect(fetched).not.toBeNull();
      expect(fetched!.jobId).toBe(created.jobId);
      expect(fetched!.contractType).toBe('partnership');
    });

    it('returns null for non-existent job', async () => {
      const result = await getJob('550e8400-e29b-41d4-a716-446655440000');
      expect(result).toBeNull();
    });
  });

  describe('updateJob', () => {
    it('updates job status and fields', async () => {
      const created = await createJob({
        contractType: 'nda',
        side: 'contractor',
        jurisdiction: 'Brazil',
      });

      const updated = await updateJob(created.jobId, {
        status: 'processing',
        currentStage: 'ingest',
      });

      expect(updated).not.toBeNull();
      expect(updated!.status).toBe('processing');
      expect(updated!.currentStage).toBe('ingest');
    });

    it('returns null for non-existent job', async () => {
      const result = await updateJob('550e8400-e29b-41d4-a716-446655440000', { status: 'failed' });
      expect(result).toBeNull();
    });

    it('updates progress', async () => {
      const created = await createJob({
        contractType: 'nda',
        side: 'contractor',
        jurisdiction: 'Brazil',
      });

      const updated = await updateJob(created.jobId, {
        status: 'processing',
        currentStage: 'personas',
        progress: { completed: 3, total: 5 },
      });

      expect(updated!.progress).toEqual({ completed: 3, total: 5 });
    });
  });

  describe('listJobs', () => {
    it('returns empty array when no jobs', async () => {
      const all = await listJobs();
      expect(all).toEqual([]);
    });

    it('returns jobs sorted by createdAt desc', async () => {
      const job1 = await createJob({ contractType: 'nda', side: 'contractor', jurisdiction: 'Brazil' });
      await new Promise((r) => setTimeout(r, 10));
      const job2 = await createJob({ contractType: 'saas', side: 'contracted', jurisdiction: 'Brazil' });

      const all = await listJobs();
      expect(all).toHaveLength(2);
      expect(all[0].jobId).toBe(job2.jobId);
      expect(all[1].jobId).toBe(job1.jobId);
    });
  });

  describe('deleteJob', () => {
    it('deletes job from DB and storage', async () => {
      const created = await createJob({ contractType: 'nda', side: 'contractor', jurisdiction: 'Brazil' });
      await saveJobFile(created.jobId, 'input.docx', Buffer.from('test'));

      const deleted = await deleteJob(created.jobId);
      expect(deleted).toBe(true);

      const fetched = await getJob(created.jobId);
      expect(fetched).toBeNull();
    });
  });

  describe('saveJobFile / getJobFile', () => {
    it('saves and reads a .docx file via storage', async () => {
      const created = await createJob({ contractType: 'nda', side: 'contractor', jurisdiction: 'Brazil' });
      const content = Buffer.from('docx content');
      await saveJobFile(created.jobId, 'input.docx', content);

      const read = await getJobFile(created.jobId, 'input.docx');
      expect(read).not.toBeNull();
      expect(read!.toString()).toBe('docx content');
    });

    it('saves and reads docast.json via DB column', async () => {
      const created = await createJob({ contractType: 'nda', side: 'contractor', jurisdiction: 'Brazil' });
      const data = { jobId: created.jobId, blocks: [] };
      await saveJobFile(created.jobId, 'docast.json', JSON.stringify(data));

      const read = await getJobFile(created.jobId, 'docast.json');
      expect(read).not.toBeNull();
      expect(JSON.parse(read!.toString())).toEqual(data);
    });

    it('saves persona output via JSONB key', async () => {
      const created = await createJob({ contractType: 'nda', side: 'contractor', jurisdiction: 'Brazil' });
      const gptOutput = { provider: 'gpt', findings: [] };
      await saveJobFile(created.jobId, 'personas/gpt.json', JSON.stringify(gptOutput));

      const read = await getJobFile(created.jobId, 'personas/gpt.json');
      expect(read).not.toBeNull();
      expect(JSON.parse(read!.toString())).toEqual(gptOutput);
    });

    it('saves debate output via JSONB key', async () => {
      const created = await createJob({ contractType: 'nda', side: 'contractor', jurisdiction: 'Brazil' });
      const debateData = { responses: [] };
      await saveJobFile(created.jobId, 'personas/debate/gpt.json', JSON.stringify(debateData));

      const read = await getJobFile(created.jobId, 'personas/debate/gpt.json');
      expect(read).not.toBeNull();
      expect(JSON.parse(read!.toString())).toEqual(debateData);
    });

    it('saves verdict output via JSONB key', async () => {
      const created = await createJob({ contractType: 'nda', side: 'contractor', jurisdiction: 'Brazil' });
      const verdictData = { findings: [] };
      await saveJobFile(created.jobId, 'personas/verdict/gpt.json', JSON.stringify(verdictData));

      const read = await getJobFile(created.jobId, 'personas/verdict/gpt.json');
      expect(read).not.toBeNull();
      expect(JSON.parse(read!.toString())).toEqual(verdictData);
    });

    it('returns null for non-existent file', async () => {
      const created = await createJob({ contractType: 'nda', side: 'contractor', jurisdiction: 'Brazil' });
      const result = await getJobFile(created.jobId, 'input.docx');
      expect(result).toBeNull();
    });

    it('returns null for non-existent persona key', async () => {
      const created = await createJob({ contractType: 'nda', side: 'contractor', jurisdiction: 'Brazil' });
      const result = await getJobFile(created.jobId, 'personas/gpt.json');
      expect(result).toBeNull();
    });

    it('saves consolidated.json via DB column', async () => {
      const created = await createJob({ contractType: 'nda', side: 'contractor', jurisdiction: 'Brazil' });
      const data = { findings: [], patchPlan: {} };
      await saveJobFile(created.jobId, 'consolidated.json', JSON.stringify(data));

      const read = await getJobFile(created.jobId, 'consolidated.json');
      expect(JSON.parse(read!.toString())).toEqual(data);
    });

    it('saves report.json via DB column', async () => {
      const created = await createJob({ contractType: 'nda', side: 'contractor', jurisdiction: 'Brazil' });
      const data = { title: 'Report' };
      await saveJobFile(created.jobId, 'report.json', JSON.stringify(data));

      const read = await getJobFile(created.jobId, 'report.json');
      expect(JSON.parse(read!.toString())).toEqual(data);
    });
  });
});
