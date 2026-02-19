# Workflow Spec — contract-analysis-mvp

## Goal
Sair de "zero" até "MVP rodando" em stories pequenas.

## Steps
1) Confirmar escopo do MVP (sem track changes real)
2) Gerar/atualizar schemas (DocAST, Finding, PatchPlan)
3) Implementar ingestDocx (mammoth)
4) Implementar provider genérico + json resilience
5) Implementar runPersonas (Promise.all) com 5 personas
6) Implementar consolidate + patchPlan
7) Implementar renderSuggestedDocx
8) Implementar APIs /jobs, /run, /status
9) UI mínima: upload + status
10) Gates: rodar em 2 contratos reais e ajustar heurísticas

## Definition of Done
- output_suggested.docx e final_report.json gerados
- validação Zod passa sempre
