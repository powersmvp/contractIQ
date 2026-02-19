'use client';

import { useEffect, useState } from 'react';
import { ProviderStatus } from '@/components/ProviderStatus';
import { ProviderKeyForm } from '@/components/ProviderKeyForm';

interface ModelOption {
  id: string;
  label: string;
  tier: 'economy' | 'standard' | 'premium';
  isDefault: boolean;
}

interface Provider {
  name: string;
  status: string;
  configured: boolean;
  maskedKey: string | null;
  selectedModel: string;
  availableModels: ModelOption[];
}

export default function ConfigPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchProviders() {
    try {
      const res = await fetch('/api/config/providers');
      const data = await res.json();
      setProviders(data.data.providers);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchProviders();
  }, []);

  function handleUpdated() {
    fetchProviders();
  }

  const activeCount = providers.filter((p) => p.configured).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold" style={{ color: 'var(--md-on-surface)' }}>
          Configuração dos Serviços de IA
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--md-on-surface-variant)' }}>
          Configure as chaves de acesso dos 5 serviços de IA que compõem o comitê de análise.
        </p>
      </div>

      {/* Summary */}
      <div
        className="rounded-xl p-4"
        role="status"
        aria-live="polite"
        style={{
          backgroundColor: activeCount >= 3 ? 'var(--md-primary-container)' : 'var(--md-error-container)',
          color: activeCount >= 3 ? 'var(--md-on-primary-container)' : 'var(--md-on-error-container)',
        }}
      >
        <p className="text-sm font-medium">
          {activeCount}/5 serviços ativos
          {activeCount >= 3
            ? ' — Comitê operacional'
            : ' — Mínimo de 3 serviços necessários para análise'}
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12" role="status" aria-label="Carregando serviços de IA">
          <div
            className="h-8 w-8 animate-spin rounded-full border-4 border-t-transparent"
            style={{ borderColor: 'var(--md-outline-variant)', borderTopColor: 'transparent' }}
          />
        </div>
      ) : (
        <div className="grid gap-4">
          {providers.map((provider) => (
            <div
              key={provider.name}
              className="rounded-xl p-4 shadow-sm"
              style={{
                backgroundColor: 'var(--md-surface-container-low)',
                border: `1px solid var(--md-outline-variant)`,
              }}
            >
              <ProviderStatus
                name={provider.name}
                status={provider.status}
                configured={provider.configured}
                selectedModel={provider.selectedModel}
                availableModels={provider.availableModels}
              />
              <ProviderKeyForm
                providerName={provider.name}
                maskedKey={provider.maskedKey}
                selectedModel={provider.selectedModel}
                availableModels={provider.availableModels}
                onUpdated={handleUpdated}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
