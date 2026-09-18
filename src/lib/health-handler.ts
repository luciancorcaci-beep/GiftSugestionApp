import type { Logger } from '@/lib/logger';
import { toErrorResponse } from '@/lib/errors';

type HealthHandlerDependencies = {
  logger: Logger;
  createRequestId: () => string;
  createResponse: (body: { status: string } | { error: { code: string; message: string } }, status?: number) => Response;
};

export function createHealthHandler(dependencies: HealthHandlerDependencies) {
  return async function healthHandler(request: Request): Promise<Response> {
    let requestId: string | undefined;
    let path: string | undefined;

    try {
      requestId = request.headers.get('x-request-id') ?? dependencies.createRequestId();
      path = new URL(request.url).pathname;

      dependencies.logger.info(
        {
          method: request.method,
          path,
          requestId,
        },
        'Health check requested',
      );

      return dependencies.createResponse({ status: 'ok' });
    } catch (error) {
      dependencies.logger.error(
        {
          method: request.method,
          path,
          requestId,
          errorName: error instanceof Error ? error.name : 'UnknownError',
        },
        'Health check failed',
      );

      const errorResponse = toErrorResponse(error);
      return dependencies.createResponse(errorResponse.body, errorResponse.status);
    }
  };
}