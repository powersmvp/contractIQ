import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle } from 'docx';
import { getJob, updateJob, getJobFile, saveJobFile } from '@/lib/jobs/job-manager';
import { FinalReportSchema, type FinalReport } from '@/lib/schemas/final-report.schema';
import { logger } from '@/lib/logger/logger';

const SEVERITY_COLORS: Record<string, string> = {
  critical: 'CC0000',
  high: 'E65100',
  medium: 'F9A825',
  low: '1565C0',
};

const SEVERITY_LABELS: Record<string, string> = {
  critical: 'CRITICO',
  high: 'ALTO',
  medium: 'MEDIO',
  low: 'BAIXO',
};

const CONFIDENCE_LABELS: Record<string, string> = {
  strong: 'Consenso Forte',
  moderate: 'Consenso Moderado',
  weak: 'Debatido',
};

export async function renderDocx(jobId: string): Promise<void> {
  const meta = await getJob(jobId);
  if (!meta) throw new Error(`Job not found: ${jobId}`);

  await updateJob(jobId, { currentStage: 'render' });

  const consolidatedRaw = await getJobFile(jobId, 'consolidated.json');
  if (!consolidatedRaw) throw new Error('consolidated.json not found');

  const consolidated = JSON.parse(consolidatedRaw.toString());
  const { findings, patchPlan, generalSuggestions, providersUsed, debateMode } = consolidated;

  // Generate Final Report
  const report: FinalReport = FinalReportSchema.parse({
    tenantId: meta.tenantId,
    jobId,
    metadata: {
      contractType: meta.contractType,
      side: meta.side,
      jurisdiction: meta.jurisdiction,
      analyzedAt: new Date().toISOString(),
      providersUsed,
    },
    summary: {
      totalFindings: findings.length,
      bySeverity: {
        critical: findings.filter((f: { severity: string }) => f.severity === 'critical').length,
        high: findings.filter((f: { severity: string }) => f.severity === 'high').length,
        medium: findings.filter((f: { severity: string }) => f.severity === 'medium').length,
        low: findings.filter((f: { severity: string }) => f.severity === 'low').length,
      },
    },
    findings,
    generalSuggestions: generalSuggestions ?? [],
  });

  // Save report.json
  await saveJobFile(jobId, 'report.json', JSON.stringify(report, null, 2));

  // Generate .docx
  const sections: Paragraph[] = [];

  // Title
  sections.push(new Paragraph({
    children: [new TextRun({ text: `Análise de Contrato — ${meta.contractType.toUpperCase()}`, bold: true, size: 32 })],
    heading: HeadingLevel.HEADING_1,
    spacing: { after: 200 },
  }));

  // Metadata
  sections.push(new Paragraph({
    children: [new TextRun({ text: `Lado: ${meta.side} | Jurisdição: ${meta.jurisdiction} | Data: ${new Date().toLocaleDateString('pt-BR')}`, size: 20, color: '666666' })],
    spacing: { after: 200 },
  }));

  // Disclaimer
  sections.push(new Paragraph({
    children: [new TextRun({ text: 'AVISO LEGAL: ', bold: true, size: 20, color: 'CC0000' }), new TextRun({ text: 'Esta análise não substitui consultoria jurídica profissional. Os resultados são sugestivos e devem ser validados por um advogado qualificado.', size: 20, color: '666666' })],
    border: { top: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' }, bottom: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' }, left: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' }, right: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' } },
    spacing: { before: 200, after: 400 },
  }));

  // Summary
  const modeLabel = debateMode === 'debate' ? ' | Modo: Debate (3 rodadas)' : '';
  sections.push(new Paragraph({
    children: [new TextRun({ text: `Resumo: ${report.summary.totalFindings} achados — ${report.summary.bySeverity.critical} críticos, ${report.summary.bySeverity.high} altos, ${report.summary.bySeverity.medium} médios, ${report.summary.bySeverity.low} baixos${modeLabel}`, bold: true, size: 22 })],
    spacing: { after: 400 },
  }));

  // Findings
  if (patchPlan.actions.length > 0) {
    sections.push(new Paragraph({
      children: [new TextRun({ text: 'Achados e Sugestões', bold: true, size: 28 })],
      heading: HeadingLevel.HEADING_2,
      spacing: { after: 200 },
    }));

    for (let i = 0; i < findings.length; i++) {
      const finding = findings[i] as {
        severity: string; original: string; suggested: string;
        justification: string; consensus: number; sources: string[];
        confidence?: string; debateNotes?: string;
      };
      if (!finding.suggested || finding.suggested === finding.original) continue;

      const color = SEVERITY_COLORS[finding.severity] ?? '000000';
      const label = SEVERITY_LABELS[finding.severity] ?? finding.severity;

      // Finding header with confidence badge
      const headerChildren = [
        new TextRun({ text: `#${i + 1} `, bold: true, size: 22 }),
        new TextRun({ text: `[${label}] `, bold: true, size: 22, color }),
      ];
      if (finding.confidence && CONFIDENCE_LABELS[finding.confidence]) {
        headerChildren.push(new TextRun({ text: `[${CONFIDENCE_LABELS[finding.confidence]}] `, bold: true, size: 18, color: finding.confidence === 'strong' ? '2E7D32' : finding.confidence === 'moderate' ? 'F57F17' : 'BF360C' }));
      }
      headerChildren.push(new TextRun({ text: `Consenso: ${finding.consensus}/${providersUsed.length} LLMs`, size: 18, color: '888888' }));

      sections.push(new Paragraph({
        children: headerChildren,
        spacing: { before: 300, after: 100 },
      }));

      // Original (ANTES)
      sections.push(new Paragraph({
        children: [
          new TextRun({ text: 'ANTES: ', bold: true, size: 20, color: 'CC0000' }),
          new TextRun({ text: finding.original, size: 20, strike: true }),
        ],
        spacing: { after: 100 },
      }));

      // Suggested (DEPOIS)
      sections.push(new Paragraph({
        children: [
          new TextRun({ text: 'DEPOIS: ', bold: true, size: 20, color: '008800' }),
          new TextRun({ text: finding.suggested, size: 20 }),
        ],
        spacing: { after: 100 },
      }));

      // Justification
      sections.push(new Paragraph({
        children: [
          new TextRun({ text: 'Justificativa: ', bold: true, size: 18, italics: true }),
          new TextRun({ text: finding.justification, size: 18, italics: true, color: '555555' }),
        ],
        spacing: { after: finding.debateNotes ? 100 : 200 },
      }));

      // Debate notes (only in debate mode)
      if (finding.debateNotes) {
        sections.push(new Paragraph({
          children: [
            new TextRun({ text: 'Notas do debate: ', bold: true, size: 16, italics: true, color: '666666' }),
            new TextRun({ text: finding.debateNotes, size: 16, italics: true, color: '888888' }),
          ],
          spacing: { after: 200 },
        }));
      }
    }
  }

  // General suggestions
  if (generalSuggestions && generalSuggestions.length > 0) {
    sections.push(new Paragraph({
      children: [new TextRun({ text: 'Sugestões Gerais', bold: true, size: 28 })],
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 400, after: 200 },
    }));

    for (const suggestion of generalSuggestions) {
      sections.push(new Paragraph({
        children: [new TextRun({ text: `• ${suggestion}`, size: 20 })],
        spacing: { after: 100 },
      }));
    }
  }

  const doc = new Document({ sections: [{ children: sections }] });
  const buffer = await Packer.toBuffer(doc);

  await saveJobFile(jobId, 'output.docx', Buffer.from(buffer));

  logger.info('Output rendered', { jobId, findingsCount: findings.length, debateMode });
}
