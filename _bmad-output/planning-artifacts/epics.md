---
stepsCompleted: [1, 2, 3, 4]
status: 'complete'
completedAt: '2026-02-13'
inputDocuments:
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/planning-artifacts/architecture.md
  - https://m3.material.io/ (Material Design 3 - UX reference)
---

# contract-agent - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for contract-agent, decomposing the requirements from the PRD, Architecture, and Material Design 3 UX reference into implementable stories.

## Requirements Inventory

### Functional Requirements

- FR1: Usuário pode fazer upload de arquivo .docx para análise
- FR2: Usuário pode selecionar tipo de contrato (NDA, SaaS, Parceria)
- FR3: Usuário pode selecionar lado (contratante ou contratado)
- FR4: Usuário pode selecionar jurisdição (Brasil como default)
- FR5: Sistema pode parsear o .docx em blocos estruturados (DocAST) com IDs únicos por bloco
- FR6: Sistema pode enviar o DocAST para 5 LLMs distintas em paralelo
- FR7: Sistema pode validar a resposta JSON de cada LLM contra schema Zod
- FR8: Sistema pode re-enviar prompt para a LLM quando a resposta for JSON inválido (até 2 retries)
- FR9: Sistema pode completar análise com mínimo de 3 respostas válidas (se 1-2 LLMs falharem)
- FR10: Sistema pode aplicar timeout individual de 90 segundos por LLM
- FR11: Cada LLM pode analisar o contrato sob uma perspectiva/persona diferenciada via prompt específico
- FR12: Sistema pode consolidar achados das 5 LLMs em um resultado unificado
- FR13: Sistema pode deduplicar achados similares entre diferentes LLMs
- FR14: Sistema pode classificar cada achado por severidade (crítico, alto, médio, baixo)
- FR15: Sistema pode calcular nível de consenso por achado (quantas LLMs concordam)
- FR16: Sistema pode gerar um PatchPlan com ações ordenadas por severidade
- FR17: Cada achado pode referenciar o blockId correspondente no DocAST
- FR18: Sistema pode gerar minuta comentada em formato .docx com trecho original e redação proposta (antes/depois) por cláusula
- FR19: Sistema pode gerar relatório de riscos em formato .json com achados consolidados
- FR20: Cada achado no output pode incluir justificativa explicando por que foi flagado
- FR21: Cada achado no output pode incluir nível de consenso entre as LLMs
- FR22: Output pode incluir seção de sugestões gerais (não vinculadas a cláusula específica)
- FR23: Cada análise pode ser rastreada como um job independente com status (created, processing, completed, failed, expired)
- FR24: Usuário pode ver o status de processamento do job em tempo real
- FR25: Usuário pode baixar a minuta comentada (.docx) quando o job completar
- FR26: Usuário pode baixar o relatório de riscos (.json) quando o job completar
- FR27: Sistema pode expirar jobs e deletar dados do contrato após 24h ou download
- FR28: Usuário pode avaliar cada análise como "bom" ou "ruim"
- FR29: Sistema pode armazenar feedback vinculado ao jobId para análise posterior
- FR30: Admin pode configurar API keys para cada um dos 5 providers de LLM
- FR31: Sistema pode validar cada API key fazendo chamada de teste ao provider
- FR32: Admin pode ver status de saúde de cada provider (ativo/inativo)
- FR33: Sistema pode exibir disclaimer legal em toda análise gerada
- FR34: Sistema pode informar ao usuário que o contrato será enviado para APIs externas antes do upload
- FR35: Sistema pode não persistir conteúdo do contrato em logs (apenas metadados)
- FR36: Todas as entidades do sistema podem incluir tenantId para preparação multi-tenant

### NonFunctional Requirements

- NFR1: Pipeline completo (upload → resultado) deve completar em < 2 minutos para contratos de até 20 páginas
- NFR2: Cada chamada individual de LLM deve ter timeout de 90 segundos
- NFR3: Upload de arquivo .docx de até 10MB deve completar em < 5 segundos
- NFR4: Parsing DocAST (mammoth) deve completar em < 3 segundos para contrato de 20 páginas
- NFR5: UI deve exibir atualização de status do job a cada 5 segundos durante processamento
- NFR6: Toda comunicação entre cliente e servidor deve usar HTTPS/TLS
- NFR7: Toda comunicação com APIs de LLM deve usar HTTPS/TLS
- NFR8: API keys dos providers devem ser armazenadas encriptadas (nunca em plaintext)
- NFR9: Conteúdo do contrato não deve aparecer em logs do sistema — apenas metadados (jobId, timestamp, status)
- NFR10: Dados do contrato e respostas das LLMs devem ser deletados em 24h ou após download (o que vier primeiro)
- NFR11: API Routes devem validar input para prevenir injection e upload malicioso
- NFR12: MVP deve suportar até 10 análises simultâneas sem degradação de performance
- NFR13: Arquitetura deve permitir escalar horizontalmente para Fase 2+ (queue system)
- NFR14: Cada job deve ser stateless e independente — sem dependência de estado compartilhado
- NFR15: Se 1-2 das 5 LLMs falharem, pipeline deve completar com as respostas disponíveis (mínimo 3)
- NFR16: Falha em um provider não deve impactar jobs que não usam aquele provider
- NFR17: Sistema deve retornar erro claro ao usuário se menos de 3 LLMs responderem
- NFR18: Disponibilidade target de 99% durante horário comercial
- NFR19: Adapter HTTP genérico deve suportar qualquer LLM que exponha API REST com JSON
- NFR20: Adicionar ou trocar um provider de LLM deve requerer apenas configuração (API key + endpoint), sem mudança de código no pipeline
- NFR21: API Routes do sistema devem seguir padrão REST para facilitar integrações futuras (Slack, Drive, ERP)

