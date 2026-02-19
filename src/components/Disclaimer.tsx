'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';

const STORAGE_KEY = 'disclaimer-dismissed';

export function Disclaimer() {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== 'true') {
      setDismissed(false);
    }
  }, []);

  function handleDismiss() {
    localStorage.setItem(STORAGE_KEY, 'true');
    setDismissed(true);
  }

  if (dismissed) return null;

  return (
    <div
      role="note"
      aria-label="Aviso legal"
      className="relative flex items-start gap-3 rounded-xl border p-4 text-sm"
      style={{
        borderColor: 'var(--md-outline-variant)',
        backgroundColor: 'var(--md-surface-container-low)',
        color: 'var(--md-on-surface-variant)',
      }}
    >
      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" style={{ color: 'var(--severity-high)' }} />
      <p>
        <strong>Aviso Legal:</strong> Esta análise não substitui consultoria jurídica profissional.
        Os resultados são sugestivos e devem ser validados por um advogado qualificado.
        O contrato enviado será processado por APIs externas de inteligência artificial.
      </p>
      <button
        onClick={handleDismiss}
        aria-label="Fechar aviso"
        className="absolute top-2 right-2 rounded-md p-1 transition-colors hover:opacity-80"
        style={{ color: 'var(--md-on-surface-variant)' }}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
