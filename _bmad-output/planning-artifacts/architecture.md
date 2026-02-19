---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
lastStep: 8
status: 'complete'
completedAt: '2026-02-13'
inputDocuments:
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/planning-artifacts/product-brief-contract-agent-2026-02-13.md
  - docs/WORKFLOW.md
  - docs/BMAD-RUNBOOK.md
workflowType: 'architecture'
project_name: 'contract-agent'
user_name: 'rdeli'
date: '2026-02-13'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**
36 FRs em 8 capability areas. O core do sistema é um pipeline de 4 estágios (ingest → analyze → consolidate → render) que processa contratos .docx via comitê de 5 LLMs paralelas. Requisitos secundários cobrem job management, feedback, configuração de providers e compliance legaltech. Todas as entidades incluem tenantId desde o MVP.

**Non-Functional Requirements:**
21 NFRs que direcionam as decisões arquiteturais principais:
- **Performance**: < 2 min pipeline completo, 90s timeout/LLM, < 5s upload, < 3s parsing, status a cada 5s
- **Security**: HTTPS/TLS em tudo, API keys encriptadas, zero conteúdo de contrato em logs, dados deletados em 24h/download
- **Scalability**: 10 análises simultâneas no MVP, stateless por design, preparado para queue system (Fase 2+)
- **Reliability**: pipeline funciona com 3/5 LLMs, falha isolada por provider, erro claro com < 3 respostas
- **Integration**: adapter HTTP genérico, trocar/adicionar LLM = só config, API REST para integrações futuras

**Scale & Complexity:**

- Primary domain: Full-Stack (Next.js — UI + API Routes no mesmo projeto)
- Complexity level: Alta — orquestração de 5 APIs externas, pipeline multi-estágio, confidencialidade legaltech
- Estimated architectural components: ~12 (UI components, API routes, pipeline stages, adapters, schemas, job manager, storage layer)

### Technical Constraints & Dependencies

- **Next.js 16 + TypeScript**: stack definido, API Routes como backend
- **mammoth**: parsing .docx → HTML/blocos (DocAST)
- **docx**: geração do output_suggested.docx
- **5 APIs externas de LLM**: OpenAI, Anthropic, Google AI, Mistral, Meta (Llama) — cada uma com auth, formatos e rate limits próprios
- **Zod**: validação de todas as respostas de LLM — schema-first
- **Storage local por job**: `data/jobs/<jobId>/` — sem banco de dados no MVP
- **Single-user no MVP**: sem auth, sem sessions — mas tenantId em todas as entidades

### Cross-Cutting Concerns Identified

1. **Confidencialidade & Compliance**: permeia todo o sistema — upload, processamento, storage, logging, expiração
2. **Validação Zod**: toda resposta de LLM e todo output final passa por schema validation
3. **Resiliência multi-provider**: cada estágio do pipeline precisa lidar com falhas parciais (3/5 mínimo)
4. **Lifecycle de dados temporários**: jobs expiram em 24h, dados deletados após download, zero persistência de conteúdo
5. **Preparação multi-tenant**: tenantId em todas as entidades, isolamento de dados por tenant
6. **Adapter pattern**: interface unificada para 5 providers com formatos de API diferentes
7. **Observabilidade sem conteúdo**: logs e métricas devem funcionar sem expor dados do contrato

## Starter Template Evaluation

### Primary Technology Domain

Full-Stack Web Application — Next.js como framework unificado para UI (React) e API Routes (backend), conforme definido nos requisitos.

### Starter Options Considered

O projeto já foi inicializado com `create-next-app` (Next.js 16). Não há necessidade de avaliar starters alternativos — o scaffolding já existe com todas as dependências core instaladas.

**Alternativas descartadas:**
- **T3 Stack** (create-t3-app): inclui tRPC + Prisma + NextAuth — overhead desnecessário para MVP sem banco de dados e sem auth
- **RedwoodJS**: framework full-stack opinionated — complexidade desnecessária, projeto já usa Next.js
- **Vite + Express**: separaria frontend/backend — contra o requisito de simplicidade (1 dev, 1 projeto)