### Additional Requirements

**Da Architecture:**
- Starter template já aplicado (Next.js 16 + create-next-app) — Story 1 foca em estrutura de pastas, não scaffolding
- File-based storage em `data/jobs/<jobId>/` com arquivos separados por estágio
- Adapter pattern com interface `LLMAdapter`
- Fire-and-forget pipeline (202 Accepted)
- Logger com redaction automática
- Config centralizado com validação Zod (env vars)
- Vitest como testing framework
- Deploy em Railway/Render (Node server persistente)
- Prompts diferenciados por persona em `src/lib/prompts/`
- Schemas Zod como single source of truth para tipos TypeScript
- API response wrapper: `{ data }` sucesso, `{ error: { code, message } }` erro

**Do Material Design 3 (UX):**
- Color system: Dynamic Color com primary, secondary, tertiary, error, surface variants
- Typography: Type scale M3 (Display, Headline, Title, Body, Label)
- Shape: Rounded corners com tokens (small, medium, large, extra-large)
- Elevation: 3 níveis de sombra para hierarquia visual
- Componentes M3: Buttons (filled, outlined, text), Cards (elevated, filled), Progress indicators (linear, circular), Navigation (top app bar), Dialogs, Chips (filtros severidade), Snackbar/Toast, Text fields, Lists, Badges
- Interaction states: hover, focus, pressed, disabled com state layers
- Accessibility: contraste mínimo, focus indicators, screen reader support

### FR Coverage Map

| FR | Epic | Descrição |
|---|---|---|
| FR1 | Epic 2 | Upload .docx |
| FR2 | Epic 2 | Seleção tipo de contrato |
| FR3 | Epic 2 | Seleção lado |
| FR4 | Epic 2 | Seleção jurisdição |
| FR5 | Epic 2 | Parsing DocAST |
| FR6 | Epic 3 | Envio para 5 LLMs em paralelo |
| FR7 | Epic 3 | Validação Zod |
| FR8 | Epic 3 | Retry em JSON inválido |
| FR9 | Epic 3 | Mínimo 3/5 respostas |
| FR10 | Epic 3 | Timeout 90s |
| FR11 | Epic 3 | Perspectivas diferenciadas |
| FR12 | Epic 3 | Consolidação |
| FR13 | Epic 3 | Deduplicação |
| FR14 | Epic 3 | Classificação severidade |
| FR15 | Epic 3 | Nível de consenso |
| FR16 | Epic 3 | PatchPlan |
| FR17 | Epic 3 | Referência blockId |
| FR18 | Epic 4 | Minuta comentada .docx |
| FR19 | Epic 4 | Relatório .json |
| FR20 | Epic 4 | Justificativa por achado |
| FR21 | Epic 4 | Consenso no output |
| FR22 | Epic 4 | Sugestões gerais |
| FR23 | Epic 2 | Job lifecycle |
| FR24 | Epic 2 | Status em tempo real |
| FR25 | Epic 4 | Download .docx |
| FR26 | Epic 4 | Download .json |
| FR27 | Epic 2 | Expiração/deleção |
| FR28 | Epic 5 | Feedback bom/ruim |
| FR29 | Epic 5 | Storage de feedback |
| FR30 | Epic 1 | Config API keys |
| FR31 | Epic 1 | Validação de keys |
| FR32 | Epic 1 | Health check providers |
| FR33 | Epic 4 | Disclaimer legal |
| FR34 | Epic 4 | Aviso envio APIs externas |
| FR35 | Epic 1 | Não persistir conteúdo em logs |
| FR36 | Epic 1 | tenantId em todas entidades |

## Epic List

### Epic 1: Fundação do Sistema & Configuração de Providers
Admin configura o sistema, insere API keys dos 5 LLM providers, valida cada um com chamada de teste, e confirma que o comitê está operacional.
**FRs cobertos:** FR30, FR31, FR32, FR35, FR36

