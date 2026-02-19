'use client';

import { useState } from 'react';
import { ThumbsUp, ThumbsDown } from 'lucide-react';

interface FeedbackButtonProps {
  jobId: string;
  initialRating?: 'good' | 'bad' | null;
}

const REASON_OPTIONS = [
  { value: 'irrelevant_findings', label: 'Achados irrelevantes' },
  { value: 'missed_clauses', label: 'Deixou passar cláusulas importantes' },
  { value: 'bad_suggestions', label: 'Sugestões de texto ruins' },
  { value: 'wrong_severity', label: 'Severidade errada' },
  { value: 'other', label: 'Outro' },
] as const;

export function FeedbackButton({ jobId, initialRating }: FeedbackButtonProps) {
  const [rating, setRating] = useState<'good' | 'bad' | null>(initialRating ?? null);
  const [showReasonForm, setShowReasonForm] = useState(false);
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(value: 'good' | 'bad', reason?: string, userComment?: string) {
    setLoading(true);
    setMessage(null);

    try {
      const body: Record<string, string> = { rating: value };
      if (reason) body.reason = reason;
      if (userComment?.trim()) body.comment = userComment.trim();

      const res = await fetch(`/api/jobs/${jobId}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setRating(value);
        setShowReasonForm(false);
        setMessage('Feedback enviado! Obrigado.');
      }
    } catch {
      setMessage('Não foi possível enviar o feedback. Verifique sua conexão e tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  function handleGood() {
    submit('good');
  }

  function handleBad() {
    setShowReasonForm(true);
  }

  function handleReasonSubmit() {
    if (!selectedReason) return;
    submit('bad', selectedReason, comment);
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium" style={{ color: 'var(--md-on-surface)' }}>
        Como foi a análise?
      </p>

      {!showReasonForm ? (
        <div className="flex gap-2">
          <button
            onClick={handleGood}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-all hover:shadow-md disabled:opacity-50"
            style={{
              backgroundColor: rating === 'good' ? 'var(--md-primary)' : 'var(--md-surface-variant)',
              color: rating === 'good' ? 'var(--md-on-primary)' : 'var(--md-on-surface-variant)',
            }}
          >
            <ThumbsUp className="h-4 w-4" />
            Bom
          </button>
          <button
            onClick={handleBad}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition-all hover:shadow-md disabled:opacity-50"
            style={{
              borderColor: rating === 'bad' ? 'var(--md-error)' : 'var(--md-outline-variant)',
              backgroundColor: rating === 'bad' ? 'var(--md-error-container)' : 'transparent',
              color: rating === 'bad' ? 'var(--md-on-error-container)' : 'var(--md-on-surface-variant)',
            }}
          >
            <ThumbsDown className="h-4 w-4" />
            Ruim
          </button>
        </div>
      ) : (
        <div
          className="space-y-3 rounded-xl p-4"
          style={{ backgroundColor: 'var(--md-surface-container-low)', border: '1px solid var(--md-outline-variant)' }}
        >
          <p className="text-sm font-medium" style={{ color: 'var(--md-on-surface)' }}>
            O que pode melhorar?
          </p>

          <div className="flex flex-wrap gap-2">
            {REASON_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setSelectedReason(opt.value)}
                className="rounded-full px-3 py-1.5 text-xs font-medium transition-colors"
                style={{
                  backgroundColor: selectedReason === opt.value ? 'var(--md-error)' : 'var(--md-surface-variant)',
                  color: selectedReason === opt.value ? 'var(--md-on-error)' : 'var(--md-on-surface-variant)',
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {selectedReason === 'other' && (
            <div>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Conte-nos mais..."
                maxLength={500}
                rows={2}
                className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2"
                style={{
                  borderColor: 'var(--md-outline-variant)',
                  backgroundColor: 'var(--md-surface)',
                  color: 'var(--md-on-surface)',
                }}
              />
              <p
                className="mt-1 text-right text-xs"
                style={{ color: comment.length > 450 ? 'var(--md-error)' : 'var(--md-on-surface-variant)' }}
              >
                {comment.length}/500
              </p>
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleReasonSubmit}
              disabled={loading || !selectedReason}
              aria-label="Enviar feedback negativo"
              className="rounded-full px-4 py-2 text-sm font-medium transition-opacity disabled:opacity-50"
              style={{ backgroundColor: 'var(--md-error)', color: 'var(--md-on-error)' }}
            >
              {loading ? 'Enviando...' : 'Enviar Feedback'}
            </button>
            <button
              onClick={() => setShowReasonForm(false)}
              className="rounded-full px-4 py-2 text-sm font-medium"
              style={{ color: 'var(--md-on-surface-variant)' }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {message && (
        <p aria-live="polite" className="text-xs" style={{ color: message.includes('Obrigado') ? 'var(--md-primary)' : 'var(--md-error)' }}>{message}</p>
      )}
    </div>
  );
}
