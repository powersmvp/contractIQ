# Architecture — Contract Agent

## Components
- Next.js UI + API Routes
- Storage local por job (data/jobs/<jobId>)
- Pipeline: ingestDocx → runPersonas → consolidate → renderDocx
- LLM Provider Adapter (HTTP genérico)

## Data Contracts
- DocAST
- PersonaOutput
- FinalReport
- PatchPlan

## Security/Privacy
- Sem logar conteúdo do contrato por padrão
- Redaction opcional

## Future (Phase 2)
- Track Changes/Comments em Word (XML)
- Retrieval por seção e chunking
- Queue (BullMQ/Redis)
