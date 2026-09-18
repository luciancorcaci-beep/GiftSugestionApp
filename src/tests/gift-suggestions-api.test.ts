import { describe, expect, it, vi } from 'vitest';

import { POST } from '@/app/api/gift-suggestions/route';
import { createGiftSuggestionsHandler } from '@/app/api/gift-suggestions/handler';
import { RecommendationService } from '@/domain/services/RecommendationService';
import type { GiftRecommendation } from '@/domain/entities/GiftRecommendation';
import type { GiftSuggestionRequest } from '@/application/dto/GiftSuggestionRequest';
import { RecommendationProviderError } from '@/lib/errors';
import { createLogger, type Logger } from '@/lib/logger';
import { FixedWindowRateLimiter } from '@/lib/rateLimiter';

const validInput: GiftSuggestionRequest = {
  recipientAge: 28,
  budget: 75,
  relationship: 'Friend',
  interests: 'coffee, hiking, books',
};

function recommendations(): GiftRecommendation[] {
  return [1, 2, 3].map((number) => ({
    id: `gift-${number}`,
    title: `Gift ${number}`,
    description: `Description ${number}`,
    rationale: `Rationale ${number}`,
    priceRange: '$40-$80',
    relationshipFit: 'A thoughtful fit for a friend',
    productUrl: `https://www.amazon.com/dp/gift-${number}`,
  }));
}

function request(body: unknown, extraHeaders: Record<string, string> = {}): Request {
  return new Request('http://localhost/api/gift-suggestions', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...extraHeaders },
    body: JSON.stringify(body),
  });
}

function providerReturning(value: unknown) {
  return { generate: vi.fn().mockResolvedValue(value) };
}

// Existing behavioral tests exercise the handler under a generous, dedicated rate-limiter
// instance so they never contend with the module-level default limiter or each other.
function createTestHandler(overrides: Parameters<typeof createGiftSuggestionsHandler>[0] = {}) {
  return createGiftSuggestionsHandler({
    rateLimiter: new FixedWindowRateLimiter(1_000, 60_000),
    ...overrides,
  });
}

describe('RecommendationService', () => {
  it('returns exactly three validated recommendations for a valid request', async () => {
    const provider = providerReturning(recommendations());
    const service = new RecommendationService(provider);

    await expect(service.generate(validInput)).resolves.toHaveLength(3);
    expect(provider.generate).toHaveBeenCalledWith({ ...validInput });
  });

  it('rejects invalid input before invoking the provider', async () => {
    const provider = providerReturning(recommendations());
    const service = new RecommendationService(provider);

    await expect(service.generate({ ...validInput, relationship: 'Coworker' })).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
      statusCode: 400,
    });
    expect(provider.generate).not.toHaveBeenCalled();
  });

  it('maps provider failures without exposing raw details', async () => {
    const provider = providerReturning(Promise.reject(new RecommendationProviderError('api_key=super-secret')));
    const service = new RecommendationService(provider);

    await expect(service.generate(validInput)).rejects.toMatchObject({
      code: 'RECOMMENDATION_SERVICE_ERROR',
      statusCode: 503,
      message: 'Unable to generate gift suggestions right now.',
    });
  });

  it('rejects malformed or non-three provider output', async () => {
    const provider = providerReturning(recommendations().slice(0, 2));
    const service = new RecommendationService(provider);

    await expect(service.generate(validInput)).rejects.toMatchObject({
      code: 'RECOMMENDATION_SERVICE_ERROR',
      statusCode: 500,
      message: 'Unable to generate gift suggestions right now.',
    });
  });

  it('does not leak provider details through structured logs', async () => {
    const entries: Record<string, unknown>[] = [];
    const logger: Logger = createLogger((entry) => entries.push(entry));
    const provider = providerReturning(Promise.reject(new RecommendationProviderError('apiKey=secret-value')));
    const service = new RecommendationService(provider, logger);

    await expect(service.generate(validInput)).rejects.toBeDefined();
    expect(JSON.stringify(entries)).not.toContain('secret-value');
    expect(JSON.stringify(entries)).not.toContain('apiKey');
  });

  it('keeps repeated requests independent and free of persistent writes', async () => {
    const provider = providerReturning(recommendations());
    const service = new RecommendationService(provider);

    const first = await service.generate(validInput);
    const second = await service.generate(validInput);

    expect(first).toEqual(second);
    expect(provider.generate).toHaveBeenCalledTimes(2);
  });

  it('omits a provider-supplied product link outside the trusted domain allowlist without rejecting the recommendation', async () => {
    const untrusted = recommendations().map((recommendation) => ({ ...recommendation, productUrl: 'https://not-amazon.example/product' }));
    const provider = providerReturning(untrusted);
    const service = new RecommendationService(provider);

    const result = await service.generate(validInput);

    expect(result).toHaveLength(3);
    expect(result.every((recommendation) => recommendation.productUrl === undefined)).toBe(true);
  });

  it('drops an insecure HTTP product link even on an otherwise trusted domain', async () => {
    const insecure = recommendations().map((recommendation) => ({ ...recommendation, productUrl: 'http://www.amazon.com/dp/1' }));
    const provider = providerReturning(insecure);
    const service = new RecommendationService(provider);

    const result = await service.generate(validInput);

    expect(result.every((recommendation) => recommendation.productUrl === undefined)).toBe(true);
  });
});

