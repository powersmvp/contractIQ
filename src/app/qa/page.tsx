'use client';

import { useEffect, useState } from 'react';
import { BarChart3, TrendingUp, MessageSquare, ThumbsDown, Loader2, Sheet } from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import * as XLSX from 'xlsx';

interface QASummary {
  totalCompleted: number;
  totalWithFeedback: number;
  good: number;
  bad: number;
  satisfactionRate: number | null;
  badReasons: Record<string, number>;
  byContractType: Record<string, { good: number; bad: number }>;
  recentBad: Array<{
    jobId: string;
    contractType: string;
    reason: string | null;
    comment: string | null;
    createdAt: string;
  }>;
}

const REASON_LABELS: Record<string, string> = {
  irrelevant_findings: 'Achados irrelevantes',
  missed_clauses: 'Cláusulas perdidas',
  bad_suggestions: 'Sugestões ruins',
  wrong_severity: 'Severidade errada',
  other: 'Outro',
};

const TYPE_LABELS: Record<string, string> = {
  nda: 'NDA',
  saas: 'SaaS',
  partnership: 'Parceria',
};

const PIE_COLORS = ['#2e7d32', '#ba1a1a'];

export default function QAPage() {
  const [data, setData] = useState<QASummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/qa/summary')
      .then((res) => res.json())
      .then((json) => setData(json.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-10 w-10 animate-spin" style={{ color: 'var(--md-primary)' }} />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-xl p-6 text-center" style={{ backgroundColor: 'var(--md-error-container)', color: 'var(--md-on-error-container)' }}>
        Erro ao carregar dados de QA.
      </div>
    );
  }

  const pieData = [
    { name: 'Bom', value: data.good },
    { name: 'Ruim', value: data.bad },
  ].filter((d) => d.value > 0);

  const barData = Object.entries(data.badReasons).map(([key, count]) => ({
    name: REASON_LABELS[key] ?? key,
    count,
  }));

  function handleExportQA() {
    if (!data) return;
    const wb = XLSX.utils.book_new();

    const summaryRows = [
      { Métrica: 'Total Análises Concluídas', Valor: data.totalCompleted },
      { Métrica: 'Total com Feedback', Valor: data.totalWithFeedback },
      { Métrica: 'Bom', Valor: data.good },
      { Métrica: 'Ruim', Valor: data.bad },
      { Métrica: 'Taxa Satisfação (%)', Valor: data.satisfactionRate ?? 0 },
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryRows), 'Resumo');

    if (Object.keys(data.badReasons).length > 0) {
      const reasonRows = Object.entries(data.badReasons).map(([key, count]) => ({
        Motivo: REASON_LABELS[key] ?? key,
        Quantidade: count,
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(reasonRows), 'Motivos');
    }

    if (data.recentBad.length > 0) {
      const badRows = data.recentBad.map((item) => ({
        'Job ID': item.jobId.slice(0, 8),
        Tipo: TYPE_LABELS[item.contractType] ?? item.contractType,
        Motivo: item.reason ? REASON_LABELS[item.reason] ?? item.reason : '',
        Comentário: item.comment ?? '',
        Data: new Date(item.createdAt).toLocaleDateString('pt-BR'),
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(badRows), 'Feedback Negativo');
    }

    XLSX.writeFile(wb, 'qa-dashboard.xlsx');
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-xl font-semibold" style={{ color: 'var(--md-on-surface)' }}>
          <BarChart3 className="h-6 w-6" />
          Dashboard de Qualidade
        </h1>
        {data.totalWithFeedback > 0 && (
          <button
            onClick={handleExportQA}
            className="flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-all hover:shadow-md"
            style={{ borderColor: 'var(--confidence-strong)', color: 'var(--confidence-strong)' }}
          >
            <Sheet className="h-4 w-4" />
            Exportar QA (.xlsx)
          </button>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div
          className="rounded-xl p-4 shadow-sm"
          style={{ backgroundColor: 'var(--md-surface-container-low)', border: '1px solid var(--md-outline-variant)' }}
        >
          <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--md-on-surface-variant)' }}>
            <BarChart3 className="h-4 w-4" />
            Total Análises
          </div>
          <p className="mt-1 text-2xl font-semibold" style={{ color: 'var(--md-on-surface)' }}>
            {data.totalCompleted}
          </p>
        </div>

        <div
          className="rounded-xl p-4 shadow-sm"
          style={{ backgroundColor: 'var(--md-surface-container-low)', border: '1px solid var(--md-outline-variant)' }}
        >
          <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--md-on-surface-variant)' }}>
            <TrendingUp className="h-4 w-4" />
            Taxa de Satisfação
          </div>
          <p className="mt-1 text-2xl font-semibold" style={{ color: 'var(--confidence-strong)' }}>
            {data.satisfactionRate !== null ? `${data.satisfactionRate}%` : '—'}
          </p>
        </div>

        <div
          className="rounded-xl p-4 shadow-sm"
          style={{ backgroundColor: 'var(--md-surface-container-low)', border: '1px solid var(--md-outline-variant)' }}
        >
          <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--md-on-surface-variant)' }}>
            <MessageSquare className="h-4 w-4" />
            Feedbacks Recebidos
          </div>
          <p className="mt-1 text-2xl font-semibold" style={{ color: 'var(--md-on-surface)' }}>
            {data.totalWithFeedback}
          </p>
        </div>
      </div>

      {/* Charts */}
      {data.totalWithFeedback > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Pie Chart */}
          <div
            className="rounded-xl p-4 shadow-sm"
            style={{ backgroundColor: 'var(--md-surface-container-low)', border: '1px solid var(--md-outline-variant)' }}
          >
            <h2 className="mb-4 text-sm font-medium" style={{ color: 'var(--md-on-surface)' }}>
              Distribuição de Feedback
            </h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Bar Chart */}
          {barData.length > 0 && (
            <div
              className="rounded-xl p-4 shadow-sm"
              style={{ backgroundColor: 'var(--md-surface-container-low)', border: '1px solid var(--md-outline-variant)' }}
            >
              <h2 className="mb-4 text-sm font-medium" style={{ color: 'var(--md-on-surface)' }}>
                Motivos de Feedback Negativo
              </h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData} layout="vertical" margin={{ left: 20 }}>
                    <XAxis type="number" allowDecimals={false} />
                    <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#ba1a1a" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Recent bad feedback table */}
      {data.recentBad.length > 0 && (
        <div
          className="rounded-xl shadow-sm"
          style={{ backgroundColor: 'var(--md-surface-container-low)', border: '1px solid var(--md-outline-variant)' }}
        >
          <div className="flex items-center gap-2 p-4 pb-2">
            <ThumbsDown className="h-4 w-4" style={{ color: 'var(--md-error)' }} />
            <h2 className="text-sm font-medium" style={{ color: 'var(--md-on-surface)' }}>
              Feedback Negativo Recente
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ color: 'var(--md-on-surface-variant)' }}>
                  <th className="px-4 py-2 text-left font-medium">Job</th>
                  <th className="px-4 py-2 text-left font-medium">Tipo</th>
                  <th className="px-4 py-2 text-left font-medium">Motivo</th>
                  <th className="px-4 py-2 text-left font-medium">Comentário</th>
                  <th className="px-4 py-2 text-left font-medium">Data</th>
                </tr>
              </thead>
              <tbody>
                {data.recentBad.map((item) => (
                  <tr
                    key={item.jobId}
                    className="border-t"
                    style={{ borderColor: 'var(--md-outline-variant)', color: 'var(--md-on-surface)' }}
                  >
                    <td className="px-4 py-2">
                      <a
                        href={`/jobs/${item.jobId}`}
                        className="font-mono text-xs underline"
                        style={{ color: 'var(--md-primary)' }}
                      >
                        {item.jobId.slice(0, 8)}
                      </a>
                    </td>
                    <td className="px-4 py-2 text-xs">
                      {TYPE_LABELS[item.contractType] ?? item.contractType}
                    </td>
                    <td className="px-4 py-2 text-xs">
                      {item.reason ? REASON_LABELS[item.reason] ?? item.reason : '—'}
                    </td>
                    <td className="max-w-[200px] truncate px-4 py-2 text-xs" style={{ color: 'var(--md-on-surface-variant)' }}>
                      {item.comment ?? '—'}
                    </td>
                    <td className="px-4 py-2 text-xs" style={{ color: 'var(--md-on-surface-variant)' }}>
                      {new Date(item.createdAt).toLocaleDateString('pt-BR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {data.totalWithFeedback === 0 && (
        <div
          className="rounded-xl p-8 text-center"
          style={{ backgroundColor: 'var(--md-surface-container-low)', border: '1px solid var(--md-outline-variant)' }}
        >
          <MessageSquare className="mx-auto h-12 w-12" style={{ color: 'var(--md-outline)' }} />
          <p className="mt-3 text-sm" style={{ color: 'var(--md-on-surface-variant)' }}>
            Nenhum feedback recebido ainda. Os dados aparecerão aqui após os usuários avaliarem as análises.
          </p>
        </div>
      )}
    </div>
  );
}
