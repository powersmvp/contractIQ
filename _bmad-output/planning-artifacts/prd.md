---
stepsCompleted: [step-01-init, step-02-discovery, step-03-success, step-04-journeys, step-05-domain, step-06-innovation, step-07-project-type, step-08-scoping, step-09-functional, step-10-nonfunctional, step-11-polish]
inputDocuments:
  - _bmad-output/planning-artifacts/product-brief-contract-agent-2026-02-13.md
  - docs/WORKFLOW.md
  - docs/BMAD-RUNBOOK.md
workflowType: prd
documentCounts:
  briefs: 1
  research: 0
  brainstorming: 0
  projectDocs: 2
  projectContext: 0
classification:
  projectType: saas_b2b
  domain: legaltech
  complexity: high
  projectContext: greenfield
---

# Product Requirements Document - contract-agent

**Author:** rdeli
**Date:** 2026-02-13
**Classification:** SaaS B2B | Legaltech | High Complexity | Greenfield

## Executive Summary

O **contract-agent** é uma plataforma SaaS B2B de análise inteligente de contratos que usa um comitê de 5 LLMs distintas (GPT, Claude, Gemini, Mistral, Llama) para revisar minutas automaticamente. O diferencial é o mecanismo de consenso multi-modelo — como ter 5 advogados de escritórios diferentes revisando o mesmo contrato em paralelo.

**Problema**: Startups e PMEs gastam horas revisando contratos manualmente, sem expertise jurídica e sem budget para advogado externo. Deals atrasam, riscos passam despercebidos.

**Solução**: Upload de .docx → análise por 5 LLMs em paralelo → minuta comentada com antes/depois por cláusula + relatório de riscos com justificativas. Tudo em < 2 minutos.

**Usuários-alvo**: Founders de startup, equipes comerciais, advogados in-house de empresas menores.

**Tipos de contrato**: NDA, SaaS, Parcerias.

## Success Criteria

### User Success

- Usuário faz upload de um contrato .docx e recebe análise completa em **< 2 minutos**
- Minuta comentada com **antes/depois** por cláusula — usuário entende imediatamente o que mudar
- Cada achado inclui **justificativa** — usuário sabe por que aquilo é risco
- Classificação por **severidade** (crítico, alto, médio, baixo) — priorização clara
- Usuário consegue usar o output para negociar com a contraparte **sem precisar de advogado** para contratos simples (NDA, SaaS padrão)
- Feedback bom/ruim: **> 80% positivo** nos primeiros 3 meses

### Business Success

- **3 meses**: 10+ empresas usando recorrentemente (pelo menos 2 contratos/mês)
- **6 meses**: retenção mensal > 60%, empresas reportam redução de 70%+ no tempo de revisão
- **12 meses**: base para monetização (freemium ou por análise), pipeline de Fase 2

### Technical Success

- 5 LLMs respondendo em paralelo com **100% de respostas validadas por Zod**
- Pipeline end-to-end estável: **0 crashes** em produção por JSON inválido (retry com re-prompt)
- Consolidação deduplicando corretamente achados entre os 5 modelos
- **< 2 minutos** de tempo total (upload → resultado) para contrato de até 20 páginas
- Dados de contrato **não persistidos** além do necessário para o job (confidencialidade legaltech)

### Measurable Outcomes

| Métrica | Target | Método |
|---|---|---|
| Tempo de análise | < 2 min (contrato médio) | Timestamp upload → resultado |
| Validação Zod | 100% das respostas das LLMs | Logs de validação |
| Satisfação | > 80% feedback positivo | Avaliação por análise |
| Deduplicação | < 10% de achados duplicados no output final | Auditoria manual em 10 contratos |
| Disponibilidade | 99% uptime | Monitoramento |

## User Journeys

### Journey 1: Rafael, Founder — "O NDA que travou o deal"

Rafael é co-founder de uma startup de logística com 12 pessoas. Recebeu um NDA de 8 páginas de um potencial parceiro estratégico. O deal precisa andar essa semana, mas o advogado externo só tem agenda em 5 dias e cobra R$ 800/hora.

