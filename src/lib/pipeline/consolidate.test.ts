import { describe, it, expect, beforeEach, vi } from 'vitest';
import { v4 as uuid } from 'uuid';
import type { PersonaOutput } from '@/lib/schemas/persona-output.schema';

// ── In-memory stores ──────────────────────────────────────────────
let jobRows: Map<string, Record<string, unknown>>;
let storageFiles: Map<string, Buffer>;

// ── Supabase-style mock builder ───────────────────────────────────
vi.mock('@/lib/db/client', () => {
  const { v4: uuidGen } = require('uuid');

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
        const id = uuidGen();
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

import { consolidate } from './consolidate';
import { createJob, saveJobFile, getJobFile } from '@/lib/jobs/job-manager';

function makePersonaOutput(provider: string, findings: PersonaOutput['findings'], generalSuggestions?: string[]): PersonaOutput {
  return {
    provider,
    findings,
    generalSuggestions,
    analyzedAt: new Date().toISOString(),
  };
}

describe('consolidate', () => {
  const blockId1 = uuid();
  const blockId2 = uuid();

  beforeEach(() => {
    jobRows = new Map();
    storageFiles = new Map();
  });

  it('consolidates findings from multiple providers', async () => {
    const meta = await createJob({ contractType: 'nda', side: 'contractor', jurisdiction: 'Brazil' });

    const gptOutput = makePersonaOutput('gpt', [
      { blockId: blockId1, severity: 'high', original: 'Original clause', suggested: 'Better clause', justification: 'Risk identified' },
    ]);
    const claudeOutput = makePersonaOutput('claude', [
      { blockId: blockId1, severity: 'high', original: 'Original clause', suggested: 'Improved clause', justification: 'Legal risk' },
      { blockId: blockId2, severity: 'medium', original: 'Another clause', suggested: 'Fixed clause', justification: 'Clarity' },
    ]);
    const geminiOutput = makePersonaOutput('gemini', [
      { blockId: blockId1, severity: 'critical', original: 'Original clause', suggested: 'Much better clause', justification: 'Critical risk' },
    ], ['Add force majeure clause']);

    await saveJobFile(meta.jobId, 'personas/gpt.json', JSON.stringify(gptOutput));
    await saveJobFile(meta.jobId, 'personas/claude.json', JSON.stringify(claudeOutput));
    await saveJobFile(meta.jobId, 'personas/gemini.json', JSON.stringify(geminiOutput));

    const result = await consolidate(meta.jobId);

    const blockId1Findings = result.findings.filter((f) => f.blockId === blockId1);
    expect(blockId1Findings).toHaveLength(1);
    expect(blockId1Findings[0].consensus).toBe(3);
    expect(blockId1Findings[0].severity).toBe('critical');

    const blockId2Findings = result.findings.filter((f) => f.blockId === blockId2);
    expect(blockId2Findings).toHaveLength(1);
    expect(blockId2Findings[0].consensus).toBe(1);

    expect(result.patchPlan.actions.length).toBeGreaterThan(0);
    expect(result.patchPlan.jobId).toBe(meta.jobId);
    expect(result.generalSuggestions).toContain('Add force majeure clause');
    expect(result.providersUsed).toHaveLength(3);
  });

  it('sorts findings by severity then position', async () => {
    const meta = await createJob({ contractType: 'saas', side: 'contracted', jurisdiction: 'Brazil' });

    const output = makePersonaOutput('gpt', [
      { blockId: blockId2, severity: 'low', original: 'Low risk', suggested: 'Better', justification: 'Minor' },
      { blockId: blockId1, severity: 'critical', original: 'High risk', suggested: 'Fix', justification: 'Critical' },
    ]);

    await saveJobFile(meta.jobId, 'personas/gpt.json', JSON.stringify(output));

    const result = await consolidate(meta.jobId);
    expect(result.findings[0].severity).toBe('critical');
    expect(result.findings[1].severity).toBe('low');
  });

  it('saves consolidated.json to DB column', async () => {
    const meta = await createJob({ contractType: 'nda', side: 'contractor', jurisdiction: 'Brazil' });

    const output = makePersonaOutput('gpt', [
      { blockId: blockId1, severity: 'medium', original: 'Text', suggested: 'Better text', justification: 'Reason' },
    ]);
    await saveJobFile(meta.jobId, 'personas/gpt.json', JSON.stringify(output));

    await consolidate(meta.jobId);

    const saved = await getJobFile(meta.jobId, 'consolidated.json');
    expect(saved).not.toBeNull();
    const parsed = JSON.parse(saved!.toString());
    expect(parsed.findings).toBeDefined();
    expect(parsed.patchPlan).toBeDefined();
  });

  it('throws when no persona outputs exist', async () => {
    const meta = await createJob({ contractType: 'nda', side: 'contractor', jurisdiction: 'Brazil' });
    await expect(consolidate(meta.jobId)).rejects.toThrow('No valid outputs found for consolidation');
  });
});
