---
stepsCompleted: [1, 2, 3, 4, 5, 6]
inputDocuments:
  - docs/WORKFLOW.md
  - docs/BMAD-RUNBOOK.md
  - bmad-custom/contract-agent/templates/prd.template.md
  - bmad-custom/contract-agent/templates/architecture.template.md
  - bmad-custom/contract-agent/workflows/contract-analysis-mvp.spec.md
date: 2026-02-13
author: rdeli
---

# Product Brief: contract-agent

## Executive Summary

O **contract-agent** é uma plataforma de análise inteligente de contratos que emprega um comitê de 5 LLMs distintas (GPT, Claude, Gemini, Mistral, Llama) para revisar minutas de forma automatizada. O sistema ingere um documento .docx, executa análises paralelas sob diferentes perspectivas, consolida os achados com deduplicação e gera dois artefatos: uma minuta comentada com alterações propostas (antes/depois) e um relatório de riscos com justificativas.

Voltado para startups e empresas em início de atividade, o contract-agent resolve a dor de founders e equipes comerciais que gastam horas revisando contratos (NDAs, parcerias, SaaS) sem budget para horas de escritório de advocacia. O resultado é uma revisão completa, com nível de confiança elevado pelo consenso entre múltiplos modelos de IA.

---

## Core Vision

### Problem Statement

Revisar contratos manualmente é um processo lento, repetitivo e caro. O fluxo típico envolve ler a minuta inteira, identificar cláusulas problemáticas, redigir sugestões de wording alternativo, e muitas vezes ainda repassar para um advogado. Em startups, quem faz isso é o founder ou o comercial — pessoas cujo tempo deveria estar direcionado ao crescimento do negócio.

### Problem Impact

- **Tempo**: horas gastas por contrato, multiplicadas por cada deal em pipeline
- **Custo**: horas de advogado terceirizado que uma startup early-stage não pode bancar
- **Risco**: cláusulas prejudiciais passam despercebidas por falta de expertise jurídica
- **Velocidade de negócio**: deals atrasam porque a revisão de contrato é gargalo

### Why Existing Solutions Fall Short

- Ferramentas enterprise (Ironclad, SpotDraft) são caras e complexas demais para startups
- Usar ChatGPT/Claude manualmente funciona, mas é trabalhoso: colar trechos, prompt engineering, consolidar respostas
- Nenhuma solução usa múltiplos modelos como comitê para aumentar a confiança dos achados
- A maioria não gera a minuta de volta com alterações propostas em formato prático (antes/depois)

### Proposed Solution

Um sistema que:
1. Recebe a minuta (.docx) + parâmetros (tipo de contrato, lado, jurisdição)
2. Parseia o documento em blocos estruturados (DocAST)
3. Envia para 5 LLMs diferentes em paralelo, cada uma analisando sob sua perspectiva
4. Consolida os achados, deduplica, e classifica por severidade
5. Gera uma **minuta comentada** com o trecho original e a redação proposta (antes/depois)
6. Gera um **relatório de riscos** com justificativa para cada apontamento

### Key Differentiators

- **Comitê multi-LLM**: 5 modelos distintos (GPT, Claude, Gemini, Mistral, Llama) analisando em paralelo — consenso entre modelos diferentes eleva a confiança
- **Output prático**: minuta de volta com antes/depois, não só um relatório genérico
- **Custo acessível**: pensado para startups, sem pricing enterprise
- **Justificativas transparentes**: cada achado vem com a razão de ter sido flagado
- **Agnóstico de provider**: adapter HTTP genérico permite trocar ou adicionar LLMs

---

## Target Users

### Primary Users

**1. Founder de Startup**
- **Contexto**: Fundador em empresa early-stage, negocia contratos de parceria, investimento, SaaS e NDAs. Sem formação jurídica, mas precisa entender e negociar cláusulas.
- **Dor atual**: Gasta horas lendo minutas, tentando identificar riscos, colando trechos no ChatGPT. Depois repassa para advogado externo e paga por horas que não pode bancar.
- **Motivação**: Fechar negócios rápido sem expor a empresa a riscos contratuais.
- **Sucesso**: Receber a minuta de volta com riscos apontados e sugestões de wording em minutos, com confiança suficiente para negociar direto com a contraparte.

**2. Comercial**
- **Contexto**: Responsável por deals com clientes e fornecedores. Recebe NDAs e contratos com frequência e precisa destravar o pipeline.
- **Dor atual**: Cada contrato que chega trava o deal. Depende do jurídico ou do founder para revisar, e isso atrasa.
- **Motivação**: Velocidade — fechar deals sem gargalo de revisão contratual.
- **Sucesso**: Upload do .docx, selecionar tipo de contrato e lado, e ter a análise pronta para negociar no mesmo dia.

**3. Advogado In-House (empresa de menor porte)**
- **Contexto**: Jurídico enxuto (1-3 pessoas) que recebe mais demandas do que consegue tratar. Contratos de diversas áreas chegam ao mesmo tempo.
- **Dor atual**: Não dá conta do volume. Precisa priorizar e acaba deixando revisões menos críticas de lado ou fazendo superficialmente.
- **Motivação**: Ter um primeiro filtro inteligente que entrega a minuta pré-analisada para ele só validar e ajustar.
- **Sucesso**: Receber o contrato já com os riscos mapeados, severidade classificada e sugestões de redação, reduzindo o tempo de revisão drasticamente.

