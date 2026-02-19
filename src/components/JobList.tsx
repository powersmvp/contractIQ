'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { Loader2, CheckCircle, XCircle, Clock, FileText, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';

interface JobSummary {
  jobId: string;
  status: string;
  contractType: string;
  side: string;
  jurisdiction: string;
  currentStage?: string;
  progress?: { completed: number; total: number };
  createdAt: string;
}

interface JobListProps {
  refreshTrigger: number;
}

const STATUS_LABELS: Record<string, string> = {
  created: 'Criado',
  processing: 'Processando',
  analyzed: 'Analisado',
  completed: 'Concluído',
  failed: 'Falhou',
  expired: 'Expirado',
};

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  created: { bg: 'var(--md-surface-variant)', text: 'var(--md-on-surface-variant)' },
  processing: { bg: 'var(--md-tertiary-container)', text: 'var(--md-on-tertiary-container)' },
  analyzed: { bg: 'var(--md-secondary-container)', text: 'var(--md-on-secondary-container)' },
  completed: { bg: 'var(--md-primary-container)', text: 'var(--md-on-primary-container)' },
  failed: { bg: 'var(--md-error-container)', text: 'var(--md-on-error-container)' },
  expired: { bg: 'var(--md-surface-variant)', text: 'var(--md-on-surface-variant)' },
};

const STATUS_ICONS: Record<string, typeof CheckCircle> = {
  created: Clock,
  processing: Loader2,
  analyzed: AlertCircle,
  completed: CheckCircle,
  failed: XCircle,
  expired: Clock,
};

const TYPE_LABELS: Record<string, string> = {
  nda: 'NDA',
  saas: 'SaaS',
  partnership: 'Parceria',
};

const SIDE_LABELS: Record<string, string> = {
  contractor: 'Contratante',
  contracted: 'Contratado',
};

const STAGE_LABELS: Record<string, string> = {
  ingest: 'Lendo documento',
  personas: 'Analisando com IAs',
  debate: 'Debate entre IAs',
  verdict: 'Veredito final',
  consolidate: 'Consolidando achados',
  render: 'Gerando output',
};

type StatusFilter = 'all' | 'processing' | 'completed' | 'failed';

const FILTER_OPTIONS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'Todos' },
  { key: 'processing', label: 'Processando' },
  { key: 'completed', label: 'Concluído' },
  { key: 'failed', label: 'Falhou' },
];

const JOBS_PER_PAGE = 10;