### Selected Starter: create-next-app (Next.js 16)

**Rationale:**
Já aplicado ao projeto. Next.js 16 com App Router é a escolha ideal: unifica UI e API Routes no mesmo projeto, suporta Server Components (React 19), e é o framework mais maduro para full-stack TypeScript. A stack já inclui todas as libs específicas do domínio (mammoth, docx, zod, axios).

**Initialization Command (já executado):**

```bash
npx create-next-app@latest contract-agent --typescript --tailwind --eslint --app --src-dir
```

### Architectural Decisions Provided by Starter

**Language & Runtime:**
- TypeScript 5 com strict mode habilitado
- Target ES2017, module resolution bundler
- Path alias `@/*` → `./src/*`

**Styling Solution:**
- Tailwind CSS 4 via PostCSS plugin
- CSS global em `src/app/globals.css`

**Build Tooling:**
- Next.js built-in (Turbopack em dev, Webpack em build)
- ESLint 9 com configs core-web-vitals + TypeScript

**Testing Framework:**
- Não incluído pelo starter — decisão pendente

**Code Organization:**
- App Router: `src/app/` para pages e API routes
- `src/` directory habilitado (separação de código do projeto vs config)

**Development Experience:**
- Hot reloading via `next dev`
- TypeScript incremental compilation
- ESLint integrado

**Dependências Domain-Specific (adicionadas manualmente):**
- mammoth ^1.11.0, docx ^9.5.2, axios ^1.13.5, zod ^4.3.6, yaml ^2.8.2, uuid ^13.0.0

**Note:** O projeto já está inicializado. A primeira story de implementação deve focar na estrutura de pastas do pipeline, não no scaffolding.

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**
- Job filesystem structure (arquivos separados por estágio)
- LLM Adapter interface (interface unificada para 5 providers)
- Pipeline execution model (fire-and-forget, async)
- Schema strategy (Zod como single source of truth)

**Important Decisions (Shape Architecture):**
- API Routes structure (REST com resources aninhados)
- Error handling pattern (padronizado com codes)
- Logger com redaction automática
- Config centralizado com validação Zod
- Testing framework (Vitest)

**Deferred Decisions (Post-MVP):**
- Encriptação de API keys no filesystem (Fase 2+ com multi-tenant)
- Queue system BullMQ/Redis (Fase 2+ para escalar)
- SSE/WebSocket para real-time updates (Fase 2+)
- Monitoring externo Sentry (Fase 2+)
- State management externo Zustand (Fase 2+ se necessário)

### Data Architecture

| Decisão | Escolha | Rationale |
|---|---|---|
| Storage | Filesystem `data/jobs/<jobId>/` | Sem banco de dados no MVP, simples e inspecionável |
| Estrutura do job | Arquivos separados por estágio | Debug facilitado, re-run parcial, arquivos pequenos |
| Expiração | Lazy cleanup + scheduled cleanup | Lazy no acesso (410 Gone se > 24h) + varredura periódica para órfãos |
| Schema strategy | Zod como single source of truth | `z.infer<typeof schema>` gera tipos, zero duplicação, validação runtime |

**Job Directory Structure:**
```
data/jobs/<jobId>/
  ├── meta.json
  ├── input.docx
  ├── docast.json
  ├── personas/
  │   ├── gpt.json
  │   ├── claude.json
  │   ├── gemini.json
  │   ├── mistral.json
  │   └── llama.json
  ├── consolidated.json
  ├── output.docx
  └── report.json
```

### Authentication & Security

| Decisão | Escolha | Rationale |
|---|---|---|
| API keys dos providers | `.env.local` (variáveis de ambiente) | Padrão da indústria para server-side secrets, MVP single-user |
| Upload security | Validação MIME + limite 10MB + sanitização filename | Prevenção de upload malicioso (NFR11) |
| Logging | Logger wrapper com redaction automática | Campos de conteúdo substituídos por [REDACTED], só metadados em logs |