describe('POST /api/gift-suggestions', () => {
  it('returns exactly three recommendations for a valid request', async () => {
    const provider = providerReturning(recommendations());
    const handler = createTestHandler({ provider });
    const response = await handler(request(validInput));

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ recommendations: recommendations() });
  });

  it('returns a structured 400 response and skips provider invocation for invalid input', async () => {
    const provider = providerReturning(recommendations());
    const handler = createTestHandler({ provider });
    const response = await handler(request({ ...validInput, budget: 0 }));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: { code: 'VALIDATION_ERROR', message: 'Budget must be greater than zero' },
    });
    expect(provider.generate).not.toHaveBeenCalled();
  });

  it('uses the production handler export for dependency-injected tests', async () => {
    expect(POST).toBeTypeOf('function');
  });

  it('rejects a request exceeding the configured byte cap with a safe 413 before invoking the provider', async () => {
    const provider = providerReturning(recommendations());
    const handler = createTestHandler({ provider, maxBodyBytes: 10 });
    const response = await handler(request(validInput));

    expect(response.status).toBe(413);
    expect(provider.generate).not.toHaveBeenCalled();
  });

  it('rate-limits a client that exhausts its request budget and advertises a retry delay', async () => {
    const rateLimiter = new FixedWindowRateLimiter(1, 60_000);
    rateLimiter.tryAcquire('unknown');
    const provider = providerReturning(recommendations());
    const handler = createTestHandler({ provider, rateLimiter });
    const response = await handler(request(validInput));
    const body = await response.json();

    expect(response.status).toBe(429);
    expect(body).toEqual({ error: { code: 'RATE_LIMITED', message: 'Too many requests. Please try again shortly.' } });
    expect(response.headers.get('Retry-After')).toBe('60');
    expect(provider.generate).not.toHaveBeenCalled();
  });

  it('derives the rate-limit key from x-real-ip when present, so a spoofed X-Forwarded-For cannot obtain a fresh bucket', async () => {
    const rateLimiter = new FixedWindowRateLimiter(1, 60_000);
    const provider = providerReturning(recommendations());
    const handler = createTestHandler({ provider, rateLimiter });

    const first = await handler(request(validInput, { 'x-real-ip': '203.0.113.10', 'x-forwarded-for': '198.51.100.1' }));
    const second = await handler(request(validInput, { 'x-real-ip': '203.0.113.10', 'x-forwarded-for': '198.51.100.2' }));

    expect(first.status).toBe(200);
    expect(second.status).toBe(429);
    expect(provider.generate).toHaveBeenCalledTimes(1);
  });

  it('falls back to the first X-Forwarded-For hop when x-real-ip is absent', async () => {
    const rateLimiter = new FixedWindowRateLimiter(1, 60_000);
    const provider = providerReturning(recommendations());
    const handler = createTestHandler({ provider, rateLimiter });

    const first = await handler(request(validInput, { 'x-forwarded-for': '198.51.100.1, 10.0.0.1' }));
    const second = await handler(request(validInput, { 'x-forwarded-for': '198.51.100.1, 10.0.0.2' }));

    expect(first.status).toBe(200);
    expect(second.status).toBe(429);
  });
});

describe('POST /api/gift-suggestions (catalog-backed)', () => {
  const catalogEligibleInput: GiftSuggestionRequest = {
    recipientAge: 30,
    budget: 50,
    relationship: 'Friend',
    interests: 'music',
  };

  it('returns exactly three recommendations with no CLAUDE_API_KEY configured', async () => {
    expect(process.env.CLAUDE_API_KEY).toBeUndefined();

    // No `provider` override: exercises the real default (CatalogRecommendationProvider)
    // wired up by createGiftSuggestionsHandler, proving the app no longer depends on Claude.
    const handler = createTestHandler();
    const response = await handler(request(catalogEligibleInput));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.recommendations).toHaveLength(3);
  });
});