import type { DocAST } from '@/lib/schemas/docast.schema';
import type { ProviderName } from '@/lib/config/env.config';
import type { PersonaOutput } from '@/lib/schemas/persona-output.schema';
import type { DebateRoundOutput } from '@/lib/schemas/debate.schema';

interface PromptParams {
  contractType: string;
  side: string;
  jurisdiction: string;
}

/**
 * Round 2 — Debate: each provider sees ALL Round 1 findings and argues.
 */
export function buildDebatePrompt(
  provider: ProviderName,
  docAst: DocAST,
  params: PromptParams,
  allRound1: { provider: string; output: PersonaOutput }[],
): string {
  const findingsSummary = allRound1.map(({ provider: p, output }) => ({
    provider: p,
    findings: output.findings.map((f) => ({
      blockId: f.blockId,
      severity: f.severity,
      original: f.original.slice(0, 200),
      suggested: f.suggested.slice(0, 200),
      justification: f.justification,
    })),
  }));

  const docAstJson = JSON.stringify({
    blocks: docAst.blocks.map((b) => ({
      blockId: b.blockId,
      type: b.type,
      content: b.content.slice(0, 300),
      index: b.index,
    })),
  });

  return `Você é um especialista sênior em análise de contratos participando de um debate com outros analistas.

## Contexto
- Tipo de contrato: ${params.contractType}
- Lado do cliente: ${params.side}
- Jurisdição: ${params.jurisdiction}

## Documento (DocAST resumido)
${docAstJson}

## Rodada 1 — Findings de todos os analistas
${JSON.stringify(findingsSummary, null, 2)}

## Sua Tarefa (Rodada 2 — Debate)
Você é o analista "${provider}". Analise os findings de TODOS os analistas da Rodada 1 e para CADA finding:

1. **agree** — Se concorda integralmente com o finding
2. **disagree** — Se discorda e explique por quê
3. **adjust** — Se concorda parcialmente mas sugere ajuste na severidade ou redação

Para cada finding, forneça um argumento claro em português brasileiro explicando sua posição.

Se identificou problemas que NENHUM analista da Rodada 1 encontrou, inclua em "newFindings".

IMPORTANTE: Todos os textos DEVEM ser em português brasileiro.

Retorne APENAS JSON válido nesta estrutura:

{
  "provider": "${provider}",
  "responses": [
    {
      "originalProvider": "nome-do-analista-original",
      "blockId": "uuid-do-bloco",
      "stance": "agree|disagree|adjust",
      "adjustedSeverity": "critical|high|medium|low",
      "argument": "explicação da posição"
    }
  ],
  "newFindings": [
    {
      "blockId": "uuid-do-bloco",
      "severity": "critical|high|medium|low",
      "original": "texto original",
      "suggested": "texto melhorado",
      "justification": "razão da alteração"
    }
  ],
  "analyzedAt": "${new Date().toISOString()}"
}

Retorne APENAS o objeto JSON. Sem markdown, sem explicações, sem blocos de código.`;
}

/**
 * Round 3 — Final Verdict: each provider sees Round 1 + Round 2 and produces
 * final findings with confidence scores.
 */
export function buildFinalVerdictPrompt(
  provider: ProviderName,
  docAst: DocAST,
  params: PromptParams,
  allRound1: { provider: string; output: PersonaOutput }[],
  allDebate: { provider: string; output: DebateRoundOutput }[],
): string {
  const round1Summary = allRound1.map(({ provider: p, output }) => ({
    provider: p,
    findingsCount: output.findings.length,
    findings: output.findings.map((f) => ({
      blockId: f.blockId,
      severity: f.severity,
      justification: f.justification.slice(0, 150),
    })),
  }));

  const debateSummary = allDebate.map(({ provider: p, output }) => ({
    provider: p,
    responses: output.responses.map((r) => ({
      originalProvider: r.originalProvider,
      blockId: r.blockId,
      stance: r.stance,
      adjustedSeverity: r.adjustedSeverity,
      argument: r.argument.slice(0, 200),
    })),
    newFindings: output.newFindings?.length ?? 0,
  }));

  const docAstJson = JSON.stringify({
    blocks: docAst.blocks.map((b) => ({
      blockId: b.blockId,
      type: b.type,
      content: b.content.slice(0, 300),
      index: b.index,
    })),
  });

  return `Você é um especialista sênior em análise de contratos emitindo seu veredito final após um debate com outros analistas.

## Contexto
- Tipo de contrato: ${params.contractType}
- Lado do cliente: ${params.side}
- Jurisdição: ${params.jurisdiction}

## Documento (DocAST resumido)
${docAstJson}

## Rodada 1 — Análise Inicial
${JSON.stringify(round1Summary, null, 2)}

## Rodada 2 — Debate
${JSON.stringify(debateSummary, null, 2)}

## Sua Tarefa (Rodada 3 — Veredito Final)
Você é o analista "${provider}". Considerando TODA a análise inicial E o debate, emita seu veredito final.

Para cada finding, indique:
- **confidence**: "strong" (consenso unânime ou quase), "moderate" (maioria concordou com ajustes), "weak" (houve divergência significativa)
- **debateNotes**: resumo breve de como o debate influenciou esta conclusão

Inclua APENAS findings que você considera válidos após o debate. Descarte findings que foram refutados de forma convincente.

IMPORTANTE: Todos os textos DEVEM ser em português brasileiro.

Retorne APENAS JSON válido nesta estrutura:

{
  "provider": "${provider}",
  "findings": [
    {
      "blockId": "uuid-do-bloco",
      "severity": "critical|high|medium|low",
      "original": "texto original",
      "suggested": "texto melhorado",
      "justification": "razão da alteração",
      "confidence": "strong|moderate|weak",
      "debateNotes": "notas sobre o debate"
    }
  ],
  "generalSuggestions": ["sugestão 1", "sugestão 2"],
  "analyzedAt": "${new Date().toISOString()}"
}

Retorne APENAS o objeto JSON. Sem markdown, sem explicações, sem blocos de código.`;
}