### API & Communication Patterns

| Decisão | Escolha | Rationale |
|---|---|---|
| API design | REST via Next.js App Router API Routes | Simples, convenção Next.js, preparado para integrações futuras |
| Pipeline execution | Fire-and-forget (202 Accepted) | Sem dependência externa (Redis), pipeline roda no background do Node |
| LLM Adapter | Interface unificada `LLMAdapter.call(prompt, schema)` | Adicionar/trocar provider = só implementar adapter, zero mudança no pipeline |
| Error handling | `{ error, code, jobId? }` + HTTP status codes padrão | Consistência, sem conteúdo de contrato em erros |

**API Routes:**
- `POST /api/jobs` — cria job (upload .docx + parâmetros) → 201/202
- `GET /api/jobs/[jobId]` — status do job (polling) → 200/404/410
- `GET /api/jobs/[jobId]/output` — download minuta .docx → 200/404/410
- `GET /api/jobs/[jobId]/report` — download relatório .json → 200/404/410
- `POST /api/jobs/[jobId]/feedback` — feedback bom/ruim → 200
- `GET /api/config/providers` — health check dos providers → 200
- `PUT /api/config/providers` — configurar API keys → 200

### Frontend Architecture

| Decisão | Escolha | Rationale |
|---|---|---|
| State management | React state local (useState/useReducer) | UI mínima, 2-3 telas, sem justificativa para lib externa |
| Polling de status | Recursive setTimeout + fetch | Mais limpo que setInterval, polling para em completed/failed |
| Progresso visual | meta.json salva currentStage, frontend renderiza | Sem WebSocket, polling simples a cada 5s |

**Páginas:**
- `src/app/page.tsx` — upload + lista de jobs recentes
- `src/app/jobs/[jobId]/page.tsx` — resultado (status, outputs, feedback)
- `src/app/config/page.tsx` — configuração de API keys

### Infrastructure & Deployment

| Decisão | Escolha | Rationale |
|---|---|---|
| Hosting | Railway ou Render (Node server persistente) | Sem timeout limit, suporta fire-and-forget e scheduled cleanup |
| Env config | `.env.local` + `src/lib/config.ts` com validação Zod | Fail-fast no boot se config incompleto |
| Logging | console.log estruturado (JSON) com redaction | MVP sem serviço externo, logs do hosting são suficientes |
| Testing | Vitest | Rápido, TypeScript nativo, config mínima |

### Decision Impact Analysis

**Implementation Sequence:**
1. Schemas Zod (DocAST, Finding, PatchPlan, FinalReport, JobMeta) — base de tudo
2. Config centralizado + logger com redaction
3. Job manager (criar, ler, expirar jobs no filesystem)
4. LLM Adapters (5 providers com interface unificada)
5. Pipeline stages (ingest → personas → consolidate → render)
6. API Routes
7. Frontend (upload, polling, resultado, feedback)

**Cross-Component Dependencies:**
- Schemas → usados por todos os estágios do pipeline, adapters, API routes
- Config → usado pelos adapters (API keys), job manager (paths), logger
- Job Manager → usado pelo pipeline e API routes
- LLM Adapters → usados pelo runPersonas
- Pipeline → orquestra todos os estágios, usa job manager para persistir

## Implementation Patterns & Consistency Rules

### Pattern Categories Defined

**Critical Conflict Points Identified:** 12 áreas onde AI agents poderiam tomar decisões diferentes

### Naming Patterns

**Arquivos e Diretórios:**
- Arquivos: `kebab-case.ts` — ex: `llm-adapter.ts`, `job-manager.ts`, `run-personas.ts`
- Componentes React: `PascalCase.tsx` — ex: `UploadForm.tsx`, `JobStatus.tsx`
- Schemas: `*.schema.ts` — ex: `finding.schema.ts`, `docast.schema.ts`
- Tests: `*.test.ts` co-locados — ex: `llm-adapter.test.ts`