**Opening Scene**: Rafael abre o email com o NDA anexado. Sabe que precisa revisar, mas da última vez gastou 3 horas lendo e ainda assim o advogado encontrou 4 cláusulas problemáticas que ele não viu.

**Rising Action**: Rafael acessa o contract-agent, faz upload do .docx, seleciona "NDA", marca "contratado" e "Brasil". Clica em "Analisar". Vê a barra de progresso — as 5 LLMs estão trabalhando em paralelo.

**Climax**: Em 1 minuto e 40 segundos, o resultado aparece. A minuta comentada mostra 6 achados: 2 críticos (cláusula de não-competição de 5 anos e penalidade desproporcional), 3 médios e 1 baixo. Cada achado tem o trecho original, a redação sugerida e a justificativa. Rafael entende imediatamente o que precisa negociar.

**Resolution**: Rafael baixa a minuta comentada, envia para a contraparte com os pontos que quer negociar. O deal avança no mesmo dia. Ele dá feedback "bom" na análise.

**Requisitos revelados**: upload .docx, seleção de parâmetros, processamento paralelo com status visual, output antes/depois, download .docx, feedback.

### Journey 2: Camila, Comercial — "5 contratos na semana e o pipeline travado"

Camila é head comercial de uma SaaS B2B. Tem 5 contratos de clientes novos para fechar essa semana. Cada um é um contrato de SaaS padrão, mas cada cliente manda sua versão com cláusulas próprias.

**Opening Scene**: Segunda-feira. 5 .docx na inbox. O jurídico interno (1 pessoa) está afogado com due diligence de uma aquisição. Camila sabe que se não fechar esses contratos essa semana, perde 3 deles para o concorrente.

**Rising Action**: Camila faz upload dos 5 contratos no contract-agent, um por um. Seleciona "SaaS", "contratado", "Brasil" para todos. Enquanto o primeiro processa, já sobe o segundo.

**Climax**: Em 10 minutos, tem os 5 resultados. 3 contratos estão ok (só ajustes menores de wording). 2 têm cláusulas críticas — uma tem limitação de responsabilidade abusiva, outra tem renovação automática sem opt-out. As sugestões de redação alternativa estão prontas.

**Resolution**: Camila encaminha as minutas comentadas para cada cliente com os ajustes. Fecha 4 dos 5 deals na semana. O jurídico só precisou olhar o contrato mais complexo. Feedback "bom" nos 5.

**Requisitos revelados**: múltiplos uploads em sequência, tempo de resposta consistente, output prático para envio direto à contraparte, análises independentes por job.

### Journey 3: Dr. Marina, Advogada In-House — "12 contratos e só eu"

Marina é a única advogada de uma empresa de 80 funcionários. Tem 12 contratos pendentes de revisão — NDAs, parcerias, SaaS, um contrato de investimento.

**Opening Scene**: Marina abre o backlog de contratos. Sabe que só consegue revisar 2-3 por dia com a profundidade necessária. Os 9 restantes vão atrasar.

**Rising Action**: Marina sobe os 12 contratos no contract-agent. Começa pelos que o sistema classificou com achados críticos — priorização imediata pela severidade.

**Climax**: Dos 12, o sistema aponta 4 com riscos críticos e 3 com riscos médios. Os 5 restantes têm só ajustes menores. Marina foca nos 4 críticos — o contract-agent já fez 80% do trabalho. Ela valida os achados, ajusta 2 sugestões de wording com sua expertise, e aprova os demais.

**Resolution**: Marina revisa os 12 contratos em 1 dia em vez de 5. O sistema acertou em 90% dos achados. Nos 10% restantes, ela dá feedback "ruim" e o sistema aprende. Ela agora usa o contract-agent como primeiro filtro para tudo que chega.

**Requisitos revelados**: priorização por severidade, volume de análises, confiança suficiente para advogado validar (não gerar falsos positivos excessivos), feedback granular.

### Journey 4: Admin/Setup — "Configurando as 5 LLMs"

O usuário técnico (pode ser o próprio founder ou um dev) precisa configurar o sistema pela primeira vez.

