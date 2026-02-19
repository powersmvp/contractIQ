'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Upload, MessageSquare, FileText, Send, X, Bot, HelpCircle, CheckCircle2 } from 'lucide-react';

interface UploadFormProps {
  onJobCreated: () => void;
}

interface ProviderInfo {
  name: string;
  configured: boolean;
  selectedModel: string;
  availableModels: { id: string; label: string }[];
}

function Tooltip({ text }: { text: string }) {
  const [show, setShow] = useState(false);
  return (
    <span className="relative inline-flex">
      <button
        type="button"
        aria-label="Ajuda"
        onClick={() => setShow(!show)}
        onBlur={() => setShow(false)}
        className="ml-1 rounded-full p-0.5 transition-colors hover:bg-black/5"
        style={{ color: 'var(--md-on-surface-variant)' }}
      >
        <HelpCircle className="h-3.5 w-3.5" />
      </button>
      {show && (
        <span
          role="tooltip"
          className="absolute left-6 top-0 z-10 w-56 rounded-lg px-3 py-2 text-xs shadow-lg"
          style={{ backgroundColor: 'var(--md-surface-container-high)', color: 'var(--md-on-surface)', border: '1px solid var(--md-outline-variant)' }}
        >
          {text}
        </span>
      )}
    </span>
  );
}

const DISPLAY_NAMES: Record<string, string> = {
  gpt: 'OpenAI GPT',
  claude: 'Anthropic Claude',
  gemini: 'Google Gemini',
  mistral: 'Mistral AI',
  llama: 'Meta Llama',
};

