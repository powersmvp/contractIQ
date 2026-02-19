'use client';

import { CircleDot, CircleOff, Coins, Star, Crown } from 'lucide-react';

interface ModelOption {
  id: string;
  label: string;
  tier: 'economy' | 'standard' | 'premium';
  isDefault: boolean;
}

interface ProviderStatusProps {
  name: string;
  status: string;
  configured: boolean;
  selectedModel: string;
  availableModels: ModelOption[];
}

const tierLabel: Record<string, string> = {
  economy: 'Econômico',
  standard: 'Padrão',
  premium: 'Premium',
};

const tierColor: Record<string, { bg: string; fg: string }> = {
  economy: { bg: 'var(--md-tertiary-container, #e0f2f1)', fg: 'var(--md-on-tertiary-container, #004d40)' },
  standard: { bg: 'var(--md-secondary-container, #e3f2fd)', fg: 'var(--md-on-secondary-container, #0d47a1)' },
  premium: { bg: 'var(--md-error-container, #fce4ec)', fg: 'var(--md-on-error-container, #b71c1c)' },
};

const TierIcon: Record<string, typeof Coins> = {
  economy: Coins,
  standard: Star,
  premium: Crown,
};

export function ProviderStatus({ name, status, configured, selectedModel, availableModels }: ProviderStatusProps) {
  const displayName: Record<string, string> = {
    gpt: 'OpenAI GPT',
    claude: 'Anthropic Claude',
    gemini: 'Google Gemini',
    mistral: 'Mistral AI',
    llama: 'Meta Llama',
  };

  const modelInfo = availableModels.find((m) => m.id === selectedModel);
  const StatusIcon = configured ? CircleDot : CircleOff;
  const TIcon = modelInfo ? TierIcon[modelInfo.tier] : null;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-base font-medium" style={{ color: 'var(--md-on-surface)' }}>
        {displayName[name] ?? name}
      </span>
      <span
        className="flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium"
        style={{
          backgroundColor: configured
            ? 'var(--md-primary-container)'
            : 'var(--md-surface-variant)',
          color: configured
            ? 'var(--md-on-primary-container)'
            : 'var(--md-on-surface-variant)',
        }}
      >
        <StatusIcon className="h-3 w-3" />
        {status === 'active' ? 'Ativo' : 'Inativo'}
      </span>
      {modelInfo && (
        <>
          <span className="text-xs" style={{ color: 'var(--md-on-surface-variant)' }}>
            {modelInfo.label}
          </span>
          <span
            className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium"
            style={{
              backgroundColor: tierColor[modelInfo.tier].bg,
              color: tierColor[modelInfo.tier].fg,
            }}
          >
            {TIcon && <TIcon className="h-3 w-3" />}
            {tierLabel[modelInfo.tier]}
          </span>
        </>
      )}
    </div>
  );
}