**Opening Scene**: Primeiro acesso ao contract-agent. Precisa configurar as API keys dos 5 providers (OpenAI, Anthropic, Google, Mistral, Meta/Llama).

**Rising Action**: Acessa a tela de configuração. Insere as API keys uma a uma. O sistema valida cada key fazendo uma chamada de teste.

**Climax**: Todas as 5 keys validadas. O sistema confirma que o comitê está pronto.

**Resolution**: Faz upload de um contrato de teste para validar o pipeline end-to-end. Resultado chega em < 2 minutos. Sistema operacional.

**Requisitos revelados**: tela de configuração de API keys, validação de keys, status de saúde dos providers, contrato de teste.

### Journey Requirements Summary

| Capability | Journeys que revelam |
|---|---|
| Upload .docx + parâmetros | J1, J2, J3, J4 |
| Processamento paralelo com status | J1, J2 |
| Output antes/depois com justificativa | J1, J2, J3 |
| Download .docx | J1, J2, J3 |
| Feedback bom/ruim | J1, J2, J3 |
| Múltiplos jobs independentes | J2, J3 |
| Priorização por severidade | J3 |
| Configuração de API keys | J4 |
| Validação de keys / health check | J4 |
| Disclaimer legal | J1, J2, J3 |

## Domain-Specific Requirements

### Compliance & Regulatory

- **Disclaimer obrigatório**: toda análise deve exibir "Esta análise não substitui aconselhamento jurídico profissional. Use como ferramenta de apoio."
- **LGPD (Brasil)**: contratos podem conter dados pessoais de terceiros. O sistema não deve persistir o conteúdo do contrato além do tempo necessário para o job
- **Ética profissional**: o sistema não pode se apresentar como substituto de advogado nem emitir "parecer jurídico"
- **Termos de uso**: usuário deve aceitar que o output é sugestivo, não vinculante

### Technical Constraints

- **Confidencialidade**: contratos são enviados para 5 APIs externas de LLMs. O sistema deve informar isso ao usuário no upload
- **Não-persistência**: dados do contrato e respostas das LLMs devem ser deletados após download ou em 24h (o que vier primeiro)
- **Sem logging de conteúdo**: logs do sistema não devem conter trechos do contrato — apenas metadados (jobId, timestamps, status)
- **HTTPS obrigatório**: toda comunicação com APIs e com o usuário via TLS

### Risk Mitigations

| Risco | Mitigação |
|---|---|
| LLM "alucina" achado inexistente | Comitê multi-LLM: só achados com consenso de 2+ modelos têm alta confiança |
| Vazamento de dados do contrato | Não-persistência + sem logging de conteúdo + TLS |
| Usuário toma decisão errada baseado no output | Disclaimer + classificação de severidade + justificativa por achado |
| Provider LLM armazena dados de treino | Usar APIs com data processing agreements (DPA) que garantem não uso para treino |
| Falha de um provider | Pipeline resiliente — se 1 das 5 LLMs falhar, consolida com 4. Mínimo: 3 respostas |

## Innovation & Novel Patterns

### Detected Innovation Areas

1. **Comitê multi-LLM (Consensus AI)**: Nenhuma ferramenta de legaltech usa 5 modelos de IA diferentes votando em paralelo para aumentar a confiança. Padrão de "ensemble" aplicado a análise jurídica — como ter 5 advogados de escritórios diferentes revisando o mesmo contrato.

2. **AI Agents para workflow jurídico**: O sistema orquestra múltiplos agentes especializados em um pipeline estruturado (ingest → analyze → consolidate → render). Cada LLM atua como um agente com perspectiva própria.

3. **Output acionável direto**: Ao contrário de chatbots que dão opiniões genéricas, o contract-agent gera a minuta de volta com o diff exato (antes/depois) — pronto para enviar à contraparte.

### Market Context & Competitive Landscape

- Ferramentas como Ironclad, SpotDraft e Juro usam uma única LLM para análise
- Nenhuma oferece mecanismo de consenso multi-modelo
- O mercado de legaltech para startups/PMEs é pouco atendido — foco está no enterprise
- Abordagem de comitê é validada em ML (ensemble methods) mas não aplicada a contract review

### Validation Approach

