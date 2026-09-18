import '@testing-library/jest-dom/vitest';

import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { GiftForm } from '@/components/forms/GiftForm';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

function threeRecommendations() {
  return [1, 2, 3].map((number) => ({
    id: `gift-${number}`,
    title: `Gift ${number}`,
    description: `Description ${number}`,
    rationale: `Rationale ${number}`,
    priceRange: '$10-$20',
    relationshipFit: 'A thoughtful fit for a friend',
  }));
}

async function fillValidForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Recipient age'), '28');
  await user.type(screen.getByLabelText('Budget'), '75');
  await user.selectOptions(screen.getByLabelText('Relationship'), 'Friend');
  await user.type(screen.getByLabelText('Interests'), 'coffee, hiking');
}

describe('GiftForm interactions', () => {
  it('submits valid input through the full page/form boundary and renders exactly three results', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ recommendations: threeRecommendations() }));
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();

    render(<GiftForm />);
    await fillValidForm(user);
    await user.click(screen.getByRole('button', { name: /get gift ideas/i }));

    await waitFor(() => expect(screen.getAllByTestId('gift-card')).toHaveLength(3));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('ignores a duplicate submit while a request is already in flight', async () => {
    let resolveFetch: (value: Response) => void = () => undefined;
    const fetchMock = vi.fn().mockReturnValue(new Promise<Response>((resolve) => {
      resolveFetch = resolve;
    }));
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();

    render(<GiftForm />);
    await fillValidForm(user);

    const submitButton = screen.getByRole('button', { name: /get gift ideas/i });
    await user.click(submitButton);
    await user.click(submitButton);

    expect(fetchMock).toHaveBeenCalledTimes(1);

    resolveFetch(jsonResponse({ recommendations: threeRecommendations() }));
    await waitFor(() => expect(screen.getAllByTestId('gift-card')).toHaveLength(3));
  });

  it('shows a safe error on provider failure, preserves entered values, and succeeds on retry', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ error: { code: 'PROVIDER_UNAVAILABLE', message: 'raw provider detail' } }, 503))
      .mockResolvedValueOnce(jsonResponse({ recommendations: threeRecommendations() }));
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();

    render(<GiftForm />);
    await fillValidForm(user);
    await user.click(screen.getByRole('button', { name: /get gift ideas/i }));

    await waitFor(() => expect(screen.getAllByRole('alert').length).toBeGreaterThan(0));
    const alertText = screen.getAllByRole('alert').map((element) => element.textContent).join(' ');
    expect(alertText).toContain('Unable to generate gift suggestions right now.');
    expect(alertText).not.toContain('raw provider detail');
    expect(screen.getByLabelText('Recipient age')).toHaveValue(28);
    expect(screen.getByLabelText('Interests')).toHaveValue('coffee, hiking');

    await user.click(screen.getByRole('button', { name: /try again/i }));

    await waitFor(() => expect(screen.getAllByTestId('gift-card')).toHaveLength(3));
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
