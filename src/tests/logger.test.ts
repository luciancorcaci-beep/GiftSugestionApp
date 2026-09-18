import { describe, expect, it } from 'vitest';

import { createLogger, type LogEntry } from '@/lib/logger';

describe('structured logger', () => {
  it('emits structured entries without sensitive values', () => {
    const entries: LogEntry[] = [];
    const logger = createLogger((entry) => entries.push(entry));

    logger.error(
      { requestId: 'request-123', apiKey: 'should-not-be-logged', nested: { token: 'secret' } },
      'Request failed',
    );

    expect(entries[0]).toMatchObject({ level: 'error', message: 'Request failed', requestId: 'request-123' });
    expect(JSON.stringify(entries[0])).not.toContain('should-not-be-logged');
    expect(JSON.stringify(entries[0])).not.toContain('secret');
  });
});