- Rodar pipeline em 10+ contratos reais de tipos variados (NDA, SaaS, parceria)
- Comparar achados do comitê (5 LLMs) vs achado de uma LLM só — medir ganho de precisão
- Medir taxa de consenso: se 5/5 concordam vs 3/5 vs 2/5, como isso correlaciona com qualidade real

### Risk Mitigation

| Risco de inovação | Fallback |
|---|---|
| Custo de 5 APIs simultâneas é alto demais | Modo "econômico" com 3 LLMs. Configurável pelo usuário |
| Latência de 5 chamadas paralelas excede 2 min | Promise.all — todas em paralelo, timeout individual de 90s |
| Um modelo domina e os outros apenas concordam | Prompts diferenciados por persona para forçar perspectivas distintas |
| Consenso nem sempre é indicador de qualidade | Peso por confiança — se 4/5 concordam e 1 diverge, investigar o divergente |

## SaaS B2B Specific Requirements

### Project-Type Overview

O contract-agent é uma plataforma SaaS B2B multi-tenant voltada para startups e PMEs. Cada empresa opera em seu próprio workspace isolado com dados segregados.

### Tenant Model

- **Isolamento**: dados de contratos e análises segregados por tenant. Nenhum tenant acessa dados de outro
- **MVP**: single-tenant (uma instância, um workspace). Arquitetura já preparada para multi-tenant (tenant_id em todas as entidades)
- **Fase 2+**: multi-tenant completo com onboarding self-service por empresa

### Permission Model (RBAC)

| Role | Permissões |
|---|---|
| **Admin** | Configurar API keys, gerenciar usuários, ver todas as análises |
| **Analyst** | Upload, analisar, download, dar feedback |
| **Viewer** | Ver análises concluídas e baixar outputs |

- MVP: role único (admin/analyst combinado — quem acessa faz tudo)
- Fase 2+: RBAC completo com os 3 roles

### Subscription Tiers

| Tier | Limites | Target |
|---|---|---|
| **Free** | X análises/mês, 1 usuário | Founder solo testando |
| **Pro** | Análises ilimitadas, até 5 usuários | Startup com time comercial |
| **Enterprise** | Ilimitado, RBAC, integrações, SLA | PME com jurídico in-house |

- MVP: sem billing — funciona como "beta aberto" ou trial
- Fase 2+: integração com Stripe para billing por tier

### Integration List

| Integração | Fase | Descrição |
|---|---|---|
| **5 LLM APIs** | MVP | OpenAI, Anthropic, Google, Mistral, Meta (Llama) |
| **Slack** | Fase 2+ | Notificação quando análise concluir, alertas de risco crítico |
| **Google Drive** | Fase 2+ | Import/export de .docx direto do Drive |
| **ERP Jurídico** | Fase 3+ | Integração via API para sincronizar contratos e status |

### Implementation Considerations

- **API-first**: backend expõe API Routes (Next.js) que a UI consome. Mesma API servirá integrações futuras
- **Job-based**: cada análise é um job isolado com lifecycle (created → processing → completed → expired)
- **Stateless pipeline**: pipeline de análise não mantém estado entre jobs — cada job é independente
- **Preparação multi-tenant**: desde o MVP, todas as entidades terão campo `tenantId` mesmo que haja só 1 tenant

## Project Scoping & Phased Development

### MVP Strategy & Philosophy

**MVP Approach:** Problem-solving MVP — entregar a menor versão que resolve a dor central (revisão de contratos lenta e cara) de forma significativamente melhor que o status quo (ler manualmente + ChatGPT).

**Resource Requirements:** 1 desenvolvedor full-stack (Next.js/TypeScript) + API keys dos 5 providers

### MVP Feature Set (Phase 1)

**Core User Journeys Suportadas:**
- J1 (Founder — NDA urgente) — completa
- J2 (Comercial — múltiplos contratos) — completa
- J3 (Advogada In-House — triagem por volume) — completa
- J4 (Admin — setup de API keys) — completa

**Must-Have Capabilities:**

