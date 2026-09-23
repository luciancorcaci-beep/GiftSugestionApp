import { describe, expect, it } from 'vitest';

import { ValidationError } from '@/lib/errors';
import { validateGiftInput } from '@/application/validation/validateGiftInput';
import type { GiftSuggestionRequest } from '@/application/dto/GiftSuggestionRequest';
import { RELATIONSHIPS } from '@/domain/entities/GiftRecommendation';

const validInput = {
  recipientAge: '28',
  budget: '75',
  relationship: 'Friend',
  interests: '  coffee, hiking, books  ',
};

describe('validateGiftInput', () => {
  it('returns a normalized typed request for valid input', () => {
    const request: GiftSuggestionRequest = validateGiftInput(validInput);

    expect(request).toEqual({
      recipientAge: 28,
      budget: 75,
      relationship: 'Friend',
      interests: 'coffee, hiking, books',
    });
  });

  it.each([
    ['recipientAge', { ...validInput, recipientAge: undefined }, 'Age is required'],
    ['recipientAge', { ...validInput, recipientAge: '   ' }, 'Age is required'],
    ['budget', { ...validInput, budget: undefined }, 'Budget is required'],
    ['budget', { ...validInput, budget: '   ' }, 'Budget is required'],
    ['relationship', { ...validInput, relationship: undefined }, 'Relationship is required'],
    ['interests', { ...validInput, interests: undefined }, 'Interests are required'],
  ])('rejects a missing %s field with an explicit validation error', (_field, input, message) => {
    expect(() => validateGiftInput(input)).toThrowError(new ValidationError(message));
  });

  it.each([
    ['recipientAge', { ...validInput, recipientAge: '-1' }, 'Age must be a whole number of 0 or greater'],
    ['recipientAge', { ...validInput, recipientAge: '28.5' }, 'Age must be a whole number of 0 or greater'],
    ['budget', { ...validInput, budget: '0' }, 'Budget must be greater than zero'],
    ['budget', { ...validInput, budget: '-10' }, 'Budget must be greater than zero'],
  ])('rejects an invalid %s value safely', (_field, input, message) => {
    expect(() => validateGiftInput(input)).toThrowError(new ValidationError(message));
  });

  it('rejects an unsupported relationship before provider code can receive it', () => {
    expect(() => validateGiftInput({ ...validInput, relationship: 'Coworker' })).toThrowError(
      new ValidationError(`Relationship must be one of: ${RELATIONSHIPS.join(', ')}`),
    );
  });

  it('accepts every one of the 12 supported relationship values', () => {
    expect(RELATIONSHIPS).toHaveLength(12);
    for (const relationship of RELATIONSHIPS) {
      expect(() => validateGiftInput({ ...validInput, relationship })).not.toThrow();
    }
  });

  it.each([
    'Mortal Enemy', 'Frenemy', 'Coworker I Tolerate',
    'Secret Santa Victim', 'Boss I Need to Impress', 'Person Whose Name I Forgot',
  ])('accepts the newly added relationship value "%s"', (relationship) => {
    expect(() => validateGiftInput({ ...validInput, relationship })).not.toThrow();
  });

  it('rejects an unsupported relationship with a message listing all 12 values', () => {
    expect(() => validateGiftInput({ ...validInput, relationship: 'Coworker' })).toThrowError(
      new ValidationError(`Relationship must be one of: ${RELATIONSHIPS.join(', ')}`),
    );
  });

  it('rejects empty interests after trimming whitespace', () => {
    expect(() => validateGiftInput({ ...validInput, interests: '   ' })).toThrowError(
      new ValidationError('Interests are required'),
    );
  });

  it('rejects a payload containing fields outside the documented request contract', () => {
    expect(() => validateGiftInput({ ...validInput, isAdmin: true })).toThrowError(
      new ValidationError('Unsupported field(s): isAdmin'),
    );
  });

  it('lists every unsupported field when multiple unknown fields are present', () => {
    expect(() => validateGiftInput({ ...validInput, extra: 1, another: 2 })).toThrowError(
      new ValidationError('Unsupported field(s): extra, another'),
    );
  });

  it('rejects non-object and null input with the standard error contract', () => {
    for (const input of [null, [], 'invalid']) {
      try {
        validateGiftInput(input);
        throw new Error('Expected validation to fail');
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        expect(error).toMatchObject({
          name: 'ValidationError',
          statusCode: 400,
          code: 'VALIDATION_ERROR',
        });
      }
    }
  });
});