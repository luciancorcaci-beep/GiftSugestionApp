'use client';

import React, { useState, type FormEvent } from 'react';

import { Button } from '@/components/shared/Button';
import { Input } from '@/components/shared/Input';
import { Select } from '@/components/shared/Select';
import { GiftResults, isGiftRecommendationResponse } from '@/components/results/GiftResults';
import { RELATIONSHIPS, type GiftRecommendation, type GiftRecommendationResponse } from '@/domain/entities/GiftRecommendation';
import { validateGiftInput } from '@/application/validation/validateGiftInput';
import { ValidationError } from '@/lib/errors';

export type GiftFormValues = {
  age: string;
  budget: string;
  relationship: string;
  interests: string;
};

const initialValues: GiftFormValues = {
  age: '',
  budget: '',
  relationship: '',
  interests: '',
};

type SuggestionsFetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

function toRequest(values: GiftFormValues) {
  return validateGiftInput({
    recipientAge: values.age,
    budget: values.budget,
    relationship: values.relationship,
    interests: values.interests,
  });
}

export function getGiftFormError(values: GiftFormValues): string | undefined {
  try {
    toRequest(values);
    return undefined;
  } catch (error) {
    return error instanceof ValidationError ? error.message : 'Please check the highlighted fields.';
  }
}

export async function submitGiftSuggestions(
  values: GiftFormValues,
  fetchSuggestions: SuggestionsFetcher = globalThis.fetch,
): Promise<GiftRecommendationResponse> {
  const request = toRequest(values);
  const response = await fetchSuggestions('/api/gift-suggestions', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error('Unable to generate gift suggestions right now.');
  }

  const payload: unknown = await response.json();
  if (!isGiftRecommendationResponse(payload)) {
    throw new Error('No gift suggestions are available yet.');
  }

  return payload;
}

export function GiftForm() {
  const [values, setValues] = useState<GiftFormValues>(initialValues);
  const [recommendations, setRecommendations] = useState<GiftRecommendation[]>([]);
  const [error, setError] = useState<string>();
  const [isLoading, setIsLoading] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  function updateValue(field: keyof GiftFormValues, value: string) {
    setValues((currentValues) => ({ ...currentValues, [field]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isLoading) return;

    setHasSubmitted(true);
    const validationError = getGiftFormError(values);
    if (validationError) {
      setError(validationError);
      setRecommendations([]);
      return;
    }

    setError(undefined);
    setRecommendations([]);
    setIsLoading(true);
    try {
      const result = await submitGiftSuggestions(values);
      setRecommendations(result.recommendations);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to generate gift suggestions right now.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form className="gift-form" onSubmit={handleSubmit} noValidate>
      <div className="form-grid">
        <Input
          id="age"
          label="Recipient age"
          name="age"
          type="number"
          min="0"
          inputMode="numeric"
          placeholder="e.g. 28"
          value={values.age}
          aria-invalid={Boolean(hasSubmitted && !values.age)}
          onChange={(event) => updateValue('age', event.target.value)}
        />
        <Input
          id="budget"
          label="Budget"
          name="budget"
          type="number"
          min="0"
          step="1"
          inputMode="decimal"
          placeholder="e.g. 75"
          value={values.budget}
          aria-invalid={Boolean(hasSubmitted && !values.budget)}
          onChange={(event) => updateValue('budget', event.target.value)}
        />
        <Select
          id="relationship"
          label="Relationship"
          name="relationship"
          placeholder="Choose a relationship"
          options={RELATIONSHIPS.map((relationship) => ({ label: relationship, value: relationship }))}
          value={values.relationship}
          aria-invalid={Boolean(hasSubmitted && !values.relationship)}
          onChange={(event) => updateValue('relationship', event.target.value)}
        />
        <Input
          id="interests"
          label="Interests"
          name="interests"
          type="text"
          placeholder="e.g. coffee, hiking, books"
          value={values.interests}
          aria-invalid={Boolean(hasSubmitted && !values.interests)}
          onChange={(event) => updateValue('interests', event.target.value)}
        />
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
      <p className="form-status" role="status" aria-live="polite">
        {isLoading ? 'Finding three thoughtful gift ideas...' : hasSubmitted && !error && recommendations.length === 3 ? 'Three gift ideas ready.' : ''}
      </p>
      <Button className="submit-button" type="submit" disabled={isLoading} aria-busy={isLoading}>
        {isLoading ? 'Finding gift ideas...' : 'Get gift ideas'}
      </Button>
      <GiftResults
        recommendations={recommendations}
        isLoading={isLoading}
        error={error}
        showEmpty={hasSubmitted}
        onRetry={() => void handleSubmit({ preventDefault: () => undefined } as FormEvent<HTMLFormElement>)}
      />
    </form>
  );
}