| # | Capability | Justificativa |
|---|---|---|
| 1 | Upload .docx + parâmetros | Sem isso, não existe produto |
| 2 | Parsing DocAST (mammoth) | Pipeline depende da estrutura de blocos |
| 3 | 5 LLMs em paralelo (Promise.all) | Diferencial core — comitê multi-LLM |
| 4 | Validação Zod + retry | Sem isso, JSON inválido quebra tudo |
| 5 | Consolidação + deduplicação | Sem isso, output é caótico e redundante |
| 6 | Minuta comentada .docx (antes/depois) | Output principal que o usuário precisa |
| 7 | Relatório de riscos .json | Dados estruturados para consumo |
| 8 | UI: upload, status, download | Interface mínima para operar |
| 9 | Feedback bom/ruim | Base para quality loop futuro |
| 10 | Disclaimer legal | Obrigatório para legaltech |
| 11 | Config de API keys | Necessário para operar o comitê |

### Post-MVP Features

**Phase 2 (Growth):**
- Edição de mudanças dentro da plataforma
- Versionamento de documentos
- RBAC (Admin/Analyst/Viewer)
- Multi-tenant completo
- Integração Slack (notificações)
- Integração Google Drive
- Playbooks YAML customizáveis
- Agente de QA automatizado
- Billing (Stripe) com tiers Free/Pro/Enterprise

**Phase 3 (Expansion):**
- Acesso compartilhado com contraparte
- Discussão contratual centralizada
- Histórico de negociação
- Integração ERP Jurídico
- Templates de cláusulas por tipo
- OCR/PDF
- Track changes reais (WordprocessingML)

### Risk Mitigation Strategy

**Technical Risks:**
- Risco mais alto: latência de 5 APIs exceder 2 min → Mitigação: Promise.all paralelo + timeout 90s + pipeline funciona com mínimo 3 respostas
- JSON inválido das LLMs → Zod validation + retry com re-prompt (até 2 retries)

**Market Risks:**
- Usuários não confiam no output de IA para contratos → Mitigação: disclaimer + justificativa por achado + validação com advogado real nos primeiros 10 contratos
- Mercado acha caro demais (5 APIs) → Modo econômico com 3 LLMs configurável

**Resource Risks:**
- Time de 1 dev → MVP é viável com Next.js full-stack (UI + API no mesmo projeto)
- Se recursos forem menores que o planejado → core é pipeline (Epics A-E), UI pode ser extremamente mínima

## Functional Requirements

### 1. Document Ingestion

- **FR1**: Usuário pode fazer upload de arquivo .docx para análise
- **FR2**: Usuário pode selecionar tipo de contrato (NDA, SaaS, Parceria)
- **FR3**: Usuário pode selecionar lado (contratante ou contratado)
- **FR4**: Usuário pode selecionar jurisdição (Brasil como default)
- **FR5**: Sistema pode parsear o .docx em blocos estruturados (DocAST) com IDs únicos por bloco

### 2. Multi-LLM Analysis

- **FR6**: Sistema pode enviar o DocAST para 5 LLMs distintas em paralelo
- **FR7**: Sistema pode validar a resposta JSON de cada LLM contra schema Zod
- **FR8**: Sistema pode re-enviar prompt para a LLM quando a resposta for JSON inválido (até 2 retries)
- **FR9**: Sistema pode completar análise com mínimo de 3 respostas válidas (se 1-2 LLMs falharem)
- **FR10**: Sistema pode aplicar timeout individual de 90 segundos por LLM
- **FR11**: Cada LLM pode analisar o contrato sob uma perspectiva/persona diferenciada via prompt específico

### 3. Consolidation & Risk Assessment

- **FR12**: Sistema pode consolidar achados das 5 LLMs em um resultado unificado
- **FR13**: Sistema pode deduplicar achados similares entre diferentes LLMs
- **FR14**: Sistema pode classificar cada achado por severidade (crítico, alto, médio, baixo)
- **FR15**: Sistema pode calcular nível de consenso por achado (quantas LLMs concordam)
- **FR16**: Sistema pode gerar um PatchPlan com ações ordenadas por severidade
- **FR17**: Cada achado pode referenciar o blockId correspondente no DocAST

### 4. Output Generation

