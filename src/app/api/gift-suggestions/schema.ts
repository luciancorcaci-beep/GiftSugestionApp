import { validateGiftInput } from '@/application/validation/validateGiftInput';
import type { GiftSuggestionRequest } from '@/application/dto/GiftSuggestionRequest';

export function parseGiftSuggestionRequest(input: unknown): GiftSuggestionRequest {
  return validateGiftInput(input);
}