**Variáveis e Funções:**
- Variáveis/funções: `camelCase` — ex: `jobId`, `blockId`, `runPersonas()`, `parseDocx()`
- Tipos/interfaces: `PascalCase` — ex: `Finding`, `DocAST`, `JobMeta`, `LLMAdapter`
- Constantes: `UPPER_SNAKE_CASE` — ex: `MAX_RETRIES`, `LLM_TIMEOUT_MS`
- Enums: `PascalCase` com valores `snake_case` — ex: `Severity.critical`, `JobStatus.processing`

**API Routes:**
- Endpoints: plural, `kebab-case` — ex: `/api/jobs`, `/api/jobs/[jobId]/feedback`
- Parâmetros de rota: `camelCase` — ex: `jobId`, `tenantId`
- Query params: `camelCase` — ex: `?contractType=nda&side=contractor`

**JSON Fields:**
- `camelCase` em todas as respostas — consistente com TypeScript, sem conversão snake/camel

### Structure Patterns

**Organização do Projeto (por domínio):**
```
src/
├── app/                    # Next.js App Router (pages + API routes)
│   ├── api/jobs/           # API routes para jobs
│   ├── api/config/         # API routes para config
│   ├── jobs/[jobId]/       # Job result page
│   └── config/             # Config page
├── components/             # React components reutilizáveis
├── lib/                    # Core business logic (server-side)
│   ├── schemas/            # Zod schemas (single source of truth)
│   ├── pipeline/           # Pipeline stages (ingest, personas, consolidate, render)
│   ├── adapters/           # LLM adapters (gpt, claude, gemini, mistral, llama)
│   ├── jobs/               # Job manager (filesystem CRUD)
│   ├── config/             # Config loader + validation
│   └── logger/             # Logger com redaction
└── types/                  # Types auxiliares (se necessário além do Zod)
```

**Tests Co-locados:**
- `src/lib/pipeline/ingest-docx.test.ts` ao lado de `ingest-docx.ts`
- Sem pasta `__tests__/` separada

### Format Patterns

**API Response Format:**
- Sucesso: `{ data: T }` — sempre wrappado em `data`
- Erro: `{ error: { code: string, message: string } }`
- Nunca retornar objeto direto sem wrapper
- Dates: ISO 8601 — `"2026-02-13T15:30:00.000Z"`

**Job Status Polling Response:**
```json
{
  "data": {
    "jobId": "abc-123",
    "status": "processing",
    "currentStage": "personas",
    "progress": { "completed": 3, "total": 5 },
    "createdAt": "2026-02-13T15:30:00.000Z"
  }
}
```

### Process Patterns

**Error Handling:**
- Pipeline errors: catch no estágio, salvar em `meta.json`, marcar job como `failed`
- API Route errors: try/catch, retornar `{ error: { code, message } }` com HTTP status correto
- LLM Adapter errors: catch, retry até 2x, se falhar retorna `null` (pipeline continua sem esse provider)
- **Nunca** incluir conteúdo do contrato em mensagens de erro

**Retry Pattern para LLMs:**
- Retry só em JSON inválido (Zod validation fail), não em timeout ou HTTP error
- Máximo 2 retries com re-prompt incluindo o erro de validação
- Se 3 tentativas falharem, retorna `null` para esse provider

**Import Pattern:**
- Path alias `@/` sempre entre módulos: `import { FindingSchema } from '@/lib/schemas/finding.schema'`
- Nunca imports relativos entre módulos (`../../lib/...`)
- Imports relativos ok dentro do mesmo módulo (`./utils`)

**Export Pattern:**
- Named exports sempre, nunca `export default` (exceto pages Next.js que exigem)
- Um schema + tipo por arquivo: `finding.schema.ts` exporta `FindingSchema` e `Finding`

