import React from 'react';

import { Button } from '@/components/shared/Button';
import { Card } from '@/components/shared/Card';
import type { GiftRecommendation } from '@/domain/entities/GiftRecommendation';
import { isTrustedProductUrl } from '@/lib/productUrl';

type GiftResultsProps = {
  recommendations?: GiftRecommendation[];
  isLoading?: boolean;
  error?: string;
  showEmpty?: boolean;
  onRetry?: () => void;
};

function isRecommendation(value: unknown): value is GiftRecommendation {
  if (!value || typeof value !== 'object') return false;
  const recommendation = value as Partial<GiftRecommendation>;
  return (
    typeof recommendation.id === 'string' &&
    typeof recommendation.title === 'string' &&
    typeof recommendation.description === 'string' &&
    typeof recommendation.rationale === 'string' &&
    typeof recommendation.priceRange === 'string' &&
    typeof recommendation.relationshipFit === 'string' &&
    recommendation.relationshipFit !== '' &&
    (recommendation.productUrl === undefined || typeof recommendation.productUrl === 'string')
  );
}

export function isGiftRecommendationResponse(value: unknown): value is { recommendations: GiftRecommendation[] } {
  return Boolean(value) && typeof value === 'object' && Array.isArray((value as { recommendations?: unknown }).recommendations)
    && [0, 3].includes((value as { recommendations: unknown[] }).recommendations.length)
    && (value as { recommendations: unknown[] }).recommendations.every(isRecommendation);
}

function LoadingState() {
  return (
    <section className="results-panel" aria-label="Loading gift recommendations" aria-busy="true">
      <p className="section-kicker">Searching thoughtfully</p>
      <div className="results-grid" aria-hidden="true">
        {[1, 2, 3].map((item) => <div className="card skeleton-card" key={item} />)}
      </div>
    </section>
  );
}

export function GiftResults({ recommendations = [], isLoading = false, error, showEmpty = true, onRetry }: GiftResultsProps) {
  if (isLoading) return <LoadingState />;
  if (error) {
    return (
      <section className="results-panel result-message" role="alert" aria-label="Gift recommendation error">
        <h2>We could not find suggestions</h2>
        <p>{error}</p>
        {onRetry && <Button type="button" onClick={onRetry}>Try again</Button>}
      </section>
    );
  }
  if (recommendations.length === 0) {
    return showEmpty ? <section className="results-panel result-message" role="status"><p>No gift suggestions are available yet.</p></section> : null;
  }
  if (recommendations.length !== 3) {
    return <section className="results-panel result-message" role="status"><p>No gift suggestions are available yet.</p></section>;
  }

  return (
    <section className="results-panel" aria-label="Gift recommendation results">
      <div className="results-heading">
        <p className="section-kicker">A few good directions</p>
        <h2>Three gifts worth considering</h2>
      </div>
      <div className="results-grid">
        {recommendations.map((recommendation) => (
          <Card data-testid="gift-card" key={recommendation.id}>
            <p className="card-price">{recommendation.priceRange}</p>
            <h3>{recommendation.title}</h3>
            <p>{recommendation.description}</p>
            <p className="card-rationale"><strong>Why it fits:</strong> {recommendation.rationale}</p>
            {isTrustedProductUrl(recommendation.productUrl) && <a href={recommendation.productUrl} target="_blank" rel="noreferrer">Explore product</a>}
          </Card>
        ))}
      </div>
    </section>
  );
}