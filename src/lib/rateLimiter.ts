type ClockFn = () => number;

type RateWindow = {
  count: number;
  windowStart: number;
};

export class FixedWindowRateLimiter {
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

export class ConcurrencyLimiter {
  private inFlight = 0;

  constructor(private readonly maxConcurrent: number) {}

  tryAcquire(): boolean {
    if (this.inFlight >= this.maxConcurrent) {
      return false;
    }

    this.inFlight += 1;
    return true;
  }

  release(): void {
    this.inFlight = Math.max(0, this.inFlight - 1);
  }
}
