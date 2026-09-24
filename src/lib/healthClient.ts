const HEALTH_CHECK_TIMEOUT_MS = 5000;

export type HealthStatus =
  | { state: 'connected' }
  | { state: 'checking' }
  | { state: 'unavailable'; message: string };

export type HealthFetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

function isHealthyPayload(payload: unknown): payload is { status: 'ok' } {
  return Boolean(payload) && typeof payload === 'object' && (payload as { status?: unknown }).status === 'ok';
}

export async function checkHealth(
  fetchHealth: HealthFetcher = globalThis.fetch,
  timeoutMs = HEALTH_CHECK_TIMEOUT_MS,
): Promise<Exclude<HealthStatus, { state: 'checking' }>> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchHealth('/api/health', { signal: controller.signal });
    if (!response.ok) {
      return { state: 'unavailable', message: 'The service is unavailable right now.' };
    }

    const payload: unknown = await response.json();
    if (!isHealthyPayload(payload)) {
      return { state: 'unavailable', message: 'The service returned an unexpected response.' };
    }

    return { state: 'connected' };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return { state: 'unavailable', message: 'The service took too long to respond.' };
    }

    return { state: 'unavailable', message: 'The service is unavailable right now.' };
  } finally {
    clearTimeout(timeoutId);
  }
}