### Epic 2: Upload de Contrato & Gestão de Jobs
Usuário faz upload de um .docx, seleciona parâmetros (tipo, lado, jurisdição), acompanha o status do job em tempo real, e o sistema gerencia o lifecycle completo dos jobs.
**FRs cobertos:** FR1, FR2, FR3, FR4, FR5, FR23, FR24, FR27

### Epic 3: Análise Multi-LLM & Consolidação
O comitê de 5 LLMs analisa o contrato em paralelo, cada uma sob perspectiva diferente. Sistema consolida achados, deduplica, classifica por severidade e calcula consenso.
**FRs cobertos:** FR6, FR7, FR8, FR9, FR10, FR11, FR12, FR13, FR14, FR15, FR16, FR17

### Epic 4: Geração de Outputs & Entrega de Resultados
Usuário recebe a minuta comentada (.docx) com antes/depois por cláusula + relatório de riscos (.json) com justificativas. Pode baixar ambos. Disclaimer legal presente em toda análise.
**FRs cobertos:** FR18, FR19, FR20, FR21, FR22, FR25, FR26, FR33, FR34

### Epic 5: Feedback do Usuário & Quality Loop
Usuário avalia cada análise como "bom" ou "ruim", feedback é armazenado vinculado ao job para alimentar melhoria contínua futura.
**FRs cobertos:** FR28, FR29

## Epic 1: Fundação do Sistema & Configuração de Providers

Admin configura o sistema, insere API keys dos 5 LLM providers, valida cada um com chamada de teste, e confirma que o comitê está operacional.

### Story 1.1: Criar schemas Zod e estrutura de pastas do projeto

As a desenvolvedor,
I want todos os schemas Zod definidos e a estrutura de pastas do projeto criada,
So that todas as camadas do sistema compartilhem os mesmos tipos e a organização do código esteja padronizada desde o início.

**Acceptance Criteria:**

**Given** o projeto Next.js já scaffolded
**When** a story for concluída
**Then** a estrutura de pastas `src/lib/{schemas,pipeline,adapters,jobs,config,logger,prompts}`, `src/components/`, `src/types/` existe
**And** os schemas Zod estão implementados: DocAST, Finding, PersonaOutput, PatchPlan, FinalReport, JobMeta, ApiResponse
**And** cada schema exporta o schema Zod + tipo via `z.infer`
**And** todos os schemas incluem campo `tenantId` onde aplicável (FR36)
**And** `data/jobs/` está no `.gitignore`
**And** `.env.example` existe com todas as variáveis necessárias (sem valores)
**And** `vitest.config.ts` está configurado
**And** testes unitários passam para validação de cada schema

### Story 1.2: Implementar config centralizado e logger com redaction

As a desenvolvedor,
I want um módulo de configuração que valide env vars no boot e um logger que nunca exponha conteúdo de contratos,
So that o sistema falhe rápido se mal configurado e a confidencialidade dos dados esteja garantida em toda a stack.

**Acceptance Criteria:**

**Given** os schemas Zod da Story 1.1
**When** o servidor iniciar
**Then** `env.config.ts` lê e valida todas as env vars via Zod (API keys, paths, configs)
**And** se uma env var obrigatória estiver faltando, o processo falha com mensagem clara
**And** `logger.ts` exporta funções de log (info, warn, error) em formato JSON estruturado
**And** o logger substitui automaticamente campos `content`, `text`, `original`, `suggested` por `[REDACTED]` (FR35)
**And** logs incluem apenas: jobId, timestamp, status, duration, errorCode (NFR9)
**And** testes unitários cobrem: config válido, config inválido (fail-fast), redaction de campos sensíveis

### Story 1.3: Implementar interface LLM Adapter e 5 adapters

As a desenvolvedor,
I want uma interface unificada para LLM adapters e implementações para os 5 providers,
So that o pipeline possa chamar qualquer LLM sem conhecer os detalhes de cada API, e novos providers possam ser adicionados sem mudar código.

**Acceptance Criteria:**

**Given** config e schemas das stories anteriores
**When** um adapter for instanciado com API key válida
**Then** `adapter.interface.ts` define a interface `LLMAdapter` com método `call(prompt, schema): Promise<LLMResponse | null>`
**And** existem 5 adapters implementando a interface: `gpt.adapter.ts`, `claude.adapter.ts`, `gemini.adapter.ts`, `mistral.adapter.ts`, `llama.adapter.ts`
**And** cada adapter traduz para o formato da API do provider (OpenAI chat completions, Anthropic messages, etc.)
**And** cada adapter aplica timeout de 90s (NFR2)
**And** cada adapter valida a resposta com Zod e faz retry até 2x em JSON inválido (FR7, FR8)
**And** se 3 tentativas falharem, o adapter retorna `null` (FR9)
**And** `index.ts` exporta um registry que retorna os adapters ativos baseado nas env vars configuradas (NFR20)
**And** testes unitários com mocks cobrem: chamada com sucesso, retry em JSON inválido, timeout, falha total

