type LogLevel = 'info' | 'warn' | 'error';

const REDACTED_FIELDS = new Set([
  'content',
  'text',
  'original',
  'suggested',
  'blocks',
  'findings',
  'generalSuggestions',
  'actions',
]);

function redact(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return '[REDACTED_ARRAY]';
  }

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (REDACTED_FIELDS.has(key)) {
      result[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      result[key] = redact(value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

function formatLog(level: LogLevel, message: string, meta?: Record<string, unknown>): string {
  const entry: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    level,
    message,
  };

  if (meta) {
    Object.assign(entry, redact(meta));
  }

  return JSON.stringify(entry);
}

export const logger = {
  info(message: string, meta?: Record<string, unknown>): void {
    console.log(formatLog('info', message, meta));
  },

  warn(message: string, meta?: Record<string, unknown>): void {
    console.warn(formatLog('warn', message, meta));
  },

  error(message: string, meta?: Record<string, unknown>): void {
    console.error(formatLog('error', message, meta));
  },
};
