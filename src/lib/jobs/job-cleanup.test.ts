import { describe, it, expect, beforeEach, vi } from 'vitest';
import { resetConfigCache } from '@/lib/config/env.config';

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
  uploadFile: async () => {},
  downloadFile: async () => null,
  deleteJobFiles: async (_jobId: string) => {
    for (const key of storageFiles.keys()) {
      if (key.startsWith(`${_jobId}/`)) storageFiles.delete(key);
    }
  },
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

import { createJob, getJob } from './job-manager';
import { isJobExpired, lazyCleanup, scheduledCleanup } from './job-cleanup';

describe('job-cleanup', () => {
  beforeEach(() => {
    jobRows = new Map();
    storageFiles = new Map();
    resetConfigCache();
  });

  describe('isJobExpired', () => {
    it('returns false for recent job', () => {
      expect(isJobExpired(new Date().toISOString())).toBe(false);
    });

    it('returns true for job older than expiration', () => {
      const old = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
      expect(isJobExpired(old)).toBe(true);
    });
  });

  describe('lazyCleanup', () => {
    it('does not delete recent job', async () => {
      const meta = await createJob({ contractType: 'nda', side: 'contractor', jurisdiction: 'Brazil' });
      const expired = await lazyCleanup(meta.jobId);
      expect(expired).toBe(false);
      expect(await getJob(meta.jobId)).not.toBeNull();
    });

    it('returns false for non-existent job', async () => {
      const expired = await lazyCleanup('550e8400-e29b-41d4-a716-446655440000');
      expect(expired).toBe(false);
    });
  });

  describe('scheduledCleanup', () => {
    it('returns 0 when no expired jobs', async () => {
      await createJob({ contractType: 'nda', side: 'contractor', jurisdiction: 'Brazil' });
      const cleaned = await scheduledCleanup();
      expect(cleaned).toBe(0);
    });

    it('returns 0 when no jobs exist', async () => {
      const cleaned = await scheduledCleanup();
      expect(cleaned).toBe(0);
    });
  });
});
