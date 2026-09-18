import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { GiftResults, isGiftRecommendationResponse } from '@/components/results/GiftResults';

const recommendations = [
  { id: '1', title: 'Coffee set', description: 'A thoughtful set.', rationale: 'Matches coffee interests.', priceRange: '$40-$60', relationshipFit: 'Friend' },
  { id: '2', title: 'Trail journal', description: 'A practical journal.', rationale: 'Fits hiking weekends.', priceRange: '$20-$30', relationshipFit: 'Friend', productUrl: 'https://www.amazon.com/dp/trail' },
  { id: '3', title: 'Book card', description: 'A flexible choice.', rationale: 'Supports reading.', priceRange: '$25-$50', relationshipFit: 'Friend' },
];

describe('GiftResults', () => {
  it('renders exactly three accessible recommendation cards and optional links', () => {
    const markup = renderToStaticMarkup(<GiftResults recommendations={recommendations} />);

    expect(markup.match(/data-testid="gift-card"/g)).toHaveLength(3);
    expect(markup).toContain('href="https://www.amazon.com/dp/trail"');
    expect(markup).toContain('aria-label="Gift recommendation results"');
  });

  it('omits a product link outside the trusted domain allowlist instead of rendering it', () => {
    const untrusted = [
      { ...recommendations[0], productUrl: 'https://not-amazon.example/product' },
      recommendations[1],
      recommendations[2],
    ];
    const markup = renderToStaticMarkup(<GiftResults recommendations={untrusted} />);

    expect(markup).not.toContain('not-amazon.example');
  });

  it('renders safe empty and error states without malformed cards', () => {
    expect(renderToStaticMarkup(<GiftResults recommendations={[]} />)).toContain('No gift suggestions are available yet.');
    expect(renderToStaticMarkup(<GiftResults error="Try again" onRetry={() => undefined} />)).toContain('Try again');
  });

  it('renders three stable loading skeletons with a live accessible label', () => {
    const markup = renderToStaticMarkup(<GiftResults isLoading />);

    expect(markup).toContain('aria-busy="true"');
    expect(markup.match(/class="card skeleton-card"/g)).toHaveLength(3);
  });
});

describe('recommendation response validation', () => {
  it('accepts only a response containing exactly three well-formed suggestions', () => {
    expect(isGiftRecommendationResponse({ recommendations })).toBe(true);
    expect(isGiftRecommendationResponse({ recommendations: recommendations.slice(0, 2) })).toBe(false);
    expect(isGiftRecommendationResponse({ recommendations: [{ title: 'incomplete' }] })).toBe(false);
  });

  it('rejects a recommendation missing the required relationshipFit field', () => {
    const missingFit = [
      { id: '1', title: 'Coffee set', description: 'A thoughtful set.', rationale: 'Matches coffee interests.', priceRange: '$40-$60' },
      recommendations[1],
      recommendations[2],
    ];

    expect(isGiftRecommendationResponse({ recommendations: missingFit })).toBe(false);
  });

  it('rejects a recommendation with an empty relationshipFit value', () => {
    const emptyFit = [
      { ...recommendations[0], relationshipFit: '' },
      recommendations[1],
      recommendations[2],
    ];

    expect(isGiftRecommendationResponse({ recommendations: emptyFit })).toBe(false);
  });
});