- **FR18**: Sistema pode gerar minuta comentada em formato .docx com trecho original e redação proposta (antes/depois) por cláusula
- **FR19**: Sistema pode gerar relatório de riscos em formato .json com achados consolidados
- **FR20**: Cada achado no output pode incluir justificativa explicando por que foi flagado
- **FR21**: Cada achado no output pode incluir nível de consenso entre as LLMs
- **FR22**: Output pode incluir seção de sugestões gerais (não vinculadas a cláusula específica)

### 5. Job Management

- **FR23**: Cada análise pode ser rastreada como um job independente com status (created, processing, completed, failed, expired)
- **FR24**: Usuário pode ver o status de processamento do job em tempo real
- **FR25**: Usuário pode baixar a minuta comentada (.docx) quando o job completar
- **FR26**: Usuário pode baixar o relatório de riscos (.json) quando o job completar
- **FR27**: Sistema pode expirar jobs e deletar dados do contrato após 24h ou download

### 6. User Feedback

- **FR28**: Usuário pode avaliar cada análise como "bom" ou "ruim"
- **FR29**: Sistema pode armazenar feedback vinculado ao jobId para análise posterior

### 7. Configuration & Setup

- **FR30**: Admin pode configurar API keys para cada um dos 5 providers de LLM
- **FR31**: Sistema pode validar cada API key fazendo chamada de teste ao provider
- **FR32**: Admin pode ver status de saúde de cada provider (ativo/inativo)

### 8. Compliance & Legal

- **FR33**: Sistema pode exibir disclaimer legal em toda análise gerada
- **FR34**: Sistema pode informar ao usuário que o contrato será enviado para APIs externas antes do upload
- **FR35**: Sistema pode não persistir conteúdo do contrato em logs (apenas metadados)
- **FR36**: Todas as entidades do sistema podem incluir tenantId para preparação multi-tenant

## Non-Functional Requirements

### Performance

- **NFR1**: Pipeline completo (upload → resultado) deve completar em < 2 minutos para contratos de até 20 páginas
- **NFR2**: Cada chamada individual de LLM deve ter timeout de 90 segundos
- **NFR3**: Upload de arquivo .docx de até 10MB deve completar em < 5 segundos
- **NFR4**: Parsing DocAST (mammoth) deve completar em < 3 segundos para contrato de 20 páginas
- **NFR5**: UI deve exibir atualização de status do job a cada 5 segundos durante processamento

### Security

- **NFR6**: Toda comunicação entre cliente e servidor deve usar HTTPS/TLS
- **NFR7**: Toda comunicação com APIs de LLM deve usar HTTPS/TLS
- **NFR8**: API keys dos providers devem ser armazenadas encriptadas (nunca em plaintext)
- **NFR9**: Conteúdo do contrato não deve aparecer em logs do sistema — apenas metadados (jobId, timestamp, status)
- **NFR10**: Dados do contrato e respostas das LLMs devem ser deletados em 24h ou após download (o que vier primeiro)
- **NFR11**: API Routes devem validar input para prevenir injection e upload malicioso

### Scalability

- **NFR12**: MVP deve suportar até 10 análises simultâneas sem degradação de performance
- **NFR13**: Arquitetura deve permitir escalar horizontalmente para Fase 2+ (queue system)
- **NFR14**: Cada job deve ser stateless e independente — sem dependência de estado compartilhado

### Reliability

- **NFR15**: Se 1-2 das 5 LLMs falharem, pipeline deve completar com as respostas disponíveis (mínimo 3)
- **NFR16**: Falha em um provider não deve impactar jobs que não usam aquele provider
- **NFR17**: Sistema deve retornar erro claro ao usuário se menos de 3 LLMs responderem
- **NFR18**: Disponibilidade target de 99% durante horário comercial

### Integration

- **NFR19**: Adapter HTTP genérico deve suportar qualquer LLM que exponha API REST com JSON
- **NFR20**: Adicionar ou trocar um provider de LLM deve requerer apenas configuração (API key + endpoint), sem mudança de código no pipeline
- **NFR21**: API Routes do sistema devem seguir padrão REST para facilitar integrações futuras (Slack, Drive, ERP)
