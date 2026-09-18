import { describe, expect, it } from 'vitest';

import { readBoundedJson } from '@/lib/requestBody';
import { PayloadTooLargeError } from '@/lib/errors';

function jsonRequest(body: unknown, extraHeaders: Record<string, string> = {}): Request {
  return new Request('http://localhost/api/gift-suggestions', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...extraHeaders },
    body: JSON.stringify(body),
  });
}

describe('readBoundedJson', () => {
  it('parses a request body within the byte limit', async () => {
    const result = await readBoundedJson(jsonRequest({ a: 1 }), 1_024);

    expect(result).toEqual({ a: 1 });
  });

  it('rejects a request whose declared Content-Length exceeds the limit', async () => {
    const request = jsonRequest({ a: 1 }, { 'content-length': '999999' });

    await expect(readBoundedJson(request, 10)).rejects.toBeInstanceOf(PayloadTooLargeError);
  });

  it('rejects a request whose actual body exceeds the limit even without a trustworthy header', async () => {
    const oversized = { interests: 'x'.repeat(10_000) };
    const request = jsonRequest(oversized);

    await expect(readBoundedJson(request, 64)).rejects.toBeInstanceOf(PayloadTooLargeError);
  });

  it('returns an empty object for a request with no body', async () => {
    const request = new Request('http://localhost/api/gift-suggestions', { method: 'POST' });

    await expect(readBoundedJson(request, 1_024)).resolves.toEqual({});
  });
});