### Secondary Users

**4. Contraparte (Fase 3)**
- Na visão futura da plataforma, a contraparte contratual recebe acesso ao ambiente para discutir alterações de forma centralizada, eliminando o ping-pong de emails e versões de arquivo.

### User Journey (MVP)

1. **Upload**: Usuário faz upload do .docx e seleciona parâmetros (tipo de contrato, lado, jurisdição)
2. **Análise**: O comitê de 5 LLMs analisa em paralelo, cada uma sob sua perspectiva
3. **Resultado**: Recebe a minuta comentada (antes/depois por cláusula) + relatório de riscos com justificativas
4. **Ação**: Usa o output para negociar com a contraparte ou validar com advogado

### Visão de Evolução da Plataforma

| Fase | Capacidade |
|---|---|
| **MVP (Fase 1)** | Upload .docx, análise multi-LLM, minuta comentada (antes/depois) + relatório de riscos |
| **Fase 2** | Edição e tratamento de mudanças dentro da plataforma, versionamento do documento |
| **Fase 3** | Acesso compartilhado com contraparte, discussão centralizada, histórico de negociação |

---

## Success Metrics

### Métricas de Usuário

| Métrica | Meta | Como medir |
|---|---|---|
| **Tempo de análise** | < 2 minutos por contrato | Timestamp do upload ao resultado |
| **Qualidade percebida** | Feedback positivo majoritário | Avaliação do usuário (bom/ruim) por análise |
| **Qualidade real** | Melhoria contínua | Agente de QA que analisa feedbacks e ajusta a qualidade do pipeline |
| **Adoção do output** | Usuário usa as sugestões na negociação | Tracking de downloads da minuta comentada |

### Business Objectives

| Objetivo | Indicador |
|---|---|
| **Redução de tempo** | Horas/mês economizadas por empresa em revisão de contratos |
| **Substituição de custo** | Redução de horas de advogado terceirizado |
| **Engajamento** | Contratos analisados por empresa por mês (recorrência) |
| **Crescimento** | Novas empresas usando a plataforma mês a mês |

### Key Performance Indicators

- **KPI #1 — Velocidade**: 95% das análises concluídas em < 2 minutos
- **KPI #2 — Satisfação**: > 80% de feedbacks positivos (bom) nos primeiros 3 meses
- **KPI #3 — Economia de tempo**: Empresa reporta redução de pelo menos 70% do tempo gasto em revisão contratual
- **KPI #4 — Retenção**: > 60% dos usuários ativos no mês anterior continuam usando no mês seguinte
- **KPI #5 — Quality loop**: Agente de QA identifica padrões de feedback negativo e gera ajustes nos prompts/pipeline

### Nota Arquitetural

O feedback do usuário (bom/ruim) alimenta um **agente de controle de qualidade** que analisa os padrões de insatisfação e propõe ajustes no pipeline. Isso cria um loop de melhoria contínua que aumenta a precisão dos achados ao longo do tempo.

---

## MVP Scope

### Core Features

1. **Upload de .docx** + seleção de parâmetros (tipo: NDA/SaaS/parceria, lado: contratante/contratado, jurisdição)
2. **Parsing DocAST** — mammoth converte o .docx em blocos estruturados com IDs
3. **Comitê de 5 LLMs** — GPT, Claude, Gemini, Mistral, Llama analisam em paralelo via APIs
4. **Consolidação** — deduplicação de achados, classificação por severidade, PatchPlan
5. **Minuta comentada (.docx)** — documento com antes/depois por cláusula + justificativas
6. **Relatório de riscos (.json)** — achados consolidados com severidade e justificativa
7. **UI mínima** — upload, status do processamento, download dos resultados
8. **Feedback do usuário** — bom/ruim por análise (alimenta o quality loop futuro)

### Out of Scope for MVP

- Track Changes reais no Word (complexidade XML alta)
- Edição de mudanças dentro da plataforma (Fase 2)
- Acesso compartilhado com contraparte (Fase 3)
- Agente de QA automatizado (MVP coleta feedback, mas o loop de melhoria é manual)
- OCR/PDF
- Playbooks YAML customizáveis pelo usuário (MVP usa playbooks fixos)
- Autenticação/multi-tenant (MVP roda local ou single-user)

### MVP Success Criteria

- Pipeline completo rodando: upload → análise → minuta comentada + relatório
- 5 LLMs respondendo em paralelo e consolidação deduplicando corretamente
- Análise concluída em < 2 minutos para contrato médio
- output_suggested.docx com antes/depois legível e acionável
- final_report.json com todos os achados validados por Zod
- Feedback do usuário coletado por análise

### Future Vision

| Fase | Capacidades |
|---|---|
| **Fase 2** | Edição e tratamento de mudanças dentro da plataforma, versionamento do documento |
| **Fase 3** | Acesso compartilhado com contraparte, discussão centralizada, histórico de negociação |
| **Fase 4+** | Agente de QA automatizado com loop de melhoria, playbooks customizáveis, OCR/PDF, track changes reais, multi-tenant, templates de cláusulas por tipo de contrato |