const JURISDICTIONS = [
  { value: 'Brasil', label: 'Brasil' },
  { value: 'Estados Unidos', label: 'Estados Unidos' },
  { value: 'Portugal', label: 'Portugal' },
  { value: 'União Europeia', label: 'União Europeia' },
  { value: 'Reino Unido', label: 'Reino Unido' },
  { value: 'Argentina', label: 'Argentina' },
  { value: '__outro__', label: 'Outro' },
];

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function UploadForm({ onJobCreated }: UploadFormProps) {
  const [file, setFile] = useState<File | null>(null);
  const [contractType, setContractType] = useState('nda');
  const [side, setSide] = useState('contractor');
  const [jurisdictionSelect, setJurisdictionSelect] = useState('Brasil');
  const [jurisdictionCustom, setJurisdictionCustom] = useState('');
  const [debateMode, setDebateMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  // Derived jurisdiction value
  const jurisdiction = jurisdictionSelect === '__outro__' ? jurisdictionCustom : jurisdictionSelect;

  // Provider selection state
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [selectedProviders, setSelectedProviders] = useState<Set<string>>(new Set());
  const [loadingProviders, setLoadingProviders] = useState(false);

  // Fetch providers when debate mode is toggled on
  useEffect(() => {
    if (!debateMode) return;
    setLoadingProviders(true);
    fetch('/api/config/providers')
      .then((res) => res.json())
      .then((data) => {
        const all: ProviderInfo[] = data.data.providers;
        setProviders(all);
        // Select all configured providers by default
        const configured = all.filter((p) => p.configured).map((p) => p.name);
        setSelectedProviders(new Set(configured));
      })
      .catch(() => {})
      .finally(() => setLoadingProviders(false));
  }, [debateMode]);

  function toggleProvider(name: string) {
    setSelectedProviders((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  }

  const configuredProviders = providers.filter((p) => p.configured);
  const selectedCount = selectedProviders.size;

  const validateAndSetFile = useCallback((selected: File) => {
    if (!selected.name.endsWith('.docx')) {
      setError('Apenas arquivos .docx são aceitos');
      setFile(null);
      return;
    }
    if (selected.size > 10 * 1024 * 1024) {
      setError('Arquivo deve ter no máximo 10MB');
      setFile(null);
      return;
    }
    setFile(selected);
    setError(null);
  }, []);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (selected) {
      validateAndSetFile(selected);
    }
  }

  function clearFile() {
    setFile(null);
    if (fileRef.current) fileRef.current.value = '';
  }

  // Drag-and-drop handlers
  function handleDragEnter(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    // Only set dragOver false if leaving the drop zone itself
    if (dropZoneRef.current && !dropZoneRef.current.contains(e.relatedTarget as Node)) {
      setDragOver(false);
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) {
      validateAndSetFile(dropped);
    }
  }

  function handleDropZoneClick() {
    if (!loading) {
      fileRef.current?.click();
    }
  }

  function handleSubmitClick() {
    if (!file) return;
    if (debateMode && selectedCount < 2) {
      setError('Selecione pelo menos 2 IAs para o modo debate.');
      return;
    }
    setShowConfirm(true);
  }

  async function handleConfirm() {
    if (!file) return;
    setShowConfirm(false);
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('contractType', contractType);
      formData.append('side', side);
      formData.append('jurisdiction', jurisdiction);
      if (debateMode) {
        formData.append('debateMode', 'debate');
        formData.append('selectedProviders', JSON.stringify([...selectedProviders]));
      }

      const res = await fetch('/api/jobs', { method: 'POST', body: formData });
      const data = await res.json();

      if (res.ok) {
        setFile(null);
        if (fileRef.current) fileRef.current.value = '';
        setSuccess('Contrato enviado com sucesso! Acompanhe o progresso abaixo.');
        onJobCreated();
      } else {
        const code = data.error?.code ?? '';
        if (code === 'INSUFFICIENT_PROVIDERS') {
          setError('Serviços de IA insuficientes. Configure pelo menos 3 IAs na página de Configuração.');
        } else if (code === 'INVALID_FILE') {
          setError('Arquivo inválido. Envie um documento no formato .docx.');
        } else {
          setError(data.error?.message ?? 'Não foi possível enviar o contrato. Tente novamente.');
        }
      }
    } catch {
      setError('Não foi possível conectar ao servidor. Verifique sua internet e tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  const selectStyle = {
    borderColor: 'var(--md-outline-variant)',
    backgroundColor: 'var(--md-surface)',
    color: 'var(--md-on-surface)',
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-medium" style={{ color: 'var(--md-on-surface)' }}>
        Enviar Contrato para Análise
      </h2>

      <div className="grid gap-3 sm:grid-cols-2">
        {/* Drag-and-drop file zone */}
        <div className="sm:col-span-2">
          <label className="mb-1 flex items-center gap-1.5 text-xs font-medium" style={{ color: 'var(--md-on-surface-variant)' }}>
            <FileText className="h-3.5 w-3.5" />
            Arquivo (.docx)
          </label>
          {/* Hidden file input */}
          <input
            ref={fileRef}
            type="file"
            accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={handleFileChange}
            className="hidden"
            disabled={loading}
          />
          {/* Drop zone */}
          <div
            ref={dropZoneRef}
            role="button"
            tabIndex={0}
            aria-label="Arraste um arquivo .docx ou clique para selecionar"
            onClick={handleDropZoneClick}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleDropZoneClick(); } }}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-6 transition-colors"
            style={{
              borderColor: dragOver
                ? 'var(--md-primary)'
                : file
                  ? 'var(--md-outline)'
                  : 'var(--md-outline-variant)',
              backgroundColor: dragOver
                ? 'var(--md-primary-container)'
                : 'var(--md-surface)',
              opacity: loading ? 0.5 : 1,
              pointerEvents: loading ? 'none' : 'auto',
            }}
          >
            <Upload
              className="h-8 w-8 transition-colors"
              style={{
                color: dragOver
                  ? 'var(--md-primary)'
                  : 'var(--md-on-surface-variant)',
              }}
            />
            {dragOver ? (
              <p className="text-sm font-medium" style={{ color: 'var(--md-primary)' }}>
                Solte o arquivo aqui
              </p>
            ) : (
              <p className="text-sm" style={{ color: 'var(--md-on-surface-variant)' }}>
                Arraste e solte o arquivo aqui ou{' '}
                <span className="font-medium" style={{ color: 'var(--md-primary)' }}>
                  clique para selecionar
                </span>
              </p>
            )}
            <p className="text-xs" style={{ color: 'var(--md-on-surface-variant)' }}>
              Apenas .docx, até 10 MB
            </p>
          </div>

          {/* File preview */}
          {file && (
            <div
              className="mt-2 flex items-center gap-2 rounded-lg px-3 py-2"
              style={{
                backgroundColor: 'var(--md-surface-container-low)',
                border: '1px solid var(--md-outline-variant)',
              }}
            >
              <FileText className="h-4 w-4 shrink-0" style={{ color: 'var(--md-primary)' }} />
              <span className="flex-1 truncate text-sm" style={{ color: 'var(--md-on-surface)' }}>
                {file.name} — {formatFileSize(file.size)}
              </span>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); clearFile(); }}
                aria-label="Remover arquivo"
                className="shrink-0 rounded-full p-1 transition-colors hover:bg-black/5"
                style={{ color: 'var(--md-on-surface-variant)' }}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        {/* Contract Type */}
        <div>
          <label className="mb-1 flex items-center text-xs font-medium" style={{ color: 'var(--md-on-surface-variant)' }}>
            Tipo de Contrato
            <Tooltip text="Escolha o tipo mais próximo do seu contrato. Afeta quais cláusulas e riscos são priorizados na análise." />
          </label>
          <select
            value={contractType}
            onChange={(e) => setContractType(e.target.value)}
            className="w-full rounded-md border px-3 py-2 text-sm"
            style={selectStyle}
            disabled={loading}
          >
            <option value="nda">NDA</option>
            <option value="saas">SaaS (Software como Serviço)</option>
            <option value="partnership">Parceria</option>
          </select>
        </div>

        {/* Side */}
        <div>
          <label className="mb-1 flex items-center text-xs font-medium" style={{ color: 'var(--md-on-surface-variant)' }}>
            Lado
            <Tooltip text="Indica qual parte você representa. As recomendações serão ajustadas para proteger os interesses do lado selecionado." />
          </label>
          <select
            value={side}
            onChange={(e) => setSide(e.target.value)}
            className="w-full rounded-md border px-3 py-2 text-sm"
            style={selectStyle}
            disabled={loading}
          >
            <option value="contractor">Contratante</option>
            <option value="contracted">Contratado</option>
          </select>
        </div>

        {/* Jurisdiction */}
        <div className="sm:col-span-2">
          <label className="mb-1 flex items-center text-xs font-medium" style={{ color: 'var(--md-on-surface-variant)' }}>
            Jurisdição
            <Tooltip text="Legislação aplicável ao contrato. As sugestões incluirão referências legais deste país ou região." />
          </label>
          <select
            value={jurisdictionSelect}
            onChange={(e) => {
              setJurisdictionSelect(e.target.value);
              if (e.target.value !== '__outro__') {
                setJurisdictionCustom('');
              }
            }}
            className="w-full rounded-md border px-3 py-2 text-sm"
            style={selectStyle}
            disabled={loading}
          >
            {JURISDICTIONS.map((j) => (
              <option key={j.value} value={j.value}>
                {j.label}
              </option>
            ))}
          </select>
          {jurisdictionSelect === '__outro__' && (
            <input
              value={jurisdictionCustom}
              onChange={(e) => setJurisdictionCustom(e.target.value)}
              placeholder="Digite a jurisdição..."
              className="mt-2 w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2"
              style={selectStyle}
              disabled={loading}
            />
          )}
        </div>
      </div>

      {/* Debate Mode Toggle */}
      <div
        className="rounded-xl p-3"
        style={{ backgroundColor: 'var(--md-surface-container-low)', border: '1px solid var(--md-outline-variant)' }}
      >
        <div className="flex items-center gap-3">
          <label className="relative inline-flex cursor-pointer items-center">
            <input
              type="checkbox"
              checked={debateMode}
              onChange={(e) => setDebateMode(e.target.checked)}
              className="peer sr-only"
              disabled={loading}
              aria-label="Ativar modo debate"
            />
            <div
              className="h-6 w-11 rounded-full"
              style={{
                backgroundColor: debateMode ? 'var(--md-primary)' : 'var(--md-surface-variant)',
              }}
            >
              <div
                className="absolute top-[2px] left-[2px] h-5 w-5 rounded-full transition-transform"
                style={{
                  backgroundColor: debateMode ? 'var(--md-on-primary)' : 'var(--md-on-surface-variant)',
                  transform: debateMode ? 'translateX(20px)' : 'translateX(0)',
                }}
              />
            </div>
          </label>
          <div className="flex items-start gap-2">
            <MessageSquare className="mt-0.5 h-4 w-4 shrink-0" style={{ color: 'var(--md-on-surface-variant)' }} />
            <div>
              <span className="text-sm font-medium" style={{ color: 'var(--md-on-surface)' }}>
                Modo Debate (3 rodadas)
              </span>
              <p className="text-xs" style={{ color: 'var(--md-on-surface-variant)' }}>
                Cada IA analisa, questiona as outras e emite um veredito final — como uma banca de revisores. ~3x custo e tempo.
              </p>
            </div>
          </div>
        </div>

        {/* Provider selection — shown when debate mode is on */}
        {debateMode && (
          <div className="mt-3 space-y-2 border-t pt-3" style={{ borderColor: 'var(--md-outline-variant)' }}>
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium" style={{ color: 'var(--md-on-surface-variant)' }}>
                Selecione as IAs ({selectedCount} de {configuredProviders.length})
              </p>
              {selectedCount < 2 && (
                <span className="text-[11px] font-medium" style={{ color: 'var(--md-error)' }}>
                  Mínimo 2
                </span>
              )}
            </div>

            {loadingProviders ? (
              <p className="text-xs" style={{ color: 'var(--md-on-surface-variant)' }}>Carregando...</p>
            ) : (
              <div className="space-y-1">
                {providers.map((p) => {
                  const isSelected = selectedProviders.has(p.name);
                  const modelLabel = p.availableModels.find((m) => m.id === p.selectedModel)?.label ?? p.selectedModel;
                  return (
                    <button
                      key={p.name}
                      type="button"
                      disabled={!p.configured || loading}
                      onClick={() => toggleProvider(p.name)}
                      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors disabled:opacity-40"
                      style={{
                        backgroundColor: isSelected ? 'var(--md-primary-container)' : 'transparent',
                        color: isSelected ? 'var(--md-on-primary-container)' : 'var(--md-on-surface-variant)',
                      }}
                    >
                      <div
                        className="flex h-4 w-4 shrink-0 items-center justify-center rounded border"
                        style={{
                          borderColor: isSelected ? 'var(--md-primary)' : 'var(--md-outline)',
                          backgroundColor: isSelected ? 'var(--md-primary)' : 'transparent',
                        }}
                      >
                        {isSelected && (
                          <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none">
                            <path d="M2 6L5 9L10 3" stroke="var(--md-on-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </div>
                      <Bot className="h-3.5 w-3.5 shrink-0" />
                      <span className="font-medium">{DISPLAY_NAMES[p.name] ?? p.name}</span>
                      <span className="ml-auto text-xs" style={{ color: 'var(--md-on-surface-variant)' }}>
                        {p.configured ? modelLabel : 'Não configurado'}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      <div aria-live="polite">
        {success && (
          <p className="flex items-center gap-1.5 text-xs font-medium" style={{ color: 'var(--md-primary)' }}>
            <CheckCircle2 className="h-3.5 w-3.5" />
            {success}
          </p>
        )}
        {error && (
          <p className="text-xs font-medium" style={{ color: 'var(--md-error)' }}>
            {error}
          </p>
        )}
      </div>

      <button
        onClick={handleSubmitClick}
        disabled={!file || loading || (debateMode && selectedCount < 2)}
        className="flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-medium transition-all hover:shadow-md disabled:opacity-50"
        style={{ backgroundColor: 'var(--md-primary)', color: 'var(--md-on-primary)' }}
      >
        <Upload className="h-4 w-4" />
        {loading ? 'Enviando...' : 'Analisar Contrato'}
      </button>

      {/* Confirmation Dialog */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
          <div
            className="mx-4 max-w-md rounded-2xl p-6 shadow-lg"
            style={{ backgroundColor: 'var(--md-surface-container-high)' }}
          >
            <h3 id="confirm-title" className="mb-2 text-lg font-medium" style={{ color: 'var(--md-on-surface)' }}>
              Confirmar Envio
            </h3>
            <p className="mb-4 text-sm" style={{ color: 'var(--md-on-surface-variant)' }}>
              O contrato será enviado para APIs externas de inteligência artificial
              {debateMode
                ? ` (${[...selectedProviders].map((p) => DISPLAY_NAMES[p] ?? p).join(', ')})`
                : ' (OpenAI, Anthropic, Google, Mistral, Meta)'}
              {' '}para análise. Os dados são deletados automaticamente após 24 horas.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium"
                style={{ color: 'var(--md-primary)' }}
              >
                <X className="h-4 w-4" />
                Cancelar
              </button>
              <button
                onClick={handleConfirm}
                className="flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium"
                style={{ backgroundColor: 'var(--md-primary)', color: 'var(--md-on-primary)' }}
              >
                <Send className="h-4 w-4" />
                Confirmar e Enviar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