### Enforcement Guidelines

**All AI Agents MUST:**
- Seguir naming conventions exatamente como especificado (kebab-case para arquivos, camelCase para variáveis)
- Usar `@/` para imports entre módulos, nunca caminhos relativos cross-module
- Wrapper todas as API responses em `{ data }` ou `{ error }` — nunca objeto direto
- Nunca incluir conteúdo de contrato em logs, erros ou mensagens
- Usar Zod schemas como single source of truth para tipos — nunca duplicar interfaces

**Anti-Patterns (PROIBIDO):**
- `export default function` em lib/ (usar named exports)
- `import { X } from '../../lib/schemas/...'` (usar `@/lib/schemas/...`)
- `return { jobId, status }` em API route (usar `return { data: { jobId, status } }`)
- `console.log(contract.content)` (usar logger com redaction)
- `interface Finding { ... }` separado do schema Zod (usar `z.infer`)

## Project Structure & Boundaries

### Complete Project Directory Structure

```
contract-agent/
├── .env.local                          # API keys dos 5 providers + configs
├── .env.example                        # Template sem valores sensíveis
├── .gitignore
├── README.md
├── package.json
├── tsconfig.json
├── next.config.ts
├── eslint.config.mjs
├── postcss.config.mjs
├── vitest.config.ts                    # Configuração do Vitest
├── data/                               # Storage de jobs (gitignored)
│   └── jobs/
│       └── <jobId>/                    # Um diretório por job
│           ├── meta.json
│           ├── input.docx
│           ├── docast.json
│           ├── personas/
│           │   ├── gpt.json
│           │   ├── claude.json
│           │   ├── gemini.json
│           │   ├── mistral.json
│           │   └── llama.json
│           ├── consolidated.json
│           ├── output.docx
│           └── report.json
├── public/
│   └── favicon.ico
└── src/
    ├── app/                            # Next.js App Router
    │   ├── globals.css
    │   ├── layout.tsx                  # Root layout (disclaimer global)
    │   ├── page.tsx                    # Home: upload + lista de jobs
    │   ├── jobs/
    │   │   └── [jobId]/
    │   │       └── page.tsx            # Resultado: status, outputs, feedback
    │   ├── config/
    │   │   └── page.tsx                # Config: API keys dos providers
    │   └── api/
    │       ├── jobs/
    │       │   ├── route.ts            # POST (criar job) + GET (listar jobs)
    │       │   └── [jobId]/
    │       │       ├── route.ts        # GET (status do job)
    │       │       ├── output/
    │       │       │   └── route.ts    # GET (download .docx)
    │       │       ├── report/
    │       │       │   └── route.ts    # GET (download .json)
    │       │       └── feedback/
    │       │           └── route.ts    # POST (feedback bom/ruim)
    │       └── config/
    │           └── providers/
    │               └── route.ts        # GET (health) + PUT (configurar keys)
    ├── components/                     # React components
    │   ├── UploadForm.tsx              # Form de upload + parâmetros
    │   ├── JobList.tsx                 # Lista de jobs recentes
    │   ├── JobStatus.tsx               # Status com progresso por estágio
    │   ├── FindingCard.tsx             # Card individual de achado
    │   ├── FindingsList.tsx            # Lista de achados por severidade
    │   ├── FeedbackButton.tsx          # Botão bom/ruim
    │   ├── Disclaimer.tsx              # Disclaimer legal
    │   ├── ProviderStatus.tsx          # Status de saúde dos providers
    │   └── ProviderKeyForm.tsx         # Form de API key por provider
    ├── lib/                            # Core business logic (server-side)
    │   ├── schemas/                    # Zod schemas (single source of truth)
    │   │   ├── docast.schema.ts        # DocAST: blocos do documento
    │   │   ├── finding.schema.ts       # Finding: achado individual
    │   │   ├── persona-output.schema.ts # PersonaOutput: resposta de 1 LLM
    │   │   ├── patch-plan.schema.ts    # PatchPlan: ações ordenadas
    │   │   ├── final-report.schema.ts  # FinalReport: relatório consolidado
    │   │   ├── job-meta.schema.ts      # JobMeta: metadados do job
    │   │   └── api-response.schema.ts  # Wrappers: { data } e { error }
    │   ├── pipeline/                   # Pipeline stages
    │   │   ├── ingest-docx.ts          # Estágio 1: mammoth → DocAST
    │   │   ├── run-personas.ts         # Estágio 2: Promise.all 5 LLMs
    │   │   ├── consolidate.ts          # Estágio 3: dedup + PatchPlan
    │   │   ├── render-docx.ts          # Estágio 4: gera output.docx
    │   │   └── run-pipeline.ts         # Orquestrador: executa 1→2→3→4
    │   ├── adapters/                   # LLM adapters (1 por provider)
    │   │   ├── adapter.interface.ts    # Interface LLMAdapter
    │   │   ├── gpt.adapter.ts          # OpenAI GPT
    │   │   ├── claude.adapter.ts       # Anthropic Claude
    │   │   ├── gemini.adapter.ts       # Google Gemini
    │   │   ├── mistral.adapter.ts      # Mistral
    │   │   ├── llama.adapter.ts        # Meta Llama
    │   │   └── index.ts                # Registry: retorna adapters ativos
    │   ├── jobs/                       # Job manager (filesystem CRUD)
    │   │   ├── job-manager.ts          # Criar, ler, atualizar, listar jobs
    │   │   └── job-cleanup.ts          # Lazy + scheduled cleanup (24h)
    │   ├── config/                     # Config centralizado
    │   │   └── env.config.ts           # Leitura + validação Zod de env vars
    │   └── logger/                     # Logger com redaction
    │       └── logger.ts               # Structured JSON + redaction automática
    └── types/                          # Types auxiliares (se necessário)
        └── index.ts
```