### Story 1.4: Implementar API de configuração e health check dos providers

As a admin,
I want endpoints para configurar API keys e verificar se cada provider está operacional,
So that eu possa garantir que o comitê de 5 LLMs está pronto antes de analisar contratos.

**Acceptance Criteria:**

**Given** os adapters da Story 1.3
**When** eu fizer `GET /api/config/providers`
**Then** o sistema retorna `{ data: { providers: [{ name, status, lastChecked }] } }` com status de cada provider (FR32)

**Given** uma API key válida
**When** eu fizer `PUT /api/config/providers` com `{ provider: "gpt", apiKey: "sk-..." }`
**Then** o sistema valida a key fazendo uma chamada de teste ao provider (FR31)
**And** retorna `{ data: { provider: "gpt", status: "active" } }` se válida
**And** retorna `{ error: { code: "INVALID_KEY", message: "..." } }` se inválida

**And** a response segue o wrapper padrão `{ data }` / `{ error }`
**And** API keys são armazenadas via env vars (NFR8)

### Story 1.5: Implementar página de configuração de providers (M3)

As a admin,
I want uma interface visual para configurar e monitorar os 5 LLM providers,
So that eu possa inserir API keys, validar cada provider e ver o status do comitê em um só lugar.

**Acceptance Criteria:**

**Given** as API routes da Story 1.4
**When** eu acessar `/config`
**Then** vejo uma página com cards M3 (elevated) para cada um dos 5 providers
**And** cada card mostra: nome do provider, status (ativo/inativo com badge M3), botão para testar
**And** cada card tem um text field M3 para inserir/atualizar a API key
**And** ao clicar "Validar", o sistema chama `PUT /api/config/providers` e mostra resultado via snackbar M3
**And** a página usa top app bar M3 com título "Configuração de Providers"
**And** cores seguem Dynamic Color M3 (primary, error para status)
**And** a página é responsiva (funciona em desktop e mobile)

## Epic 2: Upload de Contrato & Gestão de Jobs

Usuário faz upload de um .docx, seleciona parâmetros (tipo, lado, jurisdição), acompanha o status do job em tempo real, e o sistema gerencia o lifecycle completo dos jobs.

### Story 2.1: Implementar job manager (filesystem CRUD)

As a desenvolvedor,
I want um módulo que gerencie o ciclo de vida dos jobs no filesystem,
So that todas as camadas do sistema (API, pipeline) possam criar, ler, atualizar e listar jobs de forma consistente.

**Acceptance Criteria:**

**Given** schemas e config das stories do Epic 1
**When** `createJob(params)` for chamado
**Then** cria o diretório `data/jobs/<jobId>/` com `meta.json` contendo: jobId (uuid), tenantId, status "created", parâmetros (contractType, side, jurisdiction), timestamps (createdAt, updatedAt)
**And** retorna o jobId gerado

**Given** um job existente
**When** `getJob(jobId)` for chamado
**Then** retorna o `meta.json` parseado e validado pelo schema Zod

**Given** um job existente
**When** `updateJob(jobId, updates)` for chamado
**Then** atualiza `meta.json` com os campos fornecidos e atualiza `updatedAt`

**Given** jobs existentes
**When** `listJobs()` for chamado
**Then** retorna lista de jobs ordenados por `createdAt` desc

**And** cada job é stateless e independente (NFR14)
**And** testes unitários cobrem: criação, leitura, atualização, listagem, job inexistente (404)

### Story 2.2: Implementar parsing de .docx (mammoth → DocAST)

As a desenvolvedor,
I want um módulo que converta um .docx em blocos estruturados (DocAST) com IDs únicos,
So that as LLMs possam analisar o contrato por blocos e referenciar cláusulas específicas.

**Acceptance Criteria:**

**Given** um arquivo .docx válido no diretório do job
**When** `ingestDocx(jobId)` for chamado
**Then** o mammoth parseia o .docx em elementos HTML/texto
**And** cada parágrafo/heading vira um bloco no DocAST com `blockId` único (uuid)
**And** o DocAST é validado contra `DocASTSchema` (Zod)
**And** o resultado é salvo em `data/jobs/<jobId>/docast.json`
**And** o parsing completa em < 3 segundos para contrato de 20 páginas (NFR4)
**And** `meta.json` é atualizado com `currentStage: "ingest"`

**Given** um arquivo que não é .docx
**When** `ingestDocx(jobId)` for chamado
**Then** o job é marcado como `failed` com errorCode `INVALID_FORMAT`

**And** testes unitários cobrem: .docx válido, arquivo inválido, DocAST com blocos e IDs

