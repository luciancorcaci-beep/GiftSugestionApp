import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

import { middleware } from '@/middleware';

afterEach(() => {
  vi.unstubAllEnvs();
});

function extractNonce(cspValue: string): string | undefined {
  const scriptSrc = cspValue.split(';').map((directive) => directive.trim()).find((directive) => directive.startsWith('script-src'));
  const token = scriptSrc?.split(' ').find((source) => source.startsWith("'nonce-") && source.endsWith("'"));
  return token?.slice(7, -1);
}

describe('security headers middleware', () => {
  it('sets defense-in-depth security headers on every response', () => {
    const response = middleware(new NextRequest('http://localhost/'));

    expect(response.headers.get('X-Frame-Options')).toBe('DENY');
    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(response.headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
    expect(response.headers.get('Strict-Transport-Security')).toContain('max-age=');
  });

  it('scopes the content security policy to same-origin only, since provider calls stay server-side', () => {
    const response = middleware(new NextRequest('http://localhost/api/gift-suggestions'));
    const csp = response.headers.get('Content-Security-Policy');

    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("connect-src 'self'");
  });

  it('issues a per-request script nonce instead of a bare script-src, so Next.js can nonce its own hydration scripts', () => {
    const response = middleware(new NextRequest('http://localhost/'));
    const csp = response.headers.get('Content-Security-Policy') ?? '';

    expect(extractNonce(csp)).toBeTruthy();
  });

  it('forwards the exact same nonce on the downstream request that Next.js reads to nonce its own inline scripts', () => {
    // Next.js's App Router reads the nonce via req.headers['content-security-policy'] on the
    // *incoming* request (see next/dist/server/app-render/app-render.js), which NextResponse.next({request})
    // forwards through the x-middleware-request-* / x-middleware-override-headers protocol headers.
    const response = middleware(new NextRequest('http://localhost/'));
    const responseCsp = response.headers.get('Content-Security-Policy') ?? '';
    const forwardedCsp = response.headers.get('x-middleware-request-content-security-policy') ?? '';

    expect(response.headers.get('x-middleware-override-headers')).toContain('content-security-policy');
    expect(extractNonce(forwardedCsp)).toBe(extractNonce(responseCsp));
    expect(extractNonce(forwardedCsp)).toBeTruthy();
  });

  it('generates a fresh nonce for every request', () => {
    const first = extractNonce(middleware(new NextRequest('http://localhost/')).headers.get('Content-Security-Policy') ?? '');
    const second = extractNonce(middleware(new NextRequest('http://localhost/')).headers.get('Content-Security-Policy') ?? '');

    expect(first).toBeTruthy();
    expect(second).toBeTruthy();
    expect(first).not.toBe(second);
  });

  it('allows unsafe-eval only in development, since Next.js Fast Refresh/HMR relies on eval()', () => {
    vi.stubEnv('NODE_ENV', 'development');

    const csp = middleware(new NextRequest('http://localhost/')).headers.get('Content-Security-Policy') ?? '';

    expect(csp).toMatch(/script-src[^;]*'unsafe-eval'/);
  });

  it('never allows unsafe-eval in production', () => {
    vi.stubEnv('NODE_ENV', 'production');

    const csp = middleware(new NextRequest('http://localhost/')).headers.get('Content-Security-Policy') ?? '';

    expect(csp).not.toContain("'unsafe-eval'");
  });
});
