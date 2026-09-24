/** Shared user-facing fallback message — single source of truth so client and
 * server code (and any error path with no more specific message) never drift. */
export const UNABLE_TO_GENERATE_MESSAGE = 'Unable to generate gift suggestions right now.';

export class AppError extends Error {
  constructor(
    message: string,
    public readonly statusCode = 500,
    public readonly code = 'APP_ERROR',
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}

export class RecommendationServiceError extends AppError {
  constructor(message = UNABLE_TO_GENERATE_MESSAGE, statusCode = 500) {
    super(message, statusCode, 'RECOMMENDATION_SERVICE_ERROR');
    this.name = 'RecommendationServiceError';
  }
}

export class RecommendationProviderError extends AppError {
  constructor(message: string, statusCode = 503, code = 'PROVIDER_UNAVAILABLE') {
    super(message, statusCode, code);
    this.name = 'RecommendationProviderError';
  }
}

export class TooManyRequestsError extends AppError {
  constructor(public readonly retryAfterSeconds: number) {
    super('Too many requests. Please try again shortly.', 429, 'RATE_LIMITED');
    this.name = 'TooManyRequestsError';
  }
}

export class PayloadTooLargeError extends AppError {
  constructor(message = 'Request payload is too large.') {
    super(message, 413, 'PAYLOAD_TOO_LARGE');
    this.name = 'PayloadTooLargeError';
  }
}

type ErrorResponse = {
  body: { error: { code: string; message: string } };
  status: number;
};

export function toErrorResponse(error: unknown): ErrorResponse {
  if (error instanceof AppError) {
    return {
      body: { error: { code: error.code, message: error.message } },
      status: error.statusCode,
    };
  }

  return {
    body: { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
    status: 500,
  };
}