### Story 2.3: Implementar API de criação de jobs (upload + params)

As a usuário,
I want fazer upload de um .docx com parâmetros e receber um jobId para acompanhar,
So that eu possa submeter contratos para análise e rastrear cada submissão.

**Acceptance Criteria:**

**Given** um arquivo .docx válido e parâmetros
**When** eu fizer `POST /api/jobs` com multipart form (file + contractType + side + jurisdiction)
**Then** o sistema valida: MIME type (application/vnd.openxmlformats), tamanho ≤ 10MB, filename sanitizado (NFR3, NFR11)
**And** cria o job via job manager, salva o .docx em `data/jobs/<jobId>/input.docx`
**And** retorna `201 { data: { jobId, status: "created" } }`

**Given** um arquivo inválido (PDF, > 10MB, MIME errado)
**When** eu fizer `POST /api/jobs`
**Then** retorna `422 { error: { code: "INVALID_FILE", message: "..." } }`

**Given** parâmetros ausentes
**When** eu fizer `POST /api/jobs` sem contractType
**Then** retorna `422 { error: { code: "MISSING_PARAMS", message: "..." } }`

**And** o conteúdo do contrato não aparece em nenhum log (NFR9)

### Story 2.4: Implementar API de status e listagem de jobs

As a usuário,
I want consultar o status de um job e ver meus jobs recentes,
So that eu possa acompanhar o progresso da análise e acessar resultados anteriores.

**Acceptance Criteria:**

**Given** um job existente em status "processing"
**When** eu fizer `GET /api/jobs/[jobId]`
**Then** retorna `200 { data: { jobId, status, currentStage, progress: { completed, total }, createdAt, updatedAt } }`

**Given** um jobId inexistente
**When** eu fizer `GET /api/jobs/[jobId]`
**Then** retorna `404 { error: { code: "JOB_NOT_FOUND", message: "..." } }`

**Given** um job expirado (> 24h)
**When** eu fizer `GET /api/jobs/[jobId]`
**Then** o sistema deleta o diretório do job (lazy cleanup) e retorna `410 { error: { code: "JOB_EXPIRED", message: "..." } }` (FR27)

**Given** jobs existentes
**When** eu fizer `GET /api/jobs`
**Then** retorna `200 { data: { jobs: [...] } }` ordenados por createdAt desc

### Story 2.5: Implementar expiração e cleanup de jobs

As a sistema,
I want deletar automaticamente dados de jobs expirados,
So that dados de contratos não persistam além do necessário, garantindo confidencialidade (FR27, NFR10).

**Acceptance Criteria:**

**Given** jobs com `createdAt` > 24 horas
**When** o scheduled cleanup rodar (a cada 30 min via setInterval)
**Then** os diretórios dos jobs expirados são completamente deletados do filesystem
**And** o log registra apenas: jobId e timestamp da deleção (sem conteúdo)

**Given** um job expirado sendo acessado
**When** qualquer API route consultar o job
**Then** lazy cleanup deleta o diretório e retorna 410 Gone

**And** testes unitários cobrem: cleanup de jobs expirados, jobs válidos não são afetados, lazy cleanup no acesso

### Story 2.6: Implementar página principal — upload + lista de jobs (M3)

As a usuário,
I want uma interface para fazer upload de contratos e ver meus jobs recentes,
So that eu possa submeter contratos para análise e acompanhar o progresso visualmente.

**Acceptance Criteria:**

**Given** a página principal (`/`)
**When** eu acessar
**Then** vejo um top app bar M3 com título "contract-agent"
**And** vejo um formulário de upload com: botão de upload (filled button M3), select de tipo de contrato (NDA/SaaS/Parceria), select de lado (contratante/contratado), select de jurisdição (Brasil default)
**And** vejo um dialog M3 informando que o contrato será enviado para APIs externas antes de confirmar o upload (FR34)
**And** abaixo do form, vejo a lista de jobs recentes em cards M3 com: jobId truncado, tipo de contrato, status com badge colorido, data de criação

**Given** um job em status "processing"
**When** a lista estiver visível
**Then** o status é atualizado via polling a cada 5s (NFR5) com recursive setTimeout
**And** um progress indicator M3 (linear) mostra o estágio atual

**Given** um upload concluído com sucesso
**When** o job for criado
**Then** um snackbar M3 confirma "Contrato enviado para análise" e o job aparece na lista

**And** a página segue tipografia, cores e shapes M3
**And** é responsiva (funciona em desktop e mobile)

## Epic 3: Análise Multi-LLM & Consolidação

O comitê de 5 LLMs analisa o contrato em paralelo, cada uma sob perspectiva diferente. Sistema consolida achados, deduplica, classifica por severidade e calcula consenso.

### Story 3.1: Criar prompts diferenciados por persona e playbook base

