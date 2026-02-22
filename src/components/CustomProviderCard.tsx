'use client';

import { useState } from 'react';
import { CircleDot, Trash2, Pencil, Globe, Key, Cpu } from 'lucide-react';

interface CustomProvider {
  name: string;
  displayName: string | null;
  maskedKey: string | null;
  baseUrl: string | null;
  selectedModel: string;
}

interface CustomProviderCardProps {
  provider: CustomProvider;
  onEdit: (provider: CustomProvider) => void;
  onRemoved: () => void;
}

export function CustomProviderCard({ provider, onEdit, onRemoved }: CustomProviderCardProps) {
  const [removing, setRemoving] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  async function handleRemove() {
    setShowConfirm(false);
    setRemoving(true);

    try {
      const res = await fetch('/api/config/custom-providers', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providerName: provider.name }),
      });

      if (res.ok) {
        onRemoved();
      }
    } catch {
      // silently fail
    } finally {
      setRemoving(false);
    }
  }

  return (
    <>
      <div
        className="rounded-xl p-4 shadow-sm"
        style={{
          backgroundColor: 'var(--md-surface-container-low)',
          border: '1px solid var(--md-outline-variant)',
        }}
      >
        {/* Header */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-base font-medium" style={{ color: 'var(--md-on-surface)' }}>
            {provider.displayName ?? provider.name}
          </span>
          <span
            className="flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium"
            style={{
              backgroundColor: 'var(--md-primary-container)',
              color: 'var(--md-on-primary-container)',
            }}
          >
            <CircleDot className="h-3 w-3" />
            Ativo
          </span>
          <code
            className="rounded px-1.5 py-0.5 text-[11px] font-mono"
            style={{ backgroundColor: 'var(--md-surface-variant)', color: 'var(--md-on-surface-variant)' }}
          >
            {provider.name}
          </code>
        </div>

        {/* Details */}
        <div className="mt-3 space-y-1.5">
          <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--md-on-surface-variant)' }}>
            <Key className="h-3.5 w-3.5 shrink-0" />
            <span>API Key:</span>
            <code className="rounded px-1.5 py-0.5 font-mono" style={{ backgroundColor: 'var(--md-surface)', color: 'var(--md-on-surface)' }}>
              {provider.maskedKey ?? '***'}
            </code>
          </div>
          <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--md-on-surface-variant)' }}>
            <Globe className="h-3.5 w-3.5 shrink-0" />
            <span>URL:</span>
            <code className="truncate rounded px-1.5 py-0.5 font-mono" style={{ backgroundColor: 'var(--md-surface)', color: 'var(--md-on-surface)' }}>
              {provider.baseUrl}
            </code>
          </div>
          <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--md-on-surface-variant)' }}>
            <Cpu className="h-3.5 w-3.5 shrink-0" />
            <span>Modelo:</span>
            <code className="rounded px-1.5 py-0.5 font-mono" style={{ backgroundColor: 'var(--md-surface)', color: 'var(--md-on-surface)' }}>
              {provider.selectedModel}
            </code>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-3 flex gap-2">
          <button
            onClick={() => onEdit(provider)}
            className="flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-opacity"
            style={{ borderColor: 'var(--md-primary)', color: 'var(--md-primary)' }}
          >
            <Pencil className="h-3 w-3" />
            Editar
          </button>
          <button
            onClick={() => setShowConfirm(true)}
            disabled={removing}
            className="flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-opacity disabled:opacity-50"
            style={{ borderColor: 'var(--md-error)', color: 'var(--md-error)' }}
          >
            <Trash2 className="h-3 w-3" />
            {removing ? 'Removendo...' : 'Remover'}
          </button>
        </div>
      </div>

      {/* Remove confirmation dialog */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" role="dialog" aria-modal="true">
          <div
            className="mx-4 max-w-sm rounded-2xl p-6 shadow-lg"
            style={{ backgroundColor: 'var(--md-surface-container-high)' }}
          >
            <h3 className="mb-2 text-lg font-medium" style={{ color: 'var(--md-on-surface)' }}>
              Remover Provider
            </h3>
            <p className="mb-4 text-sm" style={{ color: 'var(--md-on-surface-variant)' }}>
              Tem certeza que deseja remover <strong>{provider.displayName ?? provider.name}</strong>? Ele não participará mais das análises.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowConfirm(false)}
                className="rounded-full px-4 py-2 text-sm font-medium"
                style={{ color: 'var(--md-primary)' }}
              >
                Cancelar
              </button>
              <button
                onClick={handleRemove}
                className="rounded-full px-4 py-2 text-sm font-medium"
                style={{ backgroundColor: 'var(--md-error)', color: 'var(--md-on-error)' }}
              >
                Remover
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
