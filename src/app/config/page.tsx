'use client';

import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { ProviderStatus } from '@/components/ProviderStatus';
import { ProviderKeyForm } from '@/components/ProviderKeyForm';
import { CustomProviderCard } from '@/components/CustomProviderCard';
import { AddCustomProviderForm } from '@/components/AddCustomProviderForm';

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
  isCustom: boolean;
  displayName: string | null;
  baseUrl: string | null;
}

interface EditingProvider {
  name: string;
  displayName: string | null;
  maskedKey: string | null;
  baseUrl: string | null;
  selectedModel: string;
}

export default function ConfigPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingProvider, setEditingProvider] = useState<EditingProvider | null>(null);

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

  function handleCustomSaved() {
    setShowAddForm(false);
    setEditingProvider(null);
    fetchProviders();
  }

  function handleEditCustom(provider: EditingProvider) {
    setEditingProvider(provider);
    setShowAddForm(true);
  }

  const nativeProviders = providers.filter((p) => !p.isCustom);
  const customProviders = providers.filter((p) => p.isCustom);
  const activeCount = providers.filter((p) => p.configured).length;
  const totalCount = providers.length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold" style={{ color: 'var(--md-on-surface)' }}>
          Configuração dos Serviços de IA
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--md-on-surface-variant)' }}>
          Configure as chaves de acesso dos serviços de IA que compõem o comitê de análise.
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
          {activeCount}/{totalCount} serviços ativos
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
        <>
          {/* Native providers */}
          <div className="grid gap-4">
            {nativeProviders.map((provider) => (
              <div
                key={provider.name}
                className="rounded-xl p-4 shadow-sm"
                style={{
                  backgroundColor: 'var(--md-surface-container-low)',
                  border: '1px solid var(--md-outline-variant)',
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

          {/* Custom Providers Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-medium" style={{ color: 'var(--md-on-surface)' }}>
                  Outras LLMs (OpenAI-Compatível)
                </h2>
                <p className="mt-0.5 text-xs" style={{ color: 'var(--md-on-surface-variant)' }}>
                  Adicione providers genéricos que seguem o formato OpenAI /chat/completions.
                </p>
              </div>
              {!showAddForm && (
                <button
                  onClick={() => { setEditingProvider(null); setShowAddForm(true); }}
                  className="flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-opacity"
                  style={{ backgroundColor: 'var(--md-primary)', color: 'var(--md-on-primary)' }}
                >
                  <Plus className="h-4 w-4" />
                  Adicionar Provider
                </button>
              )}
            </div>

            {/* Add/Edit form */}
            {showAddForm && (
              <div
                className="rounded-xl p-4 shadow-sm"
                style={{
                  backgroundColor: 'var(--md-surface-container-low)',
                  border: '1px solid var(--md-outline-variant)',
                }}
              >
                <h3 className="mb-3 text-sm font-medium" style={{ color: 'var(--md-on-surface)' }}>
                  {editingProvider ? `Editar: ${editingProvider.displayName ?? editingProvider.name}` : 'Novo Provider'}
                </h3>
                <AddCustomProviderForm
                  onSaved={handleCustomSaved}
                  onCancel={() => { setShowAddForm(false); setEditingProvider(null); }}
                  editingProvider={editingProvider}
                />
              </div>
            )}

            {/* Custom provider cards */}
            {customProviders.length > 0 && (
              <div className="grid gap-4">
                {customProviders.map((provider) => (
                  <CustomProviderCard
                    key={provider.name}
                    provider={provider}
                    onEdit={handleEditCustom}
                    onRemoved={handleUpdated}
                  />
                ))}
              </div>
            )}

            {customProviders.length === 0 && !showAddForm && (
              <p className="text-xs" style={{ color: 'var(--md-on-surface-variant)' }}>
                Nenhum provider genérico configurado.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
