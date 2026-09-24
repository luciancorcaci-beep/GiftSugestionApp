type ClockFn = () => number;

type RateWindow = {
  count: number;
  windowStart: number;
};

/**
 * Abstraction over "can this key make a request right now". Lets callers
 * (e.g. the gift-suggestions handler) depend on the contract rather than a
 * concrete implementation, so swapping in a distributed limiter later is a
 * drop-in change with no call-site edits.
 */
export interface RateLimiter {
  tryAcquire(key: string): boolean;
  retryAfterSeconds(key: string): number;
}

export class FixedWindowRateLimiter implements RateLimiter {
  private readonly windows = new Map<string, RateWindow>();

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
    private readonly now: ClockFn = Date.now,
  ) {}

  tryAcquire(key: string): boolean {
    const current = this.now();
    const existing = this.windows.get(key);

    if (!existing || current - existing.windowStart >= this.windowMs) {
      this.windows.set(key, { count: 1, windowStart: current });
      return true;
    }

    if (existing.count >= this.limit) {
      return false;
    }

    existing.count += 1;
    return true;
  }

  retryAfterSeconds(key: string): number {
    const existing = this.windows.get(key);
    if (!existing) return 0;

    const elapsed = this.now() - existing.windowStart;
    return Math.max(0, Math.ceil((this.windowMs - elapsed) / 1000));
  }
}
