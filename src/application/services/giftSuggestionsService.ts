import { isGiftRecommendationResponse } from '@/components/results/GiftResults';
import type { GiftRecommendationResponse } from '@/domain/entities/GiftRecommendation';
import { validateGiftInput } from '@/application/validation/validateGiftInput';
import { UNABLE_TO_GENERATE_MESSAGE, ValidationError } from '@/lib/errors';

export type GiftFormValues = {
  age: string;
  budget: string;
  relationship: string;
  interests: string;
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

/** Client-side pre-validation so the UI can show an inline error without a round trip. */
export function getGiftFormError(values: GiftFormValues): string | undefined {
  try {
    toRequest(values);
    return undefined;
  } catch (error) {
    return error instanceof ValidationError ? error.message : 'Please check the highlighted fields.';
  }
}

/** The single interface the UI talks to — hides the fetch call, request shape, and error mapping. */
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
    throw new Error(UNABLE_TO_GENERATE_MESSAGE);
  }

  const payload: unknown = await response.json();
  if (!isGiftRecommendationResponse(payload)) {
    throw new Error('No gift suggestions are available yet.');
  }

  return payload;
}
