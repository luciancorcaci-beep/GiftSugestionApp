'use client';

import React, { useEffect, useState } from 'react';

import { GiftForm } from '@/components/forms/GiftForm';

const HEALTH_CHECK_TIMEOUT_MS = 5000;

export type HealthStatus =
  | { state: 'connected' }
  | { state: 'checking' }
  | { state: 'unavailable'; message: string };

type HealthFetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

function isHealthyPayload(payload: unknown): payload is { status: 'ok' } {
  return Boolean(payload) && typeof payload === 'object' && (payload as { status?: unknown }).status === 'ok';
}

async function checkHealth(
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

function HomePage() {
  const [healthStatus, setHealthStatus] = useState<HealthStatus>({ state: 'checking' });

  useEffect(() => {
    let isMounted = true;

    checkHealth().then((status) => {
      if (isMounted) {
        setHealthStatus(status);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <main className="page-shell">
      <section className="hero" aria-labelledby="page-title">
        <p className="eyebrow">Thoughtful gifting, made simple</p>
        <h1 id="page-title">What gift should I choose?</h1>
        <p className="intro">Find a thoughtful gift for someone you care about.</p>
        <p className="connection-status" role="status" aria-live="polite">
          {healthStatus.state === 'checking' && 'Checking service connection...'}
          {healthStatus.state === 'connected' && 'Backend connected'}
          {healthStatus.state === 'unavailable' && `Backend unavailable: ${healthStatus.message}`}
        </p>
      </section>
      <section className="form-panel" aria-labelledby="form-title">
        <div className="panel-heading">
          <p className="section-kicker">Start with the details</p>
          <h2 id="form-title">Tell us about them</h2>
          <p>Share a little context so your gift search can begin with the right direction.</p>
        </div>
        <GiftForm />
      </section>
    </main>
  );
}

const homePage = Object.assign(HomePage, { checkHealth });

export default homePage;