export function JobList({ refreshTrigger }: JobListProps) {
  const [jobs, setJobs] = useState<JobSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [currentPage, setCurrentPage] = useState(1);

  const fetchJobs = useCallback(async () => {
    try {
      const res = await fetch('/api/jobs');
      const data = await res.json();
      setJobs(data.data?.jobs ?? []);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs, refreshTrigger]);

  // Poll for active jobs every 5s
  useEffect(() => {
    const hasActiveJobs = jobs.some((j) => j.status === 'processing' || j.status === 'created');
    if (!hasActiveJobs) return;

    const timeoutId = setTimeout(fetchJobs, 5000);
    return () => clearTimeout(timeoutId);
  }, [jobs, fetchJobs]);

  // Filter jobs based on status filter
  const filteredJobs = useMemo(() => {
    if (statusFilter === 'all') return jobs;
    if (statusFilter === 'processing') {
      return jobs.filter((j) => j.status === 'processing' || j.status === 'created');
    }
    return jobs.filter((j) => j.status === statusFilter);
  }, [jobs, statusFilter]);

  // Reset to page 1 when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter]);

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil(filteredJobs.length / JOBS_PER_PAGE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedJobs = filteredJobs.slice(
    (safeCurrentPage - 1) * JOBS_PER_PAGE,
    safeCurrentPage * JOBS_PER_PAGE,
  );
  const showPagination = filteredJobs.length > JOBS_PER_PAGE;

  if (loading) {
    return (
      <div className="flex justify-center py-8" role="status" aria-label="Carregando análises">
        <Loader2
          className="h-6 w-6 animate-spin"
          style={{ color: 'var(--md-primary)' }}
        />
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <p className="py-4 text-sm" style={{ color: 'var(--md-on-surface-variant)' }}>
        Nenhuma análise realizada ainda. Envie um contrato acima para começar.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {/* Status filter chips */}
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Filtrar por status">
        {FILTER_OPTIONS.map((option) => {
          const isActive = statusFilter === option.key;
          return (
            <button
              key={option.key}
              type="button"
              role="radio"
              aria-checked={isActive}
              onClick={() => setStatusFilter(option.key)}
              className="rounded-full px-3 py-1 text-xs font-medium transition-colors cursor-pointer"
              style={{
                backgroundColor: isActive ? 'var(--md-primary)' : 'var(--md-surface-variant)',
                color: isActive ? 'var(--md-on-primary)' : 'var(--md-on-surface-variant)',
                border: isActive ? '1px solid var(--md-primary)' : '1px solid var(--md-outline-variant)',
              }}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      {/* Job list */}
      {filteredJobs.length === 0 ? (
        <p className="py-4 text-sm" style={{ color: 'var(--md-on-surface-variant)' }}>
          Nenhuma análise encontrada com esse filtro.
        </p>
      ) : (
        <div className="grid gap-3">
          {paginatedJobs.map((job) => {
            const colors = STATUS_COLORS[job.status] ?? STATUS_COLORS.created;
            const StatusIcon = STATUS_ICONS[job.status] ?? Clock;
            const isProcessing = job.status === 'processing';
            const typeLabel = TYPE_LABELS[job.contractType] ?? job.contractType;
            const sideLabel = SIDE_LABELS[job.side] ?? job.side;

            return (
              <a
                key={job.jobId}
                href={`/jobs/${job.jobId}`}
                aria-label={`Análise ${typeLabel} — ${STATUS_LABELS[job.status] ?? job.status}`}
                className="block rounded-xl p-4 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5"
                style={{
                  backgroundColor: 'var(--md-surface-container-low)',
                  border: '1px solid var(--md-outline-variant)',
                }}
              >
                {/* Primary info: contract type + side + jurisdiction */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="flex items-center gap-1 text-sm font-semibold" style={{ color: 'var(--md-on-surface)' }}>
                        <FileText className="h-4 w-4 shrink-0" style={{ color: 'var(--md-primary)' }} />
                        {typeLabel}
                      </span>
                      <span
                        className="rounded-md px-1.5 py-0.5 text-xs font-medium"
                        style={{
                          backgroundColor: 'var(--md-secondary-container)',
                          color: 'var(--md-on-secondary-container)',
                        }}
                      >
                        {sideLabel}
                      </span>
                      {job.jurisdiction && (
                        <span
                          className="text-xs"
                          style={{ color: 'var(--md-on-surface-variant)' }}
                        >
                          {job.jurisdiction}
                        </span>
                      )}
                    </div>
                    {/* Secondary info: UUID + timestamp */}
                    <div className="mt-1 flex items-center gap-2 text-xs" style={{ color: 'var(--md-on-surface-variant)' }}>
                      <span className="font-mono">{job.jobId.slice(0, 8)}</span>
                      <span>·</span>
                      <span>{new Date(job.createdAt).toLocaleString('pt-BR')}</span>
                    </div>
                  </div>

                  {/* Status badge */}
                  <span
                    className="flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
                    style={{ backgroundColor: colors.bg, color: colors.text }}
                  >
                    <StatusIcon className={`h-3 w-3 ${isProcessing ? 'animate-spin' : ''}`} />
                    {STATUS_LABELS[job.status] ?? job.status}
                  </span>
                </div>

                {/* Progress bar for processing jobs */}
                {isProcessing && job.currentStage && (
                  <div className="mt-2" aria-busy="true" aria-label="Processamento em andamento">
                    <div className="mb-1 flex justify-between text-xs" style={{ color: 'var(--md-on-surface-variant)' }}>
                      <span>{STAGE_LABELS[job.currentStage] ?? job.currentStage}</span>
                      {job.progress && <span>{job.progress.completed}/{job.progress.total}</span>}
                    </div>
                    <div className="h-1.5 rounded-full" style={{ backgroundColor: 'var(--md-surface-variant)' }}>
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          backgroundColor: 'var(--md-primary)',
                          width: job.progress ? `${(job.progress.completed / job.progress.total) * 100}%` : '30%',
                        }}
                      />
                    </div>
                  </div>
                )}
              </a>
            );
          })}
        </div>
      )}

      {/* Pagination controls */}
      {showPagination && (
        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            disabled={safeCurrentPage <= 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
            style={{
              backgroundColor: 'var(--md-surface-variant)',
              color: 'var(--md-on-surface-variant)',
            }}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Anterior
          </button>
          <span className="text-xs" style={{ color: 'var(--md-on-surface-variant)' }}>
            Página {safeCurrentPage} de {totalPages}
          </span>
          <button
            type="button"
            disabled={safeCurrentPage >= totalPages}
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
            style={{
              backgroundColor: 'var(--md-surface-variant)',
              color: 'var(--md-on-surface-variant)',
            }}
          >
            Próximo
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
