# Contract Agent — BMAD Workflow

## Objetivo
Construir um app agentico (Next.js) que:
1) ingere DOCX → DocAST
2) roda 5 personas (1 provedor) em paralelo e valida JSON
3) consolida achados e gera PatchPlan
4) gera minuta sugerida em DOCX e relatório JSON

## Comandos BMAD (usar no Cursor)
- Planejamento completo: /product-brief → /create-prd → /create-architecture → /create-epics-and-stories → /sprint-planning
- Execução por story: /create-story → /dev-story → /code-review

## Regras do produto
- Saída dos LLMs: SEMPRE JSON no schema (Zod).
- Cada finding deve referenciar blockId existente no DocAST.
- MVP: docx "minuta sugerida" (inserções + seção de sugestões).
- Fase 2: comentários/track changes reais via WordprocessingML.

## Definition of Done (MVP)
- Upload de .docx
- Pipeline completo rodando via /api/jobs/:id/run
- final_report.json e output_suggested.docx gerados
- 5 personas rodando em paralelo e consolidação deduplicando
