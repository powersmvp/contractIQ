'use client';

import { useState } from 'react';
import { ChevronRight, HelpCircle } from 'lucide-react';

interface FaqItem {
  question: string;
  answer: string;
}

const FAQ_SECTIONS: { title: string; items: FaqItem[] }[] = [
  {
    title: 'Como funciona',
    items: [
      {
        question: 'O que o contract-agent faz?',
        answer:
          'O contract-agent analisa contratos .docx usando um comitê de 5 Inteligências Artificiais (GPT, Claude, Gemini, Mistral e Llama). Cada IA analisa o contrato de forma independente, depois elas debatem entre si e geram um veredito final consolidado com achados e sugestões de redação.',
      },
      {
        question: 'Quais tipos de contrato são suportados?',
        answer:
          'Atualmente suportamos NDA (Acordo de Confidencialidade), SaaS (Software como Serviço) e contratos de Parceria. Cada tipo tem análises específicas para suas cláusulas mais comuns.',
      },
      {
        question: 'Qual o formato aceito?',
        answer:
          'Apenas arquivos .docx (Microsoft Word). PDFs e outros formatos não são suportados no momento. O arquivo deve ter no máximo 5MB.',
      },
      {
        question: 'Quanto tempo leva uma análise?',
        answer:
          'Geralmente entre 1 e 3 minutos, dependendo do tamanho do contrato e da velocidade de resposta das IAs. O progresso é mostrado em tempo real na tela.',
      },
    ],
  },
  {
    title: 'Resultados e achados',
    items: [
      {
        question: 'O que significam os níveis de severidade?',
        answer:
          'Crítico: cláusula pode causar prejuízo significativo ou invalidade contratual. Alto: risco relevante que precisa de atenção. Médio: ponto de melhoria importante. Baixo: sugestão de refinamento textual.',
      },
      {
        question: 'O que é o consenso entre IAs?',
        answer:
          'Mostra quantas das 5 IAs concordaram com aquele achado. Consenso forte (4-5 IAs) indica alta confiança. Consenso moderado (3 IAs) é confiável. Consenso fraco (2 IAs) merece atenção mas pode ser menos relevante.',
      },
      {
        question: 'Posso confiar nas sugestões de redação?',
        answer:
          'As sugestões são geradas por IAs e servem como ponto de partida. Sempre revise com um advogado antes de aplicar qualquer alteração. O contract-agent é uma ferramenta de apoio, não substitui aconselhamento jurídico.',
      },
    ],
  },
  {
    title: 'Configuração',
    items: [
      {
        question: 'Quantos serviços de IA preciso configurar?',
        answer:
          'Mínimo de 3 dos 5 serviços (GPT, Claude, Gemini, Mistral, Llama). Quanto mais serviços configurados, mais completa é a análise e mais confiável o consenso.',
      },
      {
        question: 'Como configuro as chaves de API?',
        answer:
          'Acesse a página de Configuração no menu lateral. Para cada serviço, insira sua chave de API obtida no site do provedor. As chaves são armazenadas de forma segura no servidor.',
      },
      {
        question: 'Posso escolher o modelo de cada IA?',
        answer:
          'Sim. Na página de Configuração, cada provedor mostra os modelos disponíveis organizados por tier (economy, standard, premium). Modelos premium são mais precisos mas mais caros.',
      },
    ],
  },
  {
    title: 'Exportação e downloads',
    items: [
      {
        question: 'Quais formatos de exportação estão disponíveis?',
        answer:
          'Após a análise, você pode baixar: a minuta revisada (.docx) com as sugestões aplicadas, o relatório completo (.json) para integração com outros sistemas, e uma planilha Excel (.xlsx) para análise manual.',
      },
      {
        question: 'Por quanto tempo os resultados ficam disponíveis?',
        answer:
          'Os resultados ficam disponíveis por um período limitado. Recomendamos baixar os arquivos assim que a análise for concluída.',
      },
    ],
  },
];

function FaqAccordion({ item }: { item: FaqItem }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="rounded-lg"
      style={{ border: '1px solid var(--md-outline-variant)' }}
    >
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-medium transition-colors"
        style={{ color: 'var(--md-on-surface)' }}
        aria-expanded={open}
      >
        <ChevronRight
          className="h-4 w-4 shrink-0 transition-transform duration-200"
          style={{
            color: 'var(--md-on-surface-variant)',
            transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
          }}
        />
        {item.question}
      </button>
      {open && (
        <div
          className="px-4 pb-3 text-sm leading-relaxed"
          style={{ color: 'var(--md-on-surface-variant)' }}
        >
          {item.answer}
        </div>
      )}
    </div>
  );
}

export default function HelpPage() {
  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-2">
          <HelpCircle className="h-6 w-6" style={{ color: 'var(--md-primary)' }} />
          <h1 className="text-2xl font-semibold" style={{ color: 'var(--md-on-surface)' }}>
            Ajuda
          </h1>
        </div>
        <p className="mt-1 text-sm" style={{ color: 'var(--md-on-surface-variant)' }}>
          Perguntas frequentes sobre o contract-agent.
        </p>
      </div>

      {FAQ_SECTIONS.map((section) => (
        <div key={section.title} className="space-y-3">
          <h2
            className="text-sm font-semibold uppercase tracking-wider"
            style={{ color: 'var(--md-on-surface-variant)' }}
          >
            {section.title}
          </h2>
          <div className="space-y-2">
            {section.items.map((item) => (
              <FaqAccordion key={item.question} item={item} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
