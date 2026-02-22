'use client';

import { useState, useEffect } from 'react';
import { Save, X } from 'lucide-react';

interface AddCustomProviderFormProps {
  onSaved: () => void;
  onCancel: () => void;
  editingProvider?: {
    name: string;
    displayName: string | null;
    maskedKey: string | null;
    baseUrl: string | null;
    selectedModel: string;
  } | null;
}

function toSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 30);
}

export function AddCustomProviderForm({ onSaved, onCancel, editingProvider }: AddCustomProviderFormProps) {
  const [displayName, setDisplayName] = useState(editingProvider?.displayName ?? '');
  const [slug, setSlug] = useState(editingProvider?.name ?? '');
  const [slugManual, setSlugManual] = useState(!!editingProvider);
  const [baseUrl, setBaseUrl] = useState(editingProvider?.baseUrl ?? '');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState(editingProvider?.selectedModel ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = !!editingProvider;

  // Auto-generate slug from display name
  useEffect(() => {
    if (!slugManual && !isEditing) {
      setSlug(toSlug(displayName));
    }
  }, [displayName, slugManual, isEditing]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!slug.trim() || !displayName.trim() || !baseUrl.trim() || !model.trim()) return;
    if (!isEditing && !apiKey.trim()) return;

    setSaving(true);
    setError(null);

    try {
      const payload: Record<string, string> = {
        providerName: slug.trim(),
        displayName: displayName.trim(),
        apiKey: apiKey.trim() || (editingProvider ? 'KEEP_EXISTING' : ''),
        baseUrl: baseUrl.trim(),
        model: model.trim(),
      };

      // If editing without new key, we need to send the existing key
      // The backend upsert will handle this
      if (isEditing && !apiKey.trim()) {
        // Fetch the actual key is not possible from masked key,
        // so we require a new key on edit or send a sentinel
        // Actually, backend upsert requires apiKey. For edit, user must re-enter.
        setError('Para editar, insira a API key novamente.');
        setSaving(false);
        return;
      }

      const res = await fetch('/api/config/custom-providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok) {
        onSaved();
      } else {
        setError(data.error?.message ?? 'Falha ao salvar');
      }
    } catch {
      setError('Não foi possível conectar ao servidor.');
    } finally {
      setSaving(false);
    }
  }

  const inputStyle = {
    borderColor: 'var(--md-outline-variant)',
    backgroundColor: 'var(--md-surface)',
    color: 'var(--md-on-surface)',
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        {/* Display Name */}
        <div>
          <label className="mb-1 block text-xs font-medium" style={{ color: 'var(--md-on-surface-variant)' }}>
            Nome de exibição
          </label>
          <input
            type="text"
            placeholder="ex: Groq"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2"
            style={inputStyle}
            disabled={saving}
          />
        </div>

        {/* Slug */}
        <div>
          <label className="mb-1 block text-xs font-medium" style={{ color: 'var(--md-on-surface-variant)' }}>
            Slug (identificador)
          </label>
          <input
            type="text"
            placeholder="ex: groq"
            value={slug}
            onChange={(e) => { setSlug(e.target.value); setSlugManual(true); }}
            className="w-full rounded-md border px-3 py-2 text-sm font-mono outline-none focus:ring-2"
            style={inputStyle}
            disabled={saving || isEditing}
          />
        </div>
      </div>

      {/* Base URL */}
      <div>
        <label className="mb-1 block text-xs font-medium" style={{ color: 'var(--md-on-surface-variant)' }}>
          Base URL (OpenAI-compatible)
        </label>
        <input
          type="text"
          placeholder="ex: https://api.groq.com/openai/v1"
          value={baseUrl}
          onChange={(e) => setBaseUrl(e.target.value)}
          className="w-full rounded-md border px-3 py-2 text-sm font-mono outline-none focus:ring-2"
          style={inputStyle}
          disabled={saving}
        />
      </div>

      {/* API Key */}
      <div>
        <label className="mb-1 block text-xs font-medium" style={{ color: 'var(--md-on-surface-variant)' }}>
          API Key {isEditing && '(insira novamente para editar)'}
        </label>
        <input
          type="password"
          placeholder={isEditing ? 'Insira a chave novamente...' : 'Inserir API key...'}
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2"
          style={inputStyle}
          disabled={saving}
        />
      </div>

      {/* Model */}
      <div>
        <label className="mb-1 block text-xs font-medium" style={{ color: 'var(--md-on-surface-variant)' }}>
          Model ID
        </label>
        <input
          type="text"
          placeholder="ex: llama-3.3-70b-versatile"
          value={model}
          onChange={(e) => setModel(e.target.value)}
          className="w-full rounded-md border px-3 py-2 text-sm font-mono outline-none focus:ring-2"
          style={inputStyle}
          disabled={saving}
        />
      </div>

      {/* Error */}
      {error && (
        <p className="text-xs font-medium" style={{ color: 'var(--md-error)' }}>
          {error}
        </p>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving || !slug.trim() || !displayName.trim() || !baseUrl.trim() || !model.trim() || (!apiKey.trim() && !isEditing)}
          className="flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-opacity disabled:opacity-50"
          style={{ backgroundColor: 'var(--md-primary)', color: 'var(--md-on-primary)' }}
        >
          <Save className="h-4 w-4" />
          {saving ? 'Salvando...' : isEditing ? 'Atualizar' : 'Adicionar'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition-opacity disabled:opacity-50"
          style={{ borderColor: 'var(--md-outline)', color: 'var(--md-on-surface-variant)' }}
        >
          <X className="h-4 w-4" />
          Cancelar
        </button>
      </div>
    </form>
  );
}
