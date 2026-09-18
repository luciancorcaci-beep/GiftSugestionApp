import { describe, expect, it } from 'vitest';

import { GET } from '@/app/api/health/route';
import { createHealthHandler } from '@/lib/health-handler';
import { createLogger, type LogEntry } from '@/lib/logger';

function createRequest(headers: Record<string, string> = {}): Request {
  return {
    headers: { get: (name: string) => headers[name.toLowerCase()] ?? null },
    method: 'GET',
    url: 'http://localhost/api/health',
  } as Request;
}

describe('GET /api/health', () => {
  it('returns a 200 JSON success payload', async () => {
    const response = await GET(createRequest());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: 'ok' });
    expect(response.headers.get('content-type')).toContain('application/json');
  });

  it('logs structured request metadata with a correlation id', async () => {
    const entries: LogEntry[] = [];
    const logger = createLogger((entry) => entries.push(entry));
    const getHealth = createHealthHandler({
      logger,
      createRequestId: () => 'generated-request-id',
      createResponse: (body) => new Response(JSON.stringify(body), { status: 200 }),
    });

    await getHealth(createRequest({ 'x-request-id': 'request-123' }));

    expect(entries).toContainEqual(
      expect.objectContaining({
        level: 'info',
        message: 'Health check requested',
        requestId: 'request-123',
      }),
    );
  });

  it('returns a safe 500 response and logs context when a dependency fails', async () => {
    const entries: LogEntry[] = [];
    const logger = createLogger((entry) => entries.push(entry));
    const getHealth = createHealthHandler({
      logger,
      createRequestId: () => {
        throw new Error('dependency failed with secret token');
      },
      createResponse: (body, status = 200) => new Response(JSON.stringify(body), { status }),
    });

    const response = await getHealth(createRequest());

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
    });
    expect(entries).toContainEqual(
      expect.objectContaining({
        level: 'error',
        message: 'Health check failed',
        method: 'GET',
        requestId: undefined,
      }),
    );
    expect(JSON.stringify(entries)).not.toContain('secret token');
  });
});