As a desenvolvedor,
I want prompts especializados para cada LLM e um playbook base com regras de análise contratual,
So that cada LLM analise o contrato sob uma perspectiva diferente, maximizando a diversidade de achados do comitê.

**Acceptance Criteria:**

**Given** os schemas Zod (DocAST, PersonaOutput, Finding)
**When** a story for concluída
**Then** `base-playbook.yaml` define: regras gerais de análise, categorias de risco, formato esperado de output, severidades (critical/high/medium/low)
**And** cada prompt file (`gpt.prompt.ts`, `claude.prompt.ts`, `gemini.prompt.ts`, `mistral.prompt.ts`, `llama.prompt.ts`) exporta uma função `buildPrompt(docAst, params)` que retorna o prompt completo
**And** cada persona tem perspectiva diferenciada: ex. GPT foca em riscos comerciais, Claude em redação jurídica, Gemini em compliance, Mistral em cláusulas abusivas, Llama em termos ambíguos (FR11)
**And** o prompt instrui a LLM a retornar JSON conforme `PersonaOutputSchema` (com referência a blockIds do DocAST)
**And** testes unitários verificam que cada prompt gera string válida e inclui o DocAST

### Story 3.2: Implementar run-personas (execução paralela das 5 LLMs)

As a sistema,
I want enviar o DocAST para as 5 LLMs em paralelo, validar cada resposta e tolerar falhas parciais,
So that o contrato seja analisado por múltiplas perspectivas com resiliência.

**Acceptance Criteria:**

**Given** um job com `docast.json` gerado e pelo menos 3 adapters ativos
**When** `runPersonas(jobId)` for chamado
**Then** o sistema carrega o DocAST e os parâmetros do job
**And** constrói o prompt para cada persona usando `buildPrompt()`
**And** executa `Promise.allSettled()` com as 5 chamadas de adapter em paralelo (FR6)
**And** cada chamada tem timeout de 90s (FR10, NFR2)
**And** cada resposta é validada contra `PersonaOutputSchema` via Zod (FR7)
**And** em caso de JSON inválido, o adapter faz retry com re-prompt até 2x (FR8)
**And** respostas válidas são salvas em `data/jobs/<jobId>/personas/<provider>.json`

**Given** 3+ LLMs responderam com sucesso
**When** as chamadas completarem
**Then** `meta.json` é atualizado com `currentStage: "personas"` e `progress: { completed: N, total: 5 }`

**Given** menos de 3 LLMs responderam com sucesso
**When** as chamadas completarem
**Then** o job é marcado como `failed` com errorCode `INSUFFICIENT_RESPONSES` (FR9, NFR17)
**And** `meta.json` registra quais providers falharam e por quê (sem conteúdo do contrato)

**And** falha de um provider não impacta os outros (NFR16)
**And** testes unitários com mocks cobrem: 5/5 sucesso, 3/5 sucesso, 2/5 falha (insufficient), retry em JSON inválido

### Story 3.3: Implementar consolidação, deduplicação e classificação

As a sistema,
I want consolidar achados das múltiplas LLMs, deduplicar achados similares e classificar por severidade com nível de consenso,
So that o usuário receba um resultado unificado, sem redundância, priorizado por criticidade.

**Acceptance Criteria:**

**Given** respostas válidas de 3-5 LLMs em `personas/*.json`
**When** `consolidate(jobId)` for chamado
**Then** o sistema carrega todas as respostas de personas disponíveis
**And** identifica achados similares entre diferentes LLMs baseado em: mesmo `blockId` + severidade similar + conteúdo semelhante (FR13)
**And** achados similares são mesclados em um único Finding com referência a todas as LLMs que o identificaram
**And** cada Finding recebe classificação de severidade: critical, high, medium, low (FR14)
**And** cada Finding recebe nível de consenso: quantas LLMs concordam (1-5) (FR15)
**And** cada Finding mantém referência ao `blockId` do DocAST (FR17)
**And** o resultado consolidado é validado contra schema Zod

**Given** achados consolidados
**When** a consolidação completar
**Then** o resultado é salvo em `data/jobs/<jobId>/consolidated.json`
**And** `meta.json` é atualizado com `currentStage: "consolidate"`

**And** achados duplicados representam < 10% do output final
**And** testes unitários cobrem: deduplicação de achados iguais, achados únicos preservados, cálculo de consenso correto, classificação de severidade

### Story 3.4: Implementar geração de PatchPlan

As a sistema,
I want gerar um PatchPlan com ações ordenadas por severidade,
So that o renderizador de output tenha uma lista ordenada e acionável para gerar a minuta comentada.

**Acceptance Criteria:**

