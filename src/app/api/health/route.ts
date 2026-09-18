import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';

import { createHealthHandler } from '@/lib/health-handler';
import { logger as defaultLogger } from '@/lib/logger';

export const GET = createHealthHandler({
  logger: defaultLogger,
  createRequestId: randomUUID,
  createResponse: (body, status = 200) => NextResponse.json(body, { status }),
});