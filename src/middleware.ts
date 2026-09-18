import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

function buildContentSecurityPolicy(nonce: string): string {
  // Next.js's dev-mode Fast Refresh/HMR runtime evaluates code via eval(), which a strict
  // script-src blocks. Production builds never call eval, so this stays dev-only.
  const isDevelopment = process.env.NODE_ENV === 'development';
  const scriptSrc = `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDevelopment ? " 'unsafe-eval'" : ''}`;

  return [
    "default-src 'self'",
    scriptSrc,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');
}

export function middleware(request: NextRequest): NextResponse {
  // Next.js's App Router only nonces its own inline hydration scripts when it can read the
  // nonce from the incoming request's Content-Security-Policy header (see
  // next/dist/server/app-render/app-render.js: getScriptNonceFromHeader) — so the CSP with the
  // nonce must be set on the forwarded *request* headers, not just the outgoing response.
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const contentSecurityPolicy = buildContentSecurityPolicy(nonce);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', contentSecurityPolicy);

  const response = NextResponse.next({ request: { headers: requestHeaders } });

  response.headers.set('Content-Security-Policy', contentSecurityPolicy);
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
