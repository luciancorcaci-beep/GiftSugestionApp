import { describe, expect, it } from 'vitest';

import { FixedWindowRateLimiter } from '@/lib/rateLimiter';

describe('FixedWindowRateLimiter', () => {
  it('allows requests up to the limit within the current window', () => {
    const limiter = new FixedWindowRateLimiter(2, 60_000, () => 0);

    expect(limiter.tryAcquire('client-a')).toBe(true);
    expect(limiter.tryAcquire('client-a')).toBe(true);
  });

  it('rejects requests beyond the limit within the same window', () => {
    const limiter = new FixedWindowRateLimiter(2, 60_000, () => 0);

    limiter.tryAcquire('client-a');
    limiter.tryAcquire('client-a');

    expect(limiter.tryAcquire('client-a')).toBe(false);
  });

  it('tracks each key independently', () => {
    const limiter = new FixedWindowRateLimiter(1, 60_000, () => 0);

    expect(limiter.tryAcquire('client-a')).toBe(true);
    expect(limiter.tryAcquire('client-b')).toBe(true);
    expect(limiter.tryAcquire('client-a')).toBe(false);
  });

  it('resets the count once the window elapses', () => {
    let now = 0;
    const limiter = new FixedWindowRateLimiter(1, 1_000, () => now);

    expect(limiter.tryAcquire('client-a')).toBe(true);
    expect(limiter.tryAcquire('client-a')).toBe(false);

    now = 1_001;
    expect(limiter.tryAcquire('client-a')).toBe(true);
  });

  it('reports a positive retry-after while the window is still active', () => {
    let now = 0;
    const limiter = new FixedWindowRateLimiter(1, 10_000, () => now);

    limiter.tryAcquire('client-a');
    now = 4_000;

    expect(limiter.retryAfterSeconds('client-a')).toBe(6);
  });

  it('reports zero retry-after for a key that has never been seen', () => {
    const limiter = new FixedWindowRateLimiter(1, 10_000, () => 0);

    expect(limiter.retryAfterSeconds('unknown')).toBe(0);
  });
});