**Given** achados consolidados em `consolidated.json`
**When** o PatchPlan for gerado
**Then** cada achado com sugestão de redação alternativa se torna um patch com: blockId, original, suggested, justification, severity, consensus, sources (quais LLMs)
**And** patches são ordenados por severidade (critical primeiro) e depois por posição no documento (blockId order) (FR16)
**And** o PatchPlan é validado contra `PatchPlanSchema` (Zod)
**And** o PatchPlan é salvo como parte de `consolidated.json`

**And** testes unitários cobrem: ordenação por severidade, ordenação por posição, schema validation

### Story 3.5: Implementar orquestrador de pipeline (run-pipeline)

As a sistema,
I want um orquestrador que execute todos os estágios do pipeline em sequência e atualize o status a cada etapa,
So that o processamento completo (parsing → análise → consolidação) seja coordenado de forma robusta e rastreável.

**Acceptance Criteria:**

**Given** um job em status "created" com `input.docx` salvo
**When** `runPipeline(jobId)` for chamado (fire-and-forget)
**Then** executa em sequência: `ingestDocx(jobId)` → `runPersonas(jobId)` → `consolidate(jobId)`
**And** atualiza `meta.json` com `status: "processing"` no início
**And** atualiza `currentStage` a cada etapa para permitir polling do frontend
**And** se todas as etapas completarem, atualiza status para `"analyzed"` (aguardando render no Epic 4)

**Given** um erro em qualquer estágio
**When** o estágio falhar
**Then** o job é marcado como `failed` com `errorCode` e `errorMessage` (sem conteúdo do contrato)
**And** estágios anteriores bem-sucedidos permanecem salvos no filesystem (para debug)

**And** o pipeline completo (até consolidação) executa em tempo compatível com < 2 min total (NFR1)
**And** testes de integração cobrem: pipeline completo com mocks de LLM, falha no parsing, falha nas personas, falha na consolidação

## Epic 4: Geração de Outputs & Entrega de Resultados

Usuário recebe a minuta comentada (.docx) com antes/depois por cláusula + relatório de riscos (.json) com justificativas. Pode baixar ambos. Disclaimer legal presente em toda análise.

### Story 4.1: Implementar geração de minuta comentada (.docx)

As a sistema,
I want gerar um documento .docx com o trecho original e a redação proposta (antes/depois) para cada cláusula flagada,
So that o usuário receba um documento prático e acionável para negociar com a contraparte.

**Acceptance Criteria:**

**Given** um job com `consolidated.json` contendo PatchPlan
**When** `renderDocx(jobId)` for chamado
**Then** o sistema gera `output.docx` usando a lib `docx`
**And** o documento contém: título com tipo de contrato + data, disclaimer legal no topo (FR33)
**And** para cada patch no PatchPlan: o trecho original (antes), a redação sugerida (depois), a justificativa, a severidade (com formatação visual: critical=vermelho, high=laranja, medium=amarelo, low=azul), e o nível de consenso (FR18, FR20, FR21)
**And** inclui seção final de sugestões gerais não vinculadas a cláusula específica (FR22)
**And** o arquivo é salvo em `data/jobs/<jobId>/output.docx`
**And** `meta.json` é atualizado com `currentStage: "render"`

**And** testes unitários cobrem: geração com múltiplos patches, geração com zero patches (contrato limpo), presença do disclaimer, formatação de severidades

### Story 4.2: Implementar geração de relatório de riscos (.json)

As a sistema,
I want gerar um relatório estruturado em JSON com todos os achados consolidados,
So that o usuário tenha dados estruturados para análise programática e integração futura.

**Acceptance Criteria:**

**Given** um job com `consolidated.json`
**When** o relatório for gerado
**Then** `report.json` contém: metadata (jobId, contractType, side, jurisdiction, analyzedAt, providersUsed), summary (totalFindings, bySeverity: { critical, high, medium, low }), findings (array com cada achado: id, blockId, severity, original, suggested, justification, consensus, sources), generalSuggestions (array de sugestões não vinculadas a cláusula) (FR19, FR20, FR21, FR22)
**And** o relatório é validado contra `FinalReportSchema` (Zod)
**And** o arquivo é salvo em `data/jobs/<jobId>/report.json`
**And** `meta.json` é atualizado com `status: "completed"`

**And** testes unitários cobrem: schema validation do report, contagem de findings por severidade, presença de todos os campos

### Story 4.3: Integrar render no pipeline e implementar APIs de download

As a usuário,
I want baixar a minuta comentada e o relatório de riscos quando a análise completar,
So that eu possa usar os outputs para negociar com a contraparte ou validar com meu advogado.

**Acceptance Criteria:**

**Given** um job em status "analyzed" (consolidação completa)
**When** o pipeline continuar
**Then** `runPipeline` executa `renderDocx(jobId)` e geração de `report.json` como estágios finais
**And** `meta.json` é atualizado para `status: "completed"` ao término

