# BMAD Runbook — Contract Agent

## 1) Planejamento (uma vez)
1. /product-brief
2. /create-prd  (use templates/prd.template.md)
3. /create-architecture (use templates/architecture.template.md)
4. /create-epics-and-stories
5. /sprint-planning

## 2) Execução (todo dia)
Para cada story:
- /create-story (cole a story do backlog)
- /dev-story
- /code-review

## 3) Quando travar
- /bmad-help (o BMAD tem help adaptativo)

## 4) Épicas do Backlog

### Epic A: Ingestão DOCX e DocAST
- Upload de .docx via API
- Parsing com mammoth → DocAST (blocos com IDs)

### Epic B: LLM provider genérico + JSON hardening
- Adapter HTTP genérico para qualquer LLM
- Validação Zod de todas as respostas
- Retry com re-prompt em caso de JSON inválido

### Epic C: Personas (5) + prompts + schema
- 5 personas rodando em paralelo (Promise.all)
- Schemas Zod para PersonaOutput
- Prompts especializados por persona

### Epic D: Consolidação + PatchPlan
- Deduplicação de findings entre personas
- Geração de PatchPlan com ações ordenadas
- Severidade consolidada

### Epic E: Renderização docx (minuta sugerida)
- Geração de output_suggested.docx
- Inserções e seção de sugestões
- Fase 2: track changes reais

### Epic F: UI + APIs + storage
- API Routes: /api/jobs, /api/jobs/:id/run, /api/jobs/:id/status
- Storage local por job (data/jobs/<jobId>)
- UI mínima: upload + status + download

### Epic G: Quality gates (contratos reais + testes)
- Rodar em 2+ contratos reais
- Ajustar heurísticas e prompts
- Validação end-to-end
