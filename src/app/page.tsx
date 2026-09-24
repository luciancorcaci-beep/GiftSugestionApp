'use client';

import React from 'react';

import { GiftForm } from '@/components/forms/GiftForm';
import { checkHealth } from '@/lib/healthClient';
import { useHealthCheck } from '@/hooks/useHealthCheck';

function HomePage() {
  const healthStatus = useHealthCheck();

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