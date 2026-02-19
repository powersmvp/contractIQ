'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, X, Sparkles, Settings } from 'lucide-react';
import { Disclaimer } from '@/components/Disclaimer';
import { UploadForm } from '@/components/UploadForm';
import { JobList } from '@/components/JobList';

const ONBOARDING_KEY = 'onboarding-dismissed';

function OnboardingBanner({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div
      className="relative rounded-xl p-4"
      style={{ backgroundColor: 'var(--md-primary-container)', color: 'var(--md-on-primary-container)' }}
    >
      <button
        onClick={onDismiss}
        className="absolute right-2 top-2 rounded-full p-1 transition-colors hover:brightness-90"
        aria-label="Fechar introdução"
        style={{ color: 'var(--md-on-primary-container)' }}
      >
        <X className="h-4 w-4" />
      </button>
      <div className="flex items-start gap-3 pr-6">
        <Sparkles className="mt-0.5 h-5 w-5 shrink-0" />
        <div className="space-y-1 text-sm">
          <p className="font-semibold">Bem-vindo ao contract-agent!</p>
          <p>Envie um contrato .docx e 5 IAs irão analisá-lo em paralelo, debater entre si e gerar um relatório consolidado com achados e sugestões de redação.</p>
          <p>
            Primeiro,{' '}
            <a href="/config" className="font-medium underline">configure suas chaves de API</a>
            {' '}(mínimo 3 serviços).
          </p>
        </div>
      </div>
    </div>
  );
}

function ProviderWarning({ activeCount }: { activeCount: number }) {
  if (activeCount >= 3) return null;
  return (
    <div
      className="flex items-center gap-3 rounded-xl p-3"
      role="alert"
      style={{ backgroundColor: 'var(--md-error-container)', color: 'var(--md-on-error-container)' }}
    >
      <AlertTriangle className="h-5 w-5 shrink-0" />
      <p className="text-sm">
        <span className="font-medium">{activeCount}/5 serviços de IA ativos</span> — mínimo de 3 necessários.{' '}
        <a href="/config" className="font-medium underline inline-flex items-center gap-1">
          <Settings className="inline h-3.5 w-3.5" />
          Configurar
        </a>
      </p>
    </div>
  );
}

export default function HomePage() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [providerCount, setProviderCount] = useState<number | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && !localStorage.getItem(ONBOARDING_KEY)) {
      setShowOnboarding(true);
    }
  }, []);

  useEffect(() => {
    fetch('/api/config/providers')
      .then((res) => res.json())
      .then((data) => {
        const active = (data.data?.providers ?? []).filter((p: { configured: boolean }) => p.configured).length;
        setProviderCount(active);
      })
      .catch(() => {});
  }, []);

  function dismissOnboarding() {
    localStorage.setItem(ONBOARDING_KEY, '1');
    setShowOnboarding(false);
  }

  function handleJobCreated() {
    setRefreshTrigger((prev) => prev + 1);
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold" style={{ color: 'var(--md-on-surface)' }}>
          contract-agent
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--md-on-surface-variant)' }}>
          Análise inteligente de contratos com comitê de 5 Inteligências Artificiais.
        </p>
      </div>

      {showOnboarding && <OnboardingBanner onDismiss={dismissOnboarding} />}
      {providerCount !== null && <ProviderWarning activeCount={providerCount} />}

      <Disclaimer />
      <UploadForm onJobCreated={handleJobCreated} />

      <div>
        <h2 className="mb-3 text-lg font-medium" style={{ color: 'var(--md-on-surface)' }}>
          Análises Recentes
        </h2>
        <JobList refreshTrigger={refreshTrigger} />
      </div>
    </div>
  );
}