### Architectural Boundaries

**API Boundary (src/app/api/):**
- Ponto de entrada HTTP — recebe requests, valida input, delega para `lib/`
- Nunca contém lógica de negócio — só orquestra
- Retorna sempre `{ data }` ou `{ error }`

**Pipeline Boundary (src/lib/pipeline/):**
- Lógica core do produto — totalmente server-side
- Cada estágio lê do filesystem e escreve no filesystem
- `run-pipeline.ts` orquestra a sequência, atualiza `meta.json` a cada estágio
- Não conhece HTTP — não importa nada de `app/api/`

**Adapter Boundary (src/lib/adapters/):**
- Isola a comunicação com APIs externas
- Cada adapter implementa `LLMAdapter` interface
- Pipeline chama adapters via interface, nunca diretamente
- Retry de JSON inválido acontece aqui dentro

**Storage Boundary (src/lib/jobs/ + data/):**
- Única camada que toca o filesystem de jobs
- API routes e pipeline usam `job-manager.ts` — nunca `fs` direto
- Cleanup (expiração) é responsabilidade exclusiva desta camada

**UI Boundary (src/app/ pages + src/components/):**
- Consome API Routes via fetch — nunca importa de `lib/` diretamente
- State local (useState), polling via recursive setTimeout
- Componentes são presentational — lógica fica nas pages

### Requirements to Structure Mapping

| FR Category | Diretório Principal | Arquivos-Chave |
|---|---|---|
| 1. Document Ingestion (FR1-FR5) | `lib/pipeline/` | `ingest-docx.ts`, `docast.schema.ts` |
| 2. Multi-LLM Analysis (FR6-FR11) | `lib/pipeline/` + `lib/adapters/` | `run-personas.ts`, `*.adapter.ts` |
| 3. Consolidation (FR12-FR17) | `lib/pipeline/` | `consolidate.ts`, `finding.schema.ts`, `patch-plan.schema.ts` |
| 4. Output Generation (FR18-FR22) | `lib/pipeline/` | `render-docx.ts`, `final-report.schema.ts` |
| 5. Job Management (FR23-FR27) | `lib/jobs/` + `app/api/jobs/` | `job-manager.ts`, `job-cleanup.ts` |
| 6. User Feedback (FR28-FR29) | `app/api/jobs/[jobId]/feedback/` | `route.ts` |
| 7. Configuration (FR30-FR32) | `lib/config/` + `app/api/config/` | `env.config.ts`, `route.ts` |
| 8. Compliance (FR33-FR36) | Cross-cutting | `Disclaimer.tsx`, `logger.ts`, `job-meta.schema.ts` |

