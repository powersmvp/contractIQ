'use client';

import { useState } from 'react';
import { CheckCircle, XCircle, Save, ShieldCheck, KeyRound, Trash2 } from 'lucide-react';

interface ModelOption {
  id: string;
  label: string;
  tier: 'economy' | 'standard' | 'premium';
  isDefault: boolean;
}

interface ProviderKeyFormProps {
  providerName: string;
  maskedKey: string | null;
  selectedModel: string;
  availableModels: ModelOption[];
  onUpdated: () => void;
}

const tierBadge: Record<string, string> = {
  economy: '$',
  standard: '$$',
  premium: '$$$',
};

export function ProviderKeyForm({ providerName, maskedKey, selectedModel, availableModels, onUpdated }: ProviderKeyFormProps) {
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [checking, setChecking] = useState(false);
  const [changingModel, setChangingModel] = useState(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'warning'; text: string } | null>(null);

  async function handleSave(validate: boolean) {
    if (!apiKey.trim()) return;
    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch('/api/config/providers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: providerName, apiKey: apiKey.trim(), validate }),
      });

      const data = await res.json();

      if (res.ok) {
        const result = data.data;
        if (result.validated) {
          setMessage({ type: 'success', text: 'Chave salva e validada com sucesso!' });
        } else if (result.warning) {
          setMessage({ type: 'warning', text: result.warning });
        } else {
          setMessage({ type: 'success', text: 'Chave salva com sucesso!' });
        }
        onUpdated();
        setApiKey('');
      } else {
        setMessage({ type: 'error', text: data.error?.message ?? 'Falha ao salvar' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Não foi possível conectar ao servidor. Verifique sua internet e tente novamente.' });
    } finally {
      setLoading(false);
    }
  }

  async function handleRemove() {
    setShowRemoveConfirm(false);
    setRemoving(true);
    setMessage(null);

    try {
      const res = await fetch('/api/config/providers', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: providerName }),
      });

      if (res.ok) {
        setMessage({ type: 'success', text: 'Chave removida.' });
        onUpdated();
      }
    } catch {
      setMessage({ type: 'error', text: 'Não foi possível remover a chave. Tente novamente.' });
    } finally {
      setRemoving(false);
    }
  }

  async function handleCheckKey() {
    setChecking(true);
    setMessage(null);

    try {
      const res = await fetch('/api/config/providers');
      const data = await res.json();
      const provider = data.data.providers.find((p: { name: string }) => p.name === providerName);

      if (provider?.maskedKey) {
        setMessage({ type: 'success', text: `Chave salva: ${provider.maskedKey}` });
      } else {
        setMessage({ type: 'warning', text: 'Nenhuma chave salva para este provider.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Não foi possível verificar a chave. Verifique sua conexão.' });
    } finally {
      setChecking(false);
    }
  }

  async function handleModelChange(modelId: string) {
    setChangingModel(true);
    setMessage(null);

    try {
      const res = await fetch('/api/config/providers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: providerName, model: modelId }),
      });

      if (res.ok) {
        setMessage({ type: 'success', text: 'Modelo atualizado!' });
        onUpdated();
      } else {
        const data = await res.json();
        setMessage({ type: 'error', text: data.error?.message ?? 'Falha ao atualizar modelo' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Não foi possível atualizar o modelo. Tente novamente.' });
    } finally {
      setChangingModel(false);
    }
  }

  const messageColor = {
    success: 'var(--md-primary)',
    error: 'var(--md-error)',
    warning: 'var(--severity-high)',
  };

  return (
    <div className="mt-3 space-y-2">
      {/* Saved key indicator */}
      {maskedKey ? (
        <div
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs"
          style={{ backgroundColor: 'var(--md-primary-container)', color: 'var(--md-on-primary-container)' }}
        >
          <CheckCircle className="h-4 w-4" />
          <span className="font-medium">Chave salva:</span>
          <code className="rounded px-2 py-0.5 font-mono" style={{ backgroundColor: 'var(--md-surface)', color: 'var(--md-on-surface)' }}>
            {maskedKey}
          </code>
          <button
            onClick={() => setShowRemoveConfirm(true)}
            disabled={removing}
            className="ml-auto flex items-center gap-1 text-xs underline transition-opacity disabled:opacity-50"
            style={{ color: 'var(--md-error)' }}
            aria-label="Remover chave de API"
          >
            <Trash2 className="h-3 w-3" />
            {removing ? 'Removendo...' : 'Remover'}
          </button>
        </div>
      ) : (
        <div
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs"
          style={{ backgroundColor: 'var(--md-error-container)', color: 'var(--md-on-error-container)' }}
        >
          <XCircle className="h-4 w-4" />
          <span className="font-medium">Nenhuma chave configurada</span>
        </div>
      )}

      {/* Model selector */}
      <div className="flex items-center gap-2">
        <label className="text-xs font-medium" style={{ color: 'var(--md-on-surface-variant)' }}>
          Modelo:
        </label>
        <select
          value={selectedModel}
          onChange={(e) => handleModelChange(e.target.value)}
          disabled={changingModel}
          className="rounded-md border px-2 py-1.5 text-sm outline-none transition-colors disabled:opacity-50"
          style={{
            borderColor: 'var(--md-outline-variant)',
            backgroundColor: 'var(--md-surface)',
            color: 'var(--md-on-surface)',
          }}
        >
          {availableModels.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label} ({tierBadge[m.tier]})
            </option>
          ))}
        </select>
        {changingModel && (
          <span className="text-xs" style={{ color: 'var(--md-on-surface-variant)' }}>
            Salvando...
          </span>
        )}
      </div>

      {/* Key input */}
      <div className="flex gap-2">
        <input
          type="password"
          placeholder={maskedKey ? 'Substituir chave...' : 'Inserir API key...'}
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          className="flex-1 rounded-md border px-3 py-2 text-sm outline-none transition-colors focus:ring-2"
          style={{
            borderColor: 'var(--md-outline-variant)',
            backgroundColor: 'var(--md-surface)',
            color: 'var(--md-on-surface)',
          }}
          disabled={loading}
        />
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        <button
          onClick={() => handleSave(false)}
          disabled={loading || !apiKey.trim()}
          className="flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-opacity disabled:opacity-50"
          style={{
            backgroundColor: 'var(--md-primary)',
            color: 'var(--md-on-primary)',
          }}
        >
          <Save className="h-4 w-4" />
          {loading ? 'Salvando...' : 'Salvar'}
        </button>
        <button
          onClick={() => handleSave(true)}
          disabled={loading || !apiKey.trim()}
          className="flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition-opacity disabled:opacity-50"
          style={{
            borderColor: 'var(--md-primary)',
            color: 'var(--md-primary)',
          }}
        >
          <ShieldCheck className="h-4 w-4" />
          Salvar e Validar
        </button>
        <button
          onClick={handleCheckKey}
          disabled={checking}
          className="flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition-opacity disabled:opacity-50"
          style={{
            borderColor: 'var(--md-outline)',
            color: 'var(--md-on-surface-variant)',
          }}
        >
          <KeyRound className="h-4 w-4" />
          {checking ? 'Verificando...' : 'Verificar Chave'}
        </button>
      </div>

      {/* Message */}
      <div aria-live="polite">
        {message && (
          <p className="text-xs font-medium" style={{ color: messageColor[message.type] }}>
            {message.text}
          </p>
        )}
      </div>

      {/* Remove confirmation dialog */}
      {showRemoveConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" role="dialog" aria-modal="true" aria-labelledby="remove-key-title">
          <div
            className="mx-4 max-w-sm rounded-2xl p-6 shadow-lg"
            style={{ backgroundColor: 'var(--md-surface-container-high)' }}
          >
            <h3 id="remove-key-title" className="mb-2 text-lg font-medium" style={{ color: 'var(--md-on-surface)' }}>
              Remover Chave de API
            </h3>
            <p className="mb-4 text-sm" style={{ color: 'var(--md-on-surface-variant)' }}>
              Tem certeza? O provider ficará inativo e não participará das análises até uma nova chave ser configurada.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowRemoveConfirm(false)}
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
    </div>
  );
}