**Given** um job em status "completed"
**When** eu fizer `GET /api/jobs/[jobId]/output`
**Then** retorna o arquivo `output.docx` com headers corretos (`Content-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document`, `Content-Disposition: attachment`) (FR25)

**Given** um job em status "completed"
**When** eu fizer `GET /api/jobs/[jobId]/report`
**Then** retorna o `report.json` com `Content-Type: application/json` (FR26)

**Given** um job que não está "completed"
**When** eu fizer download
**Then** retorna `404 { error: { code: "NOT_READY", message: "..." } }`

**Given** um job expirado
**When** eu fizer download
**Then** retorna `410 { error: { code: "JOB_EXPIRED", message: "..." } }`

### Story 4.4: Implementar página de resultado (M3)

As a usuário,
I want ver os resultados da análise com achados organizados por severidade, antes/depois por cláusula, e poder baixar os outputs,
So that eu entenda imediatamente o que precisa ser negociado e possa agir rapidamente.

**Acceptance Criteria:**

**Given** a página `/jobs/[jobId]`
**When** o job está em status "processing"
**Then** vejo um progress indicator M3 (circular) com o estágio atual e progresso das LLMs
**And** a página faz polling a cada 5s via recursive setTimeout

**Given** o job está em status "completed"
**When** a página carregar
**Then** vejo o disclaimer legal no topo em um card M3 outlined (FR33)
**And** vejo summary: total de achados, chips M3 coloridos por severidade (critical=error, high=warning, medium=secondary, low=outline) com contagem
**And** vejo a lista de achados em FindingCards M3 (elevated), cada um com: severidade (badge), trecho original, redação sugerida (destacada), justificativa, nível de consenso (ex: "4/5 LLMs"), LLMs que flagaram
**And** posso filtrar achados por severidade clicando nos chips
**And** vejo seção de sugestões gerais no final
**And** vejo dois botões M3 (filled): "Baixar Minuta Comentada (.docx)" e "Baixar Relatório (.json)"
**And** ao clicar download, o arquivo é baixado via fetch das APIs

**Given** o job está em status "failed"
**When** a página carregar
**Then** vejo mensagem de erro clara em um card M3 com cor de erro, sem expor conteúdo do contrato

**And** a página segue tipografia, cores, shapes e elevation M3
**And** é responsiva (desktop e mobile)

## Epic 5: Feedback do Usuário & Quality Loop

Usuário avalia cada análise como "bom" ou "ruim", feedback é armazenado vinculado ao job para alimentar melhoria contínua futura.

### Story 5.1: Implementar API de feedback

As a usuário,
I want enviar minha avaliação (bom ou ruim) sobre uma análise,
So that meu feedback seja registrado e possa ser usado para melhorar a qualidade do sistema no futuro.

**Acceptance Criteria:**

**Given** um job em status "completed"
**When** eu fizer `POST /api/jobs/[jobId]/feedback` com `{ rating: "good" }` ou `{ rating: "bad" }`
**Then** o sistema salva o feedback em `meta.json` do job: `feedback: { rating, createdAt }` (FR29)
**And** retorna `200 { data: { jobId, feedback: "good" } }`

**Given** um job que não está "completed"
**When** eu fizer POST de feedback
**Then** retorna `422 { error: { code: "JOB_NOT_COMPLETED", message: "..." } }`

**Given** um job que já tem feedback
**When** eu fizer POST de feedback novamente
**Then** o feedback é atualizado (substitui o anterior)

**Given** um rating inválido (não é "good" nem "bad")
**When** eu fizer POST de feedback
**Then** retorna `422 { error: { code: "INVALID_RATING", message: "..." } }`

**And** testes unitários cobrem: feedback válido, job não completado, rating inválido, atualização de feedback

### Story 5.2: Implementar componente de feedback na página de resultado (M3)

As a usuário,
I want avaliar a análise diretamente na página de resultado com botões visuais,
So that eu possa dar feedback de forma rápida e intuitiva sem sair da página.

**Acceptance Criteria:**

**Given** a página `/jobs/[jobId]` com job "completed"
**When** a página carregar
**Then** vejo uma seção "Como foi a análise?" com dois botões M3: filled tonal "Bom" (com ícone thumb up) e outlined "Ruim" (com ícone thumb down) (FR28)

**Given** nenhum feedback enviado ainda
**When** eu clicar em "Bom" ou "Ruim"
**Then** o sistema chama `POST /api/jobs/[jobId]/feedback` com o rating selecionado
**And** um snackbar M3 confirma "Feedback enviado! Obrigado."
**And** o botão selecionado fica em estado "selected" (filled) e o outro fica desabilitado

**Given** feedback já enviado
**When** a página carregar
**Then** o botão correspondente ao rating já aparece como selecionado
**And** o usuário pode clicar no outro botão para mudar o feedback

**And** o componente segue cores, tipografia e interaction states M3
**And** é responsivo
