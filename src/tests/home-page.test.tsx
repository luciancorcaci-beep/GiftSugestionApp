import { describe, expect, it, vi } from 'vitest';

import HomePage from '@/app/page';

function response(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    headers: { 'content-type': 'application/json' },
    status,
  });
}

describe('homepage health connection', () => {
  it('maps a valid health response to connected', async () => {
    const fetchHealth = vi.fn(async () => response({ status: 'ok' }));

    await expect(HomePage.checkHealth(fetchHealth, 100)).resolves.toEqual({ state: 'connected' });
    expect(fetchHealth).toHaveBeenCalledWith('/api/health', expect.objectContaining({ signal: expect.any(AbortSignal) }));
  });

  it('maps server failures to unavailable without exposing response details', async () => {
    await expect(HomePage.checkHealth(async () => response({ status: 'error' }, 500), 100)).resolves.toEqual({
      state: 'unavailable',
      message: 'The service is unavailable right now.',
    });
  });

  it('maps malformed success payloads to unavailable', async () => {
    await expect(HomePage.checkHealth(async () => response({ ready: true }), 100)).resolves.toEqual({
      state: 'unavailable',
      message: 'The service returned an unexpected response.',
    });
  });

  it('maps invalid JSON responses to unavailable', async () => {
    const invalidResponse = new Response('not-json', { status: 200 });

    await expect(HomePage.checkHealth(async () => invalidResponse, 100)).resolves.toEqual({
      state: 'unavailable',
      message: 'The service is unavailable right now.',
    });
  });

  it('maps network failures to unavailable', async () => {
    await expect(HomePage.checkHealth(async () => Promise.reject(new TypeError('network failed')), 100)).resolves.toEqual({
      state: 'unavailable',
      message: 'The service is unavailable right now.',
    });
  });

  it('maps an aborted request to a timeout state', async () => {
    vi.useFakeTimers();
    const fetchHealth = vi.fn((_input: RequestInfo | URL, init?: RequestInit) =>
      new Promise<Response>((_, reject) => {
        init?.signal?.addEventListener('abort', () => reject(Object.assign(new Error('Aborted'), { name: 'AbortError' })));
      }),
    );

    const healthCheck = HomePage.checkHealth(fetchHealth, 100);
    await vi.advanceTimersByTimeAsync(100);

    await expect(healthCheck).resolves.toEqual({
      state: 'unavailable',
      message: 'The service took too long to respond.',
    });
    vi.useRealTimers();
  });
});