import { describe, it, expect, vi, beforeEach } from 'vitest';
import { logger } from './logger';

describe('logger', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('logs info messages as JSON', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    logger.info('Job created', { jobId: 'abc-123' });

    expect(spy).toHaveBeenCalledOnce();
    const logged = JSON.parse(spy.mock.calls[0][0]);
    expect(logged.level).toBe('info');
    expect(logged.message).toBe('Job created');
    expect(logged.jobId).toBe('abc-123');
    expect(logged.timestamp).toBeDefined();
  });

  it('logs warn messages', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    logger.warn('Provider timeout', { provider: 'gpt', duration: 91000 });

    const logged = JSON.parse(spy.mock.calls[0][0]);
    expect(logged.level).toBe('warn');
    expect(logged.provider).toBe('gpt');
  });

  it('logs error messages', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    logger.error('Pipeline failed', { jobId: 'abc', errorCode: 'PARSE_ERROR' });

    const logged = JSON.parse(spy.mock.calls[0][0]);
    expect(logged.level).toBe('error');
    expect(logged.errorCode).toBe('PARSE_ERROR');
  });

  it('redacts content field', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    logger.info('Processing block', {
      jobId: 'abc',
      content: 'This is confidential contract text that should never appear in logs',
    });

    const logged = JSON.parse(spy.mock.calls[0][0]);
    expect(logged.content).toBe('[REDACTED]');
    expect(logged.jobId).toBe('abc');
  });

  it('redacts text field', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    logger.info('Block parsed', { text: 'Clause 1: The parties agree...' });

    const logged = JSON.parse(spy.mock.calls[0][0]);
    expect(logged.text).toBe('[REDACTED]');
  });

  it('redacts original and suggested fields', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    logger.info('Finding processed', {
      jobId: 'abc',
      original: 'The contractor shall be liable...',
      suggested: 'The contractor liability shall be limited...',
    });

    const logged = JSON.parse(spy.mock.calls[0][0]);
    expect(logged.original).toBe('[REDACTED]');
    expect(logged.suggested).toBe('[REDACTED]');
    expect(logged.jobId).toBe('abc');
  });

  it('redacts nested content fields', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    logger.info('Nested test', {
      jobId: 'abc',
      block: {
        content: 'Should be redacted',
        blockId: 'block-1',
      },
    });

    const logged = JSON.parse(spy.mock.calls[0][0]);
    expect(logged.block.content).toBe('[REDACTED]');
    expect(logged.block.blockId).toBe('block-1');
  });

  it('redacts array fields', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    logger.info('Findings', {
      jobId: 'abc',
      findings: [{ original: 'secret' }],
    });

    const logged = JSON.parse(spy.mock.calls[0][0]);
    expect(logged.findings).toBe('[REDACTED]');
  });

  it('handles meta with no sensitive fields', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    logger.info('Status update', {
      jobId: 'abc',
      status: 'processing',
      stage: 'personas',
      duration: 1500,
    });

    const logged = JSON.parse(spy.mock.calls[0][0]);
    expect(logged.jobId).toBe('abc');
    expect(logged.status).toBe('processing');
    expect(logged.stage).toBe('personas');
    expect(logged.duration).toBe(1500);
  });

  it('handles log without meta', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    logger.info('Simple message');

    const logged = JSON.parse(spy.mock.calls[0][0]);
    expect(logged.message).toBe('Simple message');
    expect(logged.level).toBe('info');
  });
});
