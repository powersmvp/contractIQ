'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Loader2, FileDown, FileJson, AlertTriangle, Sheet, ArrowLeft, RotateCcw, CheckCircle2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Disclaimer } from '@/components/Disclaimer';
import { FindingCard } from '@/components/FindingCard';
import { FeedbackButton } from '@/components/FeedbackButton';

interface JobData {
  jobId: string;
  status: string;
  contractType: string;
  side: string;
  jurisdiction: string;
  currentStage?: string;
  progress?: { completed: number; total: number };
  errorCode?: string;
  errorMessage?: string;
  feedback?: { rating: 'good' | 'bad' };
}

interface ReportData {
  metadata: { providersUsed: string[] };
  summary: { totalFindings: number; bySeverity: Record<string, number> };
  findings: Array<{
    id: string;
    severity: string;
    original: string;
    suggested: string;
    justification: string;
    consensus: number;
    sources: string[];
    confidence?: 'strong' | 'moderate' | 'weak';
    debateNotes?: string;
  }>;
  generalSuggestions: string[];
}

const PIPELINE_STAGES = [
  { key: 'ingest', label: 'Leitura' },
  { key: 'personas', label: 'Análise' },
  { key: 'debate', label: 'Debate' },
  { key: 'verdict', label: 'Veredito' },
  { key: 'consolidate', label: 'Consolidação' },
  { key: 'render', label: 'Output' },
] as const;

const STAGE_LABELS: Record<string, string> = {
  ingest: 'Lendo documento...',
  personas: 'Rodada 1: Analisando com IAs...',
  debate: 'Rodada 2: Debate entre IAs...',
  verdict: 'Rodada 3: Veredito final...',
  consolidate: 'Consolidando achados...',
  render: 'Gerando outputs...',
};