### Data Flow

```
Upload .docx → API Route (POST /api/jobs)
  → job-manager.createJob() → salva meta.json + input.docx
  → run-pipeline(jobId)  [fire-and-forget]
    → ingest-docx.ts → salva docast.json
    → run-personas.ts → Promise.all(5 adapters) → salva personas/*.json
    → consolidate.ts → salva consolidated.json
    → render-docx.ts → salva output.docx + report.json
    → atualiza meta.json (status: completed)

Frontend polling (GET /api/jobs/[jobId])
  → job-manager.getJob() → lê meta.json → retorna status + stage

Download (GET /api/jobs/[jobId]/output)
  → job-manager.getOutput() → lê output.docx → stream response
```

## Architecture Validation Results

### Coherence Validation ✅

**Decision Compatibility:**
Todas as tecnologias e versões são compatíveis entre si. Next.js 16 + TypeScript 5 + React 19 + Tailwind 4 + Zod 4 formam uma stack coesa. Fire-and-forget pipeline é compatível com Node server persistente (Railway/Render). mammoth (parse) e docx (gera) são libs complementares sem conflito.

**Pattern Consistency:**
Naming conventions (kebab-case arquivos, camelCase variáveis/JSON, PascalCase tipos/componentes) são consistentes em todas as camadas. API response wrapper `{ data }` / `{ error }` é uniforme. Import pattern com `@/` é universal entre módulos.

**Structure Alignment:**
Boundaries respeitam separação clara: API Routes → Pipeline → Adapters → Storage. Pipeline não conhece HTTP. UI não importa de `lib/`. Cada camada tem responsabilidade única.

### Requirements Coverage Validation ✅

**Functional Requirements (36/36 cobertas):**

| FR Category | FRs | Cobertura |
|---|---|---|
| Document Ingestion | FR1-FR5 | `ingest-docx.ts`, `UploadForm.tsx`, `POST /api/jobs` |
| Multi-LLM Analysis | FR6-FR11 | `run-personas.ts`, `adapters/*.adapter.ts`, `prompts/*.prompt.ts` |
| Consolidation | FR12-FR17 | `consolidate.ts`, `finding.schema.ts`, `patch-plan.schema.ts` |
| Output Generation | FR18-FR22 | `render-docx.ts`, `final-report.schema.ts` |
| Job Management | FR23-FR27 | `job-manager.ts`, `job-cleanup.ts`, API routes |
| User Feedback | FR28-FR29 | `POST /api/jobs/[jobId]/feedback`, `FeedbackButton.tsx` |
| Configuration | FR30-FR32 | `env.config.ts`, `GET/PUT /api/config/providers` |
| Compliance | FR33-FR36 | `Disclaimer.tsx`, `logger.ts`, `tenantId` em schemas |

**Non-Functional Requirements (21/21 cobertas):**

| NFR Category | NFRs | Cobertura |
|---|---|---|
| Performance | NFR1-5 | Promise.all paralelo, 90s timeout, 10MB upload, mammoth < 3s, polling 5s |
| Security | NFR6-11 | HTTPS (hosting), `.env.local`, logger redaction, cleanup 24h, input validation |
| Scalability | NFR12-14 | Stateless jobs, 10 simultâneos, preparado para queue |
| Reliability | NFR15-18 | Min 3/5 LLMs, falha isolada, erro claro, 99% uptime |
| Integration | NFR19-21 | Adapter interface, config-only, REST API |

