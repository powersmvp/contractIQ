import fs from 'fs';
import path from 'path';
import YAML from 'yaml';
import type { DocAST } from '@/lib/schemas/docast.schema';
import type { ProviderName } from '@/lib/config/env.config';

let cachedPlaybook: string | null = null;

function getPlaybook(): string {
  if (cachedPlaybook) return cachedPlaybook;
  const playbookPath = path.join(process.cwd(), 'src/lib/prompts/base-playbook.yaml');
  const raw = fs.readFileSync(playbookPath, 'utf-8');
  const parsed = YAML.parse(raw);
  cachedPlaybook = YAML.stringify(parsed);
  return cachedPlaybook;
}

interface PromptParams {
  contractType: string;
  side: string;
  jurisdiction: string;
}

export function buildPrompt(provider: ProviderName, docAst: DocAST, params: PromptParams): string {
  const playbook = getPlaybook();

  const docAstJson = JSON.stringify({
    blocks: docAst.blocks.map((b) => ({
      blockId: b.blockId,
      type: b.type,
      content: b.content,
      index: b.index,
    })),
  });

  return `Você é um especialista sênior em análise de contratos com ampla experiência em direito contratual, compliance regulatório e gestão de riscos comerciais.

## Contexto da Análise
- Tipo de contrato: ${params.contractType}
- Lado do cliente: ${params.side}
- Jurisdição: ${params.jurisdiction}

## Regras do Playbook
${playbook}

## Documento do Contrato (DocAST)
${docAstJson}

## Instruções
Analise TODAS as cláusulas do contrato de forma completa e crítica, cobrindo TODOS os aspectos abaixo:

1. **Riscos comerciais**: exposição financeira, limites de responsabilidade, indenização, condições de pagamento, viabilidade comercial
2. **Qualidade da redação jurídica**: precisão do texto, aplicabilidade, termos ambíguos, definições ausentes, riscos de interpretação
3. **Compliance e regulatório**: conformidade com LGPD/GDPR, requisitos jurisdicionais, cláusulas obrigatórias, obrigações legais
4. **Equilíbrio contratual**: cláusulas abusivas, obrigações desproporcionais, direitos unilaterais, condições de rescisão injustas
5. **Ambiguidades e lacunas**: termos indefinidos, lacunas lógicas, cláusulas ausentes, contradições entre seções

Para cada cláusula problemática, forneça um finding com:
- blockId: o UUID exato do DocAST
- severity: critical, high, medium ou low
- original: o texto original exato do bloco
- suggested: sua versão melhorada do texto
- justification: explicação clara do motivo da alteração

Também forneça generalSuggestions para questões não vinculadas a cláusulas específicas.

IMPORTANTE: Todos os campos de texto (suggested, justification, generalSuggestions) DEVEM ser escritos em português brasileiro (pt-BR).

Retorne APENAS JSON válido nesta estrutura exata:

{
  "provider": "${provider}",
  "findings": [
    {
      "blockId": "uuid-do-docAst",
      "severity": "critical|high|medium|low",
      "original": "texto original",
      "suggested": "texto melhorado",
      "justification": "razão da alteração"
    }
  ],
  "generalSuggestions": ["sugestão 1", "sugestão 2"],
  "analyzedAt": "${new Date().toISOString()}"
}

Retorne APENAS o objeto JSON. Sem markdown, sem explicações, sem blocos de código.`;
}