function StageProgress({ currentStage }: { currentStage: string }) {
  const currentIdx = PIPELINE_STAGES.findIndex((s) => s.key === currentStage);
  return (
    <div className="flex items-center gap-1 w-full max-w-md" aria-label="Progresso do pipeline">
      {PIPELINE_STAGES.map((stage, i) => {
        const done = i < currentIdx;
        const active = i === currentIdx;
        return (
          <div key={stage.key} className="flex flex-1 flex-col items-center gap-1">
            <div
              className="h-2 w-full rounded-full transition-all"
              style={{
                backgroundColor: done
                  ? 'var(--md-primary)'
                  : active
                    ? 'var(--md-tertiary)'
                    : 'var(--md-surface-variant)',
              }}
            />
            <span
              className="text-[10px] font-medium"
              style={{
                color: done || active ? 'var(--md-on-surface)' : 'var(--md-outline)',
              }}
            >
              {stage.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

const ERROR_MESSAGES: Record<string, { title: string; description: string; action?: string }> = {
  INSUFFICIENT_PROVIDERS: {
    title: 'Serviços de IA insuficientes',
    description: 'São necessários pelo menos 3 serviços de IA configurados para executar a análise.',
    action: '/config',
  },
  INSUFFICIENT_RESPONSES: {
    title: 'Poucas IAs responderam',
    description: 'Nem todas as IAs conseguiram processar o contrato. Verifique se suas chaves de API estão válidas na página de Configuração.',
    action: '/config',
  },
  INGEST_FAILED: {
    title: 'Erro ao processar documento',
    description: 'Não foi possível ler o conteúdo do arquivo. Verifique se o .docx não está corrompido e tente enviá-lo novamente.',
  },
  UNKNOWN_ERROR: {
    title: 'Erro inesperado',
    description: 'Ocorreu um erro durante a análise. Tente enviar o contrato novamente. Se o problema persistir, verifique a página de Configuração.',
    action: '/config',
  },
};

const SEVERITY_CHIPS: Record<string, { bg: string; text: string; label: string }> = {
  critical: { bg: 'var(--severity-critical-container)', text: 'var(--severity-critical)', label: 'Crítico' },
  high: { bg: 'var(--severity-high-container)', text: 'var(--severity-high)', label: 'Alto' },
  medium: { bg: 'var(--severity-medium-container)', text: 'var(--severity-medium)', label: 'Médio' },
  low: { bg: 'var(--severity-low-container)', text: 'var(--severity-low)', label: 'Baixo' },
};

export default function JobResultPage() {
  const params = useParams();
  const jobId = params.jobId as string;

  const [job, setJob] = useState<JobData | null>(null);
  const [report, setReport] = useState<ReportData | null>(null);
  const [severityFilter, setSeverityFilter] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchJob = useCallback(async () => {
    try {
      const res = await fetch(`/api/jobs/${jobId}`);
      const data = await res.json();
      if (res.ok) {
        setJob(data.data);
        // Load report if completed
        if (data.data.status === 'completed' && !report) {
          const reportRes = await fetch(`/api/jobs/${jobId}/report`);
          if (reportRes.ok) {
            setReport(await reportRes.json());
          }
        }
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [jobId, report]);

  useEffect(() => {
    fetchJob();
  }, [fetchJob]);

  // Poll while processing
  useEffect(() => {
    if (!job || (job.status !== 'processing' && job.status !== 'created')) return;
    const timeout = setTimeout(fetchJob, 5000);
    return () => clearTimeout(timeout);
  }, [job, fetchJob]);

  const backLink = (
    <a
      href="/"
      className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium transition-colors hover:underline"
      style={{ color: 'var(--md-primary)' }}
    >
      <ArrowLeft className="h-4 w-4" />
      Voltar para análises
    </a>
  );

  if (loading) {
    return (
      <div className="flex justify-center py-16" role="status" aria-label="Carregando análise">
        <Loader2
          className="h-10 w-10 animate-spin"
          style={{ color: 'var(--md-primary)' }}
        />
      </div>
    );
  }

  if (!job) {
    return (
      <div>
        {backLink}
        <div className="rounded-xl p-6 text-center" style={{ backgroundColor: 'var(--md-error-container)', color: 'var(--md-on-error-container)' }}>
          Análise não encontrada. Ela pode ter expirado ou sido removida.
        </div>
      </div>
    );
  }

  // Processing state
  if (job.status === 'processing' || job.status === 'created') {
    return (
      <div className="space-y-6">
        {backLink}
        <h1 className="text-xl font-semibold" style={{ color: 'var(--md-on-surface)' }}>
          Analisando Contrato...
        </h1>
        <div className="flex flex-col items-center gap-5 py-12" aria-busy="true" aria-label="Análise em andamento">
          <Loader2
            className="h-12 w-12 animate-spin"
            style={{ color: 'var(--md-primary)' }}
          />
          <p className="text-sm font-medium" style={{ color: 'var(--md-on-surface)' }}>
            {STAGE_LABELS[job.currentStage ?? ''] ?? 'Iniciando...'}
          </p>

          {/* Segmented stage progress */}
          <StageProgress currentStage={job.currentStage ?? 'ingest'} />

          {job.progress && (
            <p className="text-xs" style={{ color: 'var(--md-on-surface-variant)' }}>
              {job.progress.completed}/{job.progress.total} IAs responderam
            </p>
          )}

          <p className="text-xs" style={{ color: 'var(--md-outline)' }}>
            Atualização automática a cada 5 segundos
          </p>
        </div>
      </div>
    );
  }

  // Failed state
  if (job.status === 'failed') {
    const knownError = ERROR_MESSAGES[job.errorCode ?? ''];
    return (
      <div className="space-y-4">
        {backLink}
        <h1 className="text-xl font-semibold" style={{ color: 'var(--md-on-surface)' }}>
          Análise Falhou
        </h1>
        <div className="flex items-start gap-3 rounded-xl p-4" role="alert" style={{ backgroundColor: 'var(--md-error-container)', color: 'var(--md-on-error-container)' }}>
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-medium">{knownError?.title ?? job.errorCode ?? 'Erro desconhecido'}</p>
            <p className="mt-1 text-sm">{knownError?.description ?? job.errorMessage ?? 'Ocorreu um erro inesperado durante a análise.'}</p>
            {knownError?.action && (
              <a
                href={knownError.action}
                className="mt-2 inline-flex items-center gap-1 text-sm font-medium underline"
                style={{ color: 'var(--md-on-error-container)' }}
              >
                Ir para Configuração
              </a>
            )}
          </div>
        </div>

        <a
          href="/"
          className="inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium transition-all hover:shadow-md"
          style={{ backgroundColor: 'var(--md-primary)', color: 'var(--md-on-primary)' }}
        >
          <RotateCcw className="h-4 w-4" />
          Tentar novamente
        </a>
      </div>
    );
  }

  function handleExportExcel() {
    if (!report) return;
    const wb = XLSX.utils.book_new();

    // Findings sheet
    const findingsData = report.findings.map((f, i) => ({
      '#': i + 1,
      Severidade: f.severity,
      'Texto Original': f.original,
      'Texto Sugerido': f.suggested,
      Justificativa: f.justification,
      Consenso: f.consensus,
      Confiança: f.confidence ?? '',
      Fontes: f.sources.join(', '),
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(findingsData), 'Findings');

    // Suggestions sheet
    if (report.generalSuggestions.length > 0) {
      const sugData = report.generalSuggestions.map((s, i) => ({ '#': i + 1, Sugestão: s }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sugData), 'Sugestões');
    }

    // Summary sheet
    const summaryData = [
      { Campo: 'Job ID', Valor: jobId },
      { Campo: 'Tipo', Valor: job?.contractType ?? '' },
      { Campo: 'Lado', Valor: job?.side ?? '' },
      { Campo: 'Jurisdição', Valor: job?.jurisdiction ?? '' },
      { Campo: 'Total Findings', Valor: String(report.summary.totalFindings) },
      { Campo: 'Providers', Valor: report.metadata.providersUsed.join(', ') },
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryData), 'Resumo');

    XLSX.writeFile(wb, `analise-${jobId.slice(0, 8)}.xlsx`);
  }

  // Completed state
  const filteredFindings = report?.findings.filter(
    (f) => !severityFilter || f.severity === severityFilter,
  ) ?? [];

  return (
    <div className="space-y-6">
      {backLink}
      <h1 className="text-xl font-semibold" style={{ color: 'var(--md-on-surface)' }}>
        Resultado da Análise
      </h1>

      {/* Job metadata */}
      <div className="flex flex-wrap gap-2 text-xs" style={{ color: 'var(--md-on-surface-variant)' }}>
        <span className="rounded-full px-2.5 py-0.5" style={{ backgroundColor: 'var(--md-surface-variant)' }}>
          {job.contractType === 'nda' ? 'NDA' : job.contractType === 'saas' ? 'SaaS' : job.contractType === 'partnership' ? 'Parceria' : job.contractType}
        </span>
        <span className="rounded-full px-2.5 py-0.5" style={{ backgroundColor: 'var(--md-surface-variant)' }}>
          {job.side === 'contractor' ? 'Contratante' : 'Contratado'}
        </span>
        <span className="rounded-full px-2.5 py-0.5" style={{ backgroundColor: 'var(--md-surface-variant)' }}>
          {job.jurisdiction}
        </span>
      </div>

      <Disclaimer />

      {/* Summary chips */}
      {report && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSeverityFilter(null)}
            className="rounded-full px-3 py-1 text-xs font-medium transition-all hover:shadow-sm"
            style={{
              backgroundColor: !severityFilter ? 'var(--md-primary)' : 'var(--md-surface-variant)',
              color: !severityFilter ? 'var(--md-on-primary)' : 'var(--md-on-surface-variant)',
            }}
          >
            Todos ({report.summary.totalFindings})
          </button>
          {Object.entries(report.summary.bySeverity).map(([sev, count]) => {
            const chip = SEVERITY_CHIPS[sev];
            if (!chip || count === 0) return null;
            return (
              <button
                key={sev}
                onClick={() => setSeverityFilter(severityFilter === sev ? null : sev)}
                className="rounded-full px-3 py-1 text-xs font-medium transition-all hover:shadow-sm"
                style={{
                  backgroundColor: severityFilter === sev ? chip.text : chip.bg,
                  color: severityFilter === sev ? '#fff' : chip.text,
                }}
              >
                {chip.label} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* Findings */}
      <div className="grid gap-3">
        {filteredFindings.map((finding, i) => (
          <FindingCard
            key={finding.id}
            index={i}
            severity={finding.severity}
            original={finding.original}
            suggested={finding.suggested}
            justification={finding.justification}
            consensus={finding.consensus}
            totalProviders={report?.metadata.providersUsed.length ?? 5}
            sources={finding.sources}
            confidence={finding.confidence}
            debateNotes={finding.debateNotes}
          />
        ))}
      </div>

      {/* General suggestions */}
      {report && report.generalSuggestions.length > 0 && (
        <div>
          <h2 className="mb-2 text-lg font-medium" style={{ color: 'var(--md-on-surface)' }}>
            Sugestões Gerais
          </h2>
          <ul className="space-y-1 text-sm" style={{ color: 'var(--md-on-surface-variant)' }}>
            {report.generalSuggestions.map((s, i) => (
              <li key={i}>• {s}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Download buttons */}
      <div className="flex flex-wrap gap-3">
        <a
          href={`/api/jobs/${jobId}/output`}
          className="flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium transition-all hover:shadow-md"
          style={{ backgroundColor: 'var(--md-primary)', color: 'var(--md-on-primary)' }}
        >
          <FileDown className="h-4 w-4" />
          Baixar Minuta (.docx)
        </a>
        <a
          href={`/api/jobs/${jobId}/report`}
          className="flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-medium transition-all hover:shadow-md"
          style={{ borderColor: 'var(--md-primary)', color: 'var(--md-primary)' }}
        >
          <FileJson className="h-4 w-4" />
          Baixar Relatório (.json)
        </a>
        <button
          onClick={handleExportExcel}
          disabled={!report}
          className="flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-medium transition-all hover:shadow-md disabled:opacity-50"
          style={{ borderColor: 'var(--confidence-strong)', color: 'var(--confidence-strong)' }}
        >
          <Sheet className="h-4 w-4" />
          Exportar Excel (.xlsx)
        </button>
      </div>

      {/* Feedback */}
      <FeedbackButton jobId={jobId} initialRating={job.feedback?.rating ?? null} />
    </div>
  );
}
