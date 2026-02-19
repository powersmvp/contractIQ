# PRD — Contract Agent

## Problem
Revisar contratos manualmente é lento e inconsistente.

## Users
- Legal Ops / Comercial / Founder

## Goals
- Identificar riscos por severidade
- Sugerir redações alternativas (fallback)
- Gerar minuta sugerida DOCX + relatório

## Non-Goals (MVP)
- Track Changes real
- OCR/PDF robusto

## Functional Requirements
- Upload DOCX
- Params: tipo contrato, lado (buyer/seller), jurisdição
- Playbook YAML
- Pipeline: ingest → 5 personas → consolidate → render docx

## Success Metrics
- Tempo total < 5 min contrato médio
- Achados críticos corretos e acionáveis
- Saídas consistentes (schema validation)

## Risks
- JSON inválido do LLM
- Mapeamento bloco/trecho
- Qualidade do parsing de DOCX
