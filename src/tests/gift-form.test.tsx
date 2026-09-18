import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { GiftForm, getGiftFormError, submitGiftSuggestions } from '@/components/forms/GiftForm';
import HomePage from '@/app/page';

describe('GiftForm', () => {
  it('renders the required accessible fields', () => {
    const markup = renderToStaticMarkup(<GiftForm />);

    expect(markup).toContain('for="age"');
    expect(markup).toContain('for="budget"');
    expect(markup).toContain('for="relationship"');
    expect(markup).toContain('for="interests"');
    expect(markup).toContain('name="age"');
    expect(markup).toContain('name="budget"');
    expect(markup).toContain('name="relationship"');
    expect(markup).toContain('name="interests"');
  });

  it('includes every supported relationship option', () => {
    const markup = renderToStaticMarkup(<GiftForm />);

    for (const relationship of ['Friend', 'Partner', 'Parent', 'Child', 'Sibling', 'Colleague']) {
      expect(markup).toContain(`>${relationship}</option>`);
    }
  });

  it('renders a submit action with accessible live status support', () => {
    const markup = renderToStaticMarkup(<GiftForm />);

    expect(markup).toContain('type="submit"');
    expect(markup).toContain('Get gift ideas');
    expect(markup).toContain('aria-live="polite"');
  });

  it('rejects partial input before making an API request', () => {
    expect(getGiftFormError({ age: '', budget: '75', relationship: 'Friend', interests: 'books' })).toBe(
      'Age is required',
    );
  });

  it('posts the complete request without exposing provider details', async () => {
    const fetchSuggestions = async (_input: RequestInfo | URL, init?: RequestInit) => {
      expect(init?.body).toBe(
        JSON.stringify({ recipientAge: 28, budget: 75, relationship: 'Friend', interests: 'coffee, hiking' }),
      );
      return new Response(JSON.stringify({ recommendations: [
        { id: '1', title: 'Coffee set', description: 'A thoughtful set.', rationale: 'Matches coffee interests.', priceRange: '$40-$60', relationshipFit: 'Friend' },
        { id: '2', title: 'Trail journal', description: 'A practical journal.', rationale: 'Fits hiking weekends.', priceRange: '$20-$30', relationshipFit: 'Friend' },
        { id: '3', title: 'Book card', description: 'A flexible choice.', rationale: 'Supports reading.', priceRange: '$25-$50', relationshipFit: 'Friend' },
      ] }), { status: 200 });
    };

    await expect(
      submitGiftSuggestions({ age: '28', budget: '75', relationship: 'Friend', interests: 'coffee, hiking' }, fetchSuggestions),
    ).resolves.toMatchObject({ recommendations: expect.any(Array) });
  });

  it('maps API failures to a safe retry message', async () => {
    const fetchSuggestions = async () => new Response(JSON.stringify({ error: { message: 'provider secret' } }), { status: 500 });

    await expect(
      submitGiftSuggestions({ age: '28', budget: '75', relationship: 'Friend', interests: 'books' }, fetchSuggestions),
    ).rejects.toThrow('Unable to generate gift suggestions right now.');
  });
});

describe('home page', () => {
  it('renders the application shell and form entry point', () => {
    const markup = renderToStaticMarkup(<HomePage />);

    expect(markup).toContain('What gift should I choose?');
    expect(markup).toContain('Find a thoughtful gift');
    expect(markup).toContain('for="age"');
  });
});