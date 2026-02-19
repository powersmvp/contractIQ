'use client';

import { useState } from 'react';
import { AlertTriangle, AlertCircle, Info, ShieldCheck, Shield, ShieldAlert, Bot, ChevronRight, Clipboard, Check } from 'lucide-react';

interface FindingCardProps {
  index: number;
  severity: string;
  original: string;
  suggested: string;
  justification: string;
  consensus: number;
  totalProviders: number;
  sources: string[];
  confidence?: 'strong' | 'moderate' | 'weak';
  debateNotes?: string;
}

const SEVERITY_STYLES: Record<string, { bg: string; text: string; label: string; icon: typeof AlertTriangle }> = {
  critical: { bg: 'var(--severity-critical-container)', text: 'var(--severity-critical)', label: 'Critico', icon: AlertTriangle },
  high: { bg: 'var(--severity-high-container)', text: 'var(--severity-high)', label: 'Alto', icon: AlertTriangle },
  medium: { bg: 'var(--severity-medium-container)', text: 'var(--severity-medium)', label: 'Medio', icon: AlertCircle },
  low: { bg: 'var(--severity-low-container)', text: 'var(--severity-low)', label: 'Baixo', icon: Info },
};

const CONFIDENCE_STYLES: Record<string, { bg: string; text: string; label: string; icon: typeof ShieldCheck }> = {
  strong: { bg: 'var(--confidence-strong-container)', text: 'var(--confidence-strong)', label: 'Consenso Forte', icon: ShieldCheck },
  moderate: { bg: 'var(--confidence-moderate-container)', text: 'var(--confidence-moderate)', label: 'Consenso Moderado', icon: Shield },
  weak: { bg: 'var(--confidence-weak-container)', text: 'var(--confidence-weak)', label: 'Consenso Fraco', icon: ShieldAlert },
};

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen).trimEnd() + '...';
}

export function FindingCard({ index, severity, original, suggested, justification, consensus, totalProviders, sources, confidence, debateNotes }: FindingCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const style = SEVERITY_STYLES[severity] ?? SEVERITY_STYLES.low;
  const confStyle = confidence ? CONFIDENCE_STYLES[confidence] : null;
  const SeverityIcon = style.icon;

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(suggested);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Fallback: silently fail if clipboard API is unavailable
    }
  };

  return (
    <div
      className="rounded-xl shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5"
      style={{
        backgroundColor: 'var(--md-surface-container-low)',
        border: '1px solid var(--md-outline-variant)',
      }}
    >
      {/* Collapsed header — always visible */}
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="flex w-full items-center gap-2 rounded-xl px-4 py-3 text-left transition-colors hover:brightness-95"
        style={{ backgroundColor: 'transparent' }}
        aria-expanded={expanded}
      >
        <ChevronRight
          className="h-4 w-4 shrink-0 transition-transform duration-200"
          style={{
            color: 'var(--md-on-surface-variant)',
            transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
          }}
        />

        <span className="text-sm font-medium shrink-0" style={{ color: 'var(--md-on-surface-variant)' }}>
          #{index + 1}
        </span>

        <span
          className="flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium shrink-0"
          style={{ backgroundColor: style.bg, color: style.text }}
        >
          <SeverityIcon className="h-3 w-3" />
          {style.label}
        </span>

        {confStyle && (
          <span
            className="flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium shrink-0"
            style={{ backgroundColor: confStyle.bg, color: confStyle.text }}
          >
            <confStyle.icon className="h-3 w-3" />
            {confStyle.label}
          </span>
        )}

        <span className="shrink-0 text-xs" style={{ color: 'var(--md-on-surface-variant)' }}>
          {consensus}/{totalProviders} IAs
        </span>

        {!expanded && (
          <span
            className="ml-1 min-w-0 truncate text-xs italic"
            style={{ color: 'var(--md-on-surface-variant)' }}
          >
            {truncate(original, 80)}
          </span>
        )}
      </button>

      {/* Expanded body */}
      {expanded && (
        <div className="px-4 pb-4 pt-0">
          <div className="space-y-2 text-sm">
            <div>
              <span className="font-medium" style={{ color: 'var(--md-error)' }}>Antes: </span>
              <span className="line-through" style={{ color: 'var(--md-on-surface-variant)' }}>{original}</span>
            </div>
            <div className="flex items-start gap-1">
              <div className="min-w-0">
                <span className="font-medium" style={{ color: 'var(--md-primary)' }}>Depois: </span>
                <span style={{ color: 'var(--md-on-surface)' }}>{suggested}</span>
              </div>
              <button
                type="button"
                onClick={handleCopy}
                className="ml-1 shrink-0 rounded p-1 transition-colors hover:brightness-90"
                style={{ backgroundColor: 'var(--md-surface-variant)', color: 'var(--md-on-surface-variant)' }}
                title="Copiar texto sugerido"
                aria-label="Copiar texto sugerido"
              >
                {copied ? (
                  <span className="flex items-center gap-0.5 text-[10px] font-medium" style={{ color: 'var(--md-primary)' }}>
                    <Check className="h-3.5 w-3.5" />
                    Copiado!
                  </span>
                ) : (
                  <Clipboard className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
            <div className="text-xs italic" style={{ color: 'var(--md-on-surface-variant)' }}>
              {justification}
            </div>
          </div>

          {debateNotes && (
            <div
              className="mt-2 rounded-lg px-3 py-2 text-xs"
              style={{ backgroundColor: 'var(--md-surface-variant)', color: 'var(--md-on-surface-variant)' }}
            >
              <span className="font-medium">Notas do debate: </span>
              {debateNotes}
            </div>
          )}

          <div className="mt-2 flex flex-wrap gap-1">
            {sources.map((source) => (
              <span
                key={source}
                className="flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-medium uppercase"
                style={{ backgroundColor: 'var(--md-surface-variant)', color: 'var(--md-on-surface-variant)' }}
              >
                <Bot className="h-2.5 w-2.5" />
                {source}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
