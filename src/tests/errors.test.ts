import { describe, expect, it } from 'vitest';

import { AppError, toErrorResponse } from '@/lib/errors';

describe('API errors', () => {
  it('preserves safe typed error status and message', () => {
    const error = new AppError('Service unavailable', 503, 'SERVICE_UNAVAILABLE');

    expect(toErrorResponse(error)).toEqual({
      body: { error: { code: 'SERVICE_UNAVAILABLE', message: 'Service unavailable' } },
      status: 503,
    });
  });

  it('maps unknown errors to a safe internal error response', () => {
    expect(toErrorResponse(new Error('contains internal details'))).toEqual({
      body: { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      status: 500,
    });
  });
});