### Implementation Readiness Validation ✅

**Decision Completeness:** Todas as decisões críticas documentadas com rationale. Stack completa com versões. Adapter interface definida.

**Structure Completeness:** Diretório completo com todos os arquivos mapeados. Boundaries definidas. Data flow documentado.

**Pattern Completeness:** 12 padrões de consistência com exemplos e anti-patterns. Naming, structure, format e process patterns cobertos.

### Gap Analysis Results

**Gaps críticos:** Nenhum

**Gaps resolvidos durante validação:**
- Adicionado `src/lib/prompts/` para prompts diferenciados das 5 personas (FR11) + playbook base YAML

### Architecture Completeness Checklist

**✅ Requirements Analysis**
- [x] Project context thoroughly analyzed
- [x] Scale and complexity assessed (alta)
- [x] Technical constraints identified (5 APIs externas, confidencialidade, non-persistence)
- [x] Cross-cutting concerns mapped (7 concerns)

**✅ Architectural Decisions**
- [x] Critical decisions documented (4 critical, 5 important, 5 deferred)
- [x] Technology stack fully specified with versions
- [x] Integration patterns defined (adapter interface, REST API)
- [x] Performance considerations addressed (Promise.all, timeouts, polling)

**✅ Implementation Patterns**
- [x] Naming conventions established (12 patterns)
- [x] Structure patterns defined (by domain)
- [x] Communication patterns specified (API response format, polling)
- [x] Process patterns documented (error handling, retry, imports)

**✅ Project Structure**
- [x] Complete directory structure defined (~40 files/dirs)
- [x] Component boundaries established (5 boundaries)
- [x] Integration points mapped (API → Pipeline → Adapters → Storage)
- [x] Requirements to structure mapping complete (8 FR categories → dirs)

### Architecture Readiness Assessment

**Overall Status:** READY FOR IMPLEMENTATION

**Confidence Level:** Alta — todas as decisões são coerentes, todos os requisitos cobertos, padrões claros

**Key Strengths:**
- Pipeline stateless com boundaries bem definidas — fácil de testar e debugar
- Adapter pattern permite trocar/adicionar LLMs sem mudar pipeline
- Schema-first (Zod) garante consistência de dados em todas as camadas
- File-based storage no MVP elimina dependência externa — simplifica deploy

**Areas for Future Enhancement (Fase 2+):**
- Queue system (BullMQ/Redis) para escalar além de 10 jobs simultâneos
- SSE/WebSocket para real-time updates em vez de polling
- Monitoring externo (Sentry) para observabilidade em produção
- RBAC e multi-tenant completo
- Encriptação de API keys no filesystem

### Implementation Handoff

**AI Agent Guidelines:**
- Seguir todas as decisões arquiteturais exatamente como documentado
- Usar padrões de implementação consistentemente em todos os componentes
- Respeitar boundaries: API → Pipeline → Adapters → Storage
- Consultar este documento para todas as questões arquiteturais

**Implementation Sequence Recomendada:**
1. Schemas Zod + tipos (base de tudo)
2. Config centralizado + logger com redaction
3. Job manager (filesystem CRUD + cleanup)
4. LLM Adapters (5 providers + interface)
5. Pipeline stages (ingest → personas → consolidate → render)
6. API Routes (REST endpoints)
7. Frontend (upload, polling, resultado, feedback)

**Updated Project Structure (com prompts):**
```
src/lib/prompts/
├── base-playbook.yaml      # Regras gerais de análise contratual
├── gpt.prompt.ts            # Perspectiva/persona GPT
├── claude.prompt.ts         # Perspectiva/persona Claude
├── gemini.prompt.ts         # Perspectiva/persona Gemini
├── mistral.prompt.ts        # Perspectiva/persona Mistral
└── llama.prompt.ts          # Perspectiva/persona Llama
```
