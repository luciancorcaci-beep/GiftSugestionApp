import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';

import { parseGiftSuggestionRequest } from '@/app/api/gift-suggestions/schema';
import { RecommendationService, type RecommendationProvider } from '@/domain/services/RecommendationService';
import { FixedWindowRateLimiter, type RateLimiter } from '@/lib/rateLimiter';
import { readBoundedJson } from '@/lib/requestBody';
import { TooManyRequestsError, toErrorResponse } from '@/lib/errors';
import { logger as defaultLogger, type Logger } from '@/lib/logger';

type GiftSuggestionsDependencies = {
  provider: RecommendationProvider;
  logger?: Logger;
  createRequestId?: () => string;
  rateLimiter?: RateLimiter;
  maxBodyBytes?: number;
  resolveClientKey?: (request: Request) => string;
};

const MAX_BODY_BYTES = 16_384;
const RATE_LIMIT_PER_WINDOW = 10;
const RATE_LIMIT_WINDOW_MS = 60_000;

const defaultRateLimiter = new FixedWindowRateLimiter(RATE_LIMIT_PER_WINDOW, RATE_LIMIT_WINDOW_MS);

// x-real-ip is set by a trusted reverse proxy/edge platform (Vercel included) and can't be
// overridden by the client, unlike a raw X-Forwarded-For, which a caller can set to an arbitrary,
// unique value per request to obtain a fresh rate-limit bucket every time. This is a best-effort
// MVP mitigation, not a distributed rate limiter: state is still per-process, so it does not fully
// hold under a multi-instance serverless deployment (see docs/reviews/all-stories-code-review-v2.md
// NEW-002 for the accepted scope of this limitation).
function defaultResolveClientKey(request: Request): string {
  const realIp = request.headers.get('x-real-ip')?.trim();
  if (realIp) return realIp;

  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
}

export function createGiftSuggestionsHandler({
  provider,
  logger = defaultLogger,
  createRequestId = randomUUID,
  rateLimiter = defaultRateLimiter,
  maxBodyBytes = MAX_BODY_BYTES,
  resolveClientKey = defaultResolveClientKey,
}: GiftSuggestionsDependencies) {
  // Built once per handler instance, not per request — the service is stateless,
  // so there's no reason to pay allocation cost on every invocation.
  const recommendationService = new RecommendationService(provider, logger);

  return async function handleGiftSuggestions(request: Request): Promise<Response> {
    const requestId = createRequestId();
    const clientKey = resolveClientKey(request);

    try {
      if (!rateLimiter.tryAcquire(clientKey)) {
        logger.warn({ requestId, clientKey }, 'Gift recommendations request rate-limited');
        throw new TooManyRequestsError(rateLimiter.retryAfterSeconds(clientKey));
      }

      const body = await readBoundedJson(request, maxBodyBytes);
      const input = parseGiftSuggestionRequest(body);
      logger.info({ requestId, relationship: input.relationship, budget: input.budget }, 'Gift recommendations requested');

      const recommendations = await recommendationService.generate(input);
      logger.info({ requestId, count: recommendations.length }, 'Gift recommendations generated');
      return NextResponse.json({ recommendations }, { status: 200 });
    } catch (error) {
      const response = toErrorResponse(error);
      logger.warn({ requestId, status: response.status, code: response.body.error.code }, 'Gift recommendations request failed');
      const headers = error instanceof TooManyRequestsError
        ? { 'Retry-After': String(error.retryAfterSeconds) }
        : undefined;
      return NextResponse.json(response.body, { status: response.status, headers });
